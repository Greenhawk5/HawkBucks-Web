// Phase 8 — Web Push: validation, D1 storage, VAPID + RFC8291 delivery, fanout.
// Trust model: no user accounts. Browser explicitly opts in; every field is
// untrusted input validated server-side. Row id = SHA-256(endpoint) so one
// subscription cannot manipulate another. VAPID private material never leaves
// the Worker. Payloads are generic, non-sensitive, localized per subscription.

export const PUSH_MAX_ENDPOINT_LENGTH = 2048;
export const PUSH_MAX_KEY_CHARS = 512;

export function pushTimestamp(date = new Date()) {
  return date.toISOString();
}

export function isSupportedPushLanguage(value) {
  return (
    value === 'en' || value === 'es' || value === 'fr' || value === 'ru' ||
    value === 'de' || value === 'pt' || value === 'zh' ||
    value === 'ar-SA' || value === 'fa-IR'
  );
}

// Generic, non-sensitive copy. Frontend i18n dictionaries
// (`notifications.pushTitle/pushBody`) are the authoring source of truth;
// this table is the server delivery copy (no mission names/counts/user data).
export const PUSH_STRINGS = {
  en: { title: 'HawkBucks', body: 'Daily V-Bucks missions are ready to check.' },
  es: { title: 'HawkBucks', body: 'Las misiones diarias de V-Bucks están listas para revisar.' },
  fr: { title: 'HawkBucks', body: 'Les missions V-Bucks du jour sont prêtes à consulter.' },
  ru: { title: 'HawkBucks', body: 'Ежедневные миссии V-Bucks готовы к просмотру.' },
  de: { title: 'HawkBucks', body: 'Die täglichen V-Bucks-Missionen sind bereit.' },
  pt: { title: 'HawkBucks', body: 'As missões diárias de V-Bucks estão prontas para conferir.' },
  zh: { title: 'HawkBucks', body: '每日 V-Bucks 任务已准备好查看。' },
  'ar-SA': { title: 'HawkBucks', body: 'مهام V-Bucks اليومية جاهزة للاطلاع.' },
  'fa-IR': { title: 'HawkBucks', body: 'مأموریت‌های روزانه V-Bucks آماده بررسی است.' }
};

export function pushStringsFor(language) {
  return PUSH_STRINGS[isSupportedPushLanguage(language) ? language : 'en'];
}

export function base64UrlToBytes(value) {
  const normalized = String(value).replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4);
  if (typeof Buffer !== 'undefined' && typeof Buffer.from === 'function') {
    return Uint8Array.from(Buffer.from(padded, 'base64'));
  }
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

