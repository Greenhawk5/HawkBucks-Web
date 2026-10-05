// Phase 8 — Web Push service worker. Scope: root (/sw.js). No offline
// caching, no PWA precache — push + notificationclick only.
self.addEventListener("push", (event) => {
  // Last-resort copy for a malformed/absent payload. Mirrors the English
  // WebBox notification body in worker/push.js PUSH_STRINGS.en, so a
  // broken payload never renders something less useful than a valid one.
  const fallback = {
    title: "V-Bucks missions are available!",
    body: "Check them out.",
    url: "/",
  };
  let data = { ...fallback };
  try {
    const incoming = event.data ? event.data.json() : null;
    if (incoming && typeof incoming === "object") {
      if (typeof incoming.title === "string" && incoming.title)
        data.title = incoming.title.slice(0, 120);
      if (typeof incoming.body === "string" && incoming.body)
        data.body = incoming.body.slice(0, 200);
      if (typeof incoming.url === "string" && incoming.url.startsWith("/"))
        data.url = incoming.url.slice(0, 200);
    }
  } catch {
    // Keep generic fallback; never leak parse errors.
  }
  const promise = self.registration.showNotification(data.title, {
    body: data.body,
    icon: "/icon-192.png",
    badge: "/favicon.png",
    data: { url: data.url || "/" },
  });
  event.waitUntil(promise);
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const raw = event.notification.data && event.notification.data.url;
  const url = typeof raw === "string" && raw.startsWith("/") ? raw : "/";
  const promise = self.clients
    .matchAll({ type: "window", includeUncontrolled: true })
    .then((windows) => {
      for (const win of windows) {
        try {
          const u = new URL(win.url);
          if (u.pathname === url && "focus" in win) return win.focus();
        } catch {
          // Ignore unparseable client URLs.
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(url);
      return undefined;
    });
  event.waitUntil(promise);
});