export function bytesToBase64Url(bytes) {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  const base64 = typeof btoa === 'function'
    ? btoa(binary)
    : Buffer.from(binary, 'binary').toString('base64');
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

export async function sha256Hex(text) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

// Validate untrusted browser subscription JSON. Returns sanitized record or
// null. Never throws for malformed input.
export function validatePushSubscription(input) {
  if (!input || typeof input !== 'object') return null;
  const endpoint = typeof input.endpoint === 'string' ? input.endpoint.trim() : '';
  const keys = input.keys && typeof input.keys === 'object' ? input.keys : null;
  const p256dh = typeof keys?.p256dh === 'string' ? keys.p256dh.trim() : '';
  const auth = typeof keys?.auth === 'string' ? keys.auth.trim() : '';
  if (!endpoint || !p256dh || !auth) return null;
  if (endpoint.length > PUSH_MAX_ENDPOINT_LENGTH) return null;
  if (p256dh.length > PUSH_MAX_KEY_CHARS || auth.length > PUSH_MAX_KEY_CHARS) return null;
  let endpointUrl = null;
  try {
    endpointUrl = new URL(endpoint);
  } catch {
    return null;
  }
  if (endpointUrl.protocol !== 'https:') return null;
  let p256dhBytes = null;
  let authBytes = null;
  try {
    p256dhBytes = base64UrlToBytes(p256dh);
    authBytes = base64UrlToBytes(auth);
  } catch {
    return null;
  }
  if (p256dhBytes.length !== 65 || p256dhBytes[0] !== 0x04) return null;
  if (authBytes.length !== 16) return null;
  const language = isSupportedPushLanguage(input.language) ? input.language : 'en';
  return { endpoint, p256dh, auth, language };
}
export async function upsertPushSubscription(env, record, timestamp = pushTimestamp()) {
  if (!env.DB) throw new Error('D1 is unavailable');
  const id = await sha256Hex(record.endpoint);
  await env.DB.prepare(
    'INSERT INTO push_subscriptions (id, endpoint, p256dh, auth, language, is_active, fail_count, created_at, updated_at) VALUES (?, ?, ?, ?, ?, 1, 0, ?, ?) ON CONFLICT(endpoint) DO UPDATE SET p256dh=excluded.p256dh, auth=excluded.auth, language=excluded.language, is_active=1, fail_count=0, updated_at=excluded.updated_at'
  ).bind(id, record.endpoint, record.p256dh, record.auth, record.language, timestamp, timestamp).run();
  return { id, endpoint: record.endpoint };
}

export async function deactivatePushSubscription(env, endpoint, timestamp = pushTimestamp()) {
  if (!env.DB) throw new Error('D1 is unavailable');
  const clean = typeof endpoint === 'string' ? endpoint.trim() : '';
  if (!clean) return { deactivated: false };
  const result = await env.DB.prepare(
    'UPDATE push_subscriptions SET is_active=0, updated_at=? WHERE endpoint=? AND is_active=1'
  ).bind(timestamp, clean).run();
  return { deactivated: (result?.meta?.changes ?? 0) > 0 };
}

export async function listActivePushSubscriptions(env, limit = 1000) {
  if (!env.DB) return [];
  const rows = await env.DB.prepare(
    'SELECT id, endpoint, p256dh, auth, language, last_notified_utc FROM push_subscriptions WHERE is_active=1 LIMIT ?'
  ).bind(limit).all();
  return rows?.results ?? [];
}

// Claim the once-per-UTC-day slot BEFORE sending: conditional UPDATE is the
// idempotency mechanism (overlapping crons, restarts, retries converge).
export async function claimPushSlot(env, id, dateString, timestamp = pushTimestamp()) {
  if (!env.DB) return false;
  const result = await env.DB.prepare(
    'UPDATE push_subscriptions SET last_notified_utc=?, updated_at=? WHERE id=? AND is_active=1 AND (last_notified_utc IS NULL OR last_notified_utc != ?)'
  ).bind(dateString, timestamp, id, dateString).run();
  return (result?.meta?.changes ?? 0) > 0;
}

export async function recordPushDelivered(env, id, timestamp = pushTimestamp()) {
  if (!env.DB) return;
  await env.DB.prepare(
    'UPDATE push_subscriptions SET last_delivered_at=?, last_failure_at=NULL, fail_count=0, updated_at=? WHERE id=?'
  ).bind(timestamp, timestamp, id).run();
}

export async function recordPushTransientFailure(env, id, timestamp = pushTimestamp()) {
  if (!env.DB) return;
  await env.DB.prepare(
    'UPDATE push_subscriptions SET last_failure_at=?, fail_count=fail_count+1, updated_at=? WHERE id=?'
  ).bind(timestamp, timestamp, id).run();
}

export async function deactivatePushSubscriptionById(env, id, timestamp = pushTimestamp()) {
  if (!env.DB) return;
  await env.DB.prepare(
    'UPDATE push_subscriptions SET is_active=0, updated_at=? WHERE id=?'
  ).bind(timestamp, id).run();
}
export function vapidAudience(endpoint) {
  return new URL(endpoint).origin;
}

export async function importVapidSigningKey(env) {
  const jwk = env.VAPID_PRIVATE_JWK;
  if (!jwk) throw new Error('VAPID is not configured');
  return crypto.subtle.importKey(
    'jwk', typeof jwk === 'string' ? JSON.parse(jwk) : jwk,
    { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']
  );
}

function readDerLength(bytes, offset) {
  const first = bytes[offset];
  if (first === undefined) throw new Error('Invalid VAPID signature');
  if (first < 0x80) return { length: first, next: offset + 1 };
  const count = first & 0x7f;
  if (count === 0 || count > 4) throw new Error('Invalid VAPID signature');
  let length = 0;
  for (let i = 1; i <= count; i += 1) {
    const b = bytes[offset + i];
    if (b === undefined) throw new Error('Invalid VAPID signature');
    length = length * 256 + b;
  }
  return { length, next: offset + count + 1 };
}

function padDerIntegerTo32(bytes) {
  let start = 0;
  while (start < bytes.length && bytes[start] === 0) start += 1;
  const stripped = bytes.slice(start);
  if (stripped.length === 0 || stripped.length > 32) throw new Error('Invalid VAPID signature');
  const out = new Uint8Array(32);
  out.set(stripped, 32 - stripped.length);
  return out;
}

// Strict ASN.1 DER (SEQ of two INTEGERs) -> 64-byte JOSE r||s.
// Only for inputs that are actually DER; see normalizeEs256Signature.
export function derToRawSignature(derInput) {
  const der = Uint8Array.from(derInput);
  if (der.length < 8 || der[0] !== 0x30) throw new Error('Invalid VAPID signature');
  const seq = readDerLength(der, 1);
  if (seq.next + seq.length !== der.length) throw new Error('Invalid VAPID signature');
  let offset = seq.next;
  if (der[offset] !== 0x02) throw new Error('Invalid VAPID signature');
  const rInfo = readDerLength(der, offset + 1);
  const r = der.slice(rInfo.next, rInfo.next + rInfo.length);
  if (r.length !== rInfo.length) throw new Error('Invalid VAPID signature');
  offset = rInfo.next + rInfo.length;
  if (der[offset] !== 0x02) throw new Error('Invalid VAPID signature');
  const sInfo = readDerLength(der, offset + 1);
  const sv = der.slice(sInfo.next, sInfo.next + sInfo.length);
  if (sv.length !== sInfo.length) throw new Error('Invalid VAPID signature');
  if (sInfo.next + sInfo.length !== der.length) throw new Error('Invalid VAPID signature');
  const raw = new Uint8Array(64);
  raw.set(padDerIntegerTo32(r), 0);
  raw.set(padDerIntegerTo32(sv), 32);
  return raw;
}

// Normalize WebCrypto ECDSA output to JOSE ES256 fixed r||s (64 bytes).
// The current runtime returns 64-byte raw already (live path); DER is
// accepted only as a fallback for runtimes that emit ASN.1 DER.
export function normalizeEs256Signature(sigInput) {
  const bytes = Uint8Array.from(sigInput);
  if (bytes.length === 64) return Uint8Array.from(bytes);
  if (bytes.length >= 8 && bytes[0] === 0x30) return derToRawSignature(bytes);
  throw new Error('Invalid VAPID signature');
}
// (legacy naive parser removed; strict derToRawSignature above is the
// only DER path, used solely via normalizeEs256Signature's DER fallback.)

export async function buildVapidAuthorization(env, endpoint) {
  const audience = vapidAudience(endpoint);
  const publicKey = env.VAPID_PUBLIC_KEY;
  if (!publicKey) throw new Error('VAPID is not configured');
  const enc = new TextEncoder();
  const header = bytesToBase64Url(enc.encode(JSON.stringify({ typ: 'JWT', alg: 'ES256' })));
  const exp = Math.floor(Date.now() / 1000) + 12 * 60 * 60;
  const claims = bytesToBase64Url(enc.encode(JSON.stringify({
    aud: audience, exp, sub: env.VAPID_SUBJECT || 'mailto:admin@hawkbucks.com'
  })));
  const signingInput = header + '.' + claims;
  const key = await importVapidSigningKey(env);
  const sig = new Uint8Array(await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' }, key, enc.encode(signingInput)
  ));
  const raw = normalizeEs256Signature(sig);
  return {
    authorization: 'vapid t=' + signingInput + '.' + bytesToBase64Url(raw) + ', k=' + publicKey,
    cryptoKey: 'p256ecdsa=' + publicKey
  };
}

export async function hkdfSha256(ikm, salt, info, length) {
  const key = await crypto.subtle.importKey('raw', ikm, 'HKDF', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    { name: 'HKDF', hash: 'SHA-256', salt, info }, key, length * 8
  );
  return new Uint8Array(bits);
}
export async function encryptPushPayload(subscription, payloadBytes) {
  const uaPublic = base64UrlToBytes(subscription.p256dh);
  const authSecret = base64UrlToBytes(subscription.auth);
  const enc = new TextEncoder();
  const serverKeys = await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']);
  const serverPublicRaw = new Uint8Array(await crypto.subtle.exportKey('raw', serverKeys.publicKey));
  const uaKey = await crypto.subtle.importKey('raw', uaPublic, { name: 'ECDH', namedCurve: 'P-256' }, false, []);
  const sharedSecret = new Uint8Array(await crypto.subtle.deriveBits(
    { name: 'ECDH', public: uaKey }, serverKeys.privateKey, 256
  ));
  const prefix = enc.encode('WebPush: info\0');
  const keyInfo = new Uint8Array(prefix.length + uaPublic.length + serverPublicRaw.length);
  keyInfo.set(prefix, 0);
  keyInfo.set(uaPublic, prefix.length);
  keyInfo.set(serverPublicRaw, prefix.length + uaPublic.length);
  const ikm = await hkdfSha256(authSecret, sharedSecret, keyInfo, 32);
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const cek = await hkdfSha256(ikm, salt, enc.encode('Content-Encoding: aes128gcm\0'), 16);
  const nonce = await hkdfSha256(ikm, salt, enc.encode('Content-Encoding: nonce\0'), 12);
  const aesKey = await crypto.subtle.importKey('raw', cek, 'AES-GCM', false, ['encrypt']);
  const padded = new Uint8Array(payloadBytes.length + 1);
  padded.set(payloadBytes, 0);
  padded[payloadBytes.length] = 0x02;
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce }, aesKey, padded));
  const body = new Uint8Array(86 + ct.length);
  body.set(salt, 0);
  new DataView(body.buffer).setUint32(16, 4096, false);
  body[20] = serverPublicRaw.length;
  body.set(serverPublicRaw, 21);
  body.set(ct, 86);
  return body;
}

export function buildPushPayload(subscription, dateString) {
  const strings = pushStringsFor(subscription.language);
  const url = subscription.language && subscription.language !== 'en' ? '/' + subscription.language + '/' : '/';
  return new TextEncoder().encode(JSON.stringify({ title: strings.title, body: strings.body, url, date: dateString }));
}

export async function sendPushNotification(env, subscription, dateString, fetchImpl = fetch) {
  const vapid = await buildVapidAuthorization(env, subscription.endpoint);
  const payload = buildPushPayload(subscription, dateString);
  const body = await encryptPushPayload(subscription, payload);
  return fetchImpl(subscription.endpoint, {
    method: 'POST',
    headers: {
      TTL: '86400', Urgency: 'normal', Authorization: vapid.authorization,
      'Crypto-Key': vapid.cryptoKey, 'Content-Encoding': 'aes128gcm',
      'Content-Type': 'application/octet-stream'
    },
    body
  });
}

export function isPermanentPushFailure(status) {
  return status === 404 || status === 410;
}

export function isTransientPushFailure(status) {
  return status === 429 || (status >= 500 && status <= 599);
}
export function pushJson(data, status = 200) {
  return { data, status };
}

export async function handlePushPublicKey(env) {
  const publicKey = env.VAPID_PUBLIC_KEY;
  if (!publicKey) return pushJson({ success: false, status: 'unavailable', message: 'Push is not configured.' }, 503);
  return pushJson({ success: true, publicKey }, 200);
}

export async function handlePushSubscribe(request, env) {
  let input = null;
  try {
    input = await request.json();
  } catch {
    return pushJson({ success: false, message: 'Invalid JSON body.' }, 400);
  }
  const record = validatePushSubscription(input?.subscription ?? input);
  if (!record) return pushJson({ success: false, message: 'Invalid subscription.' }, 400);
  try {
    const saved = await upsertPushSubscription(env, record);
    return pushJson({ success: true, id: saved.id }, 200);
  } catch {
    return pushJson({ success: false, message: 'Subscription storage is unavailable.' }, 503);
  }
}

export async function handlePushUnsubscribe(request, env) {
  let input = null;
  try {
    input = await request.json();
  } catch {
    return pushJson({ success: false, message: 'Invalid JSON body.' }, 400);
  }
  const endpoint = typeof input?.endpoint === 'string'
    ? input.endpoint
    : typeof input?.subscription?.endpoint === 'string' ? input.subscription.endpoint : '';
  if (!endpoint) return pushJson({ success: false, message: 'Invalid subscription.' }, 400);
  try {
    await deactivatePushSubscription(env, endpoint);
    return pushJson({ success: true }, 200);
  } catch {
    return pushJson({ success: false, message: 'Subscription storage is unavailable.' }, 503);
  }
}

// UTC date (YYYY-MM-DD) stamped on the trusted mission cache payload.
// Null when no parseable date is present; such payloads keep legacy
// gating (mission/total checks + once-per-day claim).
export function missionCacheUtcDate(missions) {
  const value = missions?.lastUpdated;
  if (typeof value !== 'string' || value.length < 10) return null;
  const day = value.slice(0, 10);
  if (day.length !== 10) return null;
  if (day.charAt(4) !== '-' || day.charAt(7) !== '-') return null;
  return day;
}

// Fanout: notify only when trusted server mission data shows >=1 V-Bucks
// mission. `deps` stubs missions/network/bookkeeping for tests.
export async function runPushFanout(env, getMissions, dateString, deps = {}) {
  const summary = { checked: 0, sent: 0, skipped: 0, deactivated: 0, transientFailures: 0 };
  let missions = null;
  try {
    missions = deps.missions !== undefined ? deps.missions : await getMissions();
  } catch {
    return summary;
  }
  const missionCount = Array.isArray(missions?.missions) ? missions.missions.length : 0;
  const totalVbucks = Number(missions?.totalVbucks || 0);
  if (!missions || missionCount === 0 || totalVbucks <= 0) return summary;
  // Freshness guard: a stale previous-UTC-day cache must never claim
  // today's once-per-day slot. Payloads without a parseable lastUpdated
  // keep legacy behavior; an explicit deps.cacheDate override (used by the
  // scheduled flow and tests) wins when present.
  const cacheDate = deps.cacheDate !== undefined ? deps.cacheDate : missionCacheUtcDate(missions);
  if (cacheDate !== null && cacheDate !== undefined && cacheDate !== dateString) return summary;
  let subscriptions = [];
  try {
    subscriptions = deps.subscriptions !== undefined ? deps.subscriptions : await listActivePushSubscriptions(env);
  } catch {
    return summary;
  }
  const claim = deps.claimImpl || ((id) => claimPushSlot(env, id, dateString));
  const sendImpl = deps.sendImpl || ((sub) => sendPushNotification(env, sub, dateString, deps.fetchImpl || fetch));
  for (const sub of subscriptions) {
    summary.checked += 1;
    let claimed = false;
    try {
      claimed = await claim(sub.id);
    } catch {
      summary.skipped += 1;
      continue;
    }
    if (!claimed) {
      summary.skipped += 1;
      continue;
    }
    try {
      const response = await sendImpl(sub);
      const status = response?.status ?? 0;
      if (status >= 200 && status < 300) {
        summary.sent += 1;
        if (deps.recordDeliveredImpl) await deps.recordDeliveredImpl(sub.id);
        else await recordPushDelivered(env, sub.id);
      } else if (isPermanentPushFailure(status)) {
        summary.deactivated += 1;
        if (deps.deactivateImpl) await deps.deactivateImpl(sub.id);
        else await deactivatePushSubscriptionById(env, sub.id);
      } else {
        summary.transientFailures += 1;
        if (deps.recordFailureImpl) await deps.recordFailureImpl(sub.id);
        else await recordPushTransientFailure(env, sub.id);
      }
    } catch {
      summary.transientFailures += 1;
      try {
        if (deps.recordFailureImpl) await deps.recordFailureImpl(sub.id);
        else await recordPushTransientFailure(env, sub.id);
      } catch {
        // Bookkeeping must never fail the cron tick.
      }
    }
  }
  return summary;
}




