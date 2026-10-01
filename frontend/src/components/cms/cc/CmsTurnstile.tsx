import { useEffect, useId, useRef } from "react";

/**
 * Wave 1 — Cloudflare Turnstile widget wrapper for the CMS login page.
 *
 * Official integration shape: the `https://challenges.cloudflare.com/turnstile/v0/api.js`
 * script exposes a global `turnstile` object; `turnstile.render(el, { sitekey,
 * callback, "expired-callback", "error-callback" })` mounts the checkbox, and
 * the `callback` receives the challenge token the login request must carry.
 * The SECRET never appears here — only the public site key (passed in from
 * the server via getTurnstileSiteKey). Verification happens server-side in
 * auth.server.ts (siteverify endpoint).
 *
 * Behavior:
 *   * `siteKey === null` → Turnstile unconfigured (local dev): renders
 *     nothing, calls onToken(null) once so the form stays submittable.
 *   * Script load failure / render error / expiry → surfaces a non-blocking
 *     message and clears the token; the FORM stays usable so a broken widget
 *     CDN degrades to the password + rate-limit path, while an ENFORCED
 *     server still fails closed (it rejects the missing/invalid token).
 *   * Cleanup removes the widget on unmount (login success → dashboard).
 */

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: HTMLElement,
        params: {
          sitekey: string;
          callback?: (token: string) => void;
          "expired-callback"?: () => void;
          "error-callback"?: () => void;
          theme?: "light" | "dark" | "auto";
          size?: "normal" | "compact";
        },
      ) => string;
      remove?: (widgetId: string) => void;
      reset?: (widgetId: string) => void;
    };
    onCmsTurnstileLoad?: () => void;
  }
}

const TURNSTILE_SCRIPT_SRC =
  "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

function loadTurnstileScript(): Promise<void> {
  if (typeof document === "undefined") return Promise.resolve();
  const existing = document.querySelector<HTMLScriptElement>(
    'script[src^="https://challenges.cloudflare.com/turnstile/v0/api.js"]',
  );
  if (existing) {
    if (window.turnstile) return Promise.resolve();
    return new Promise((resolve) => {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => resolve(), { once: true });
    });
  }
  return new Promise((resolve) => {
    const script = document.createElement("script");
    script.src = TURNSTILE_SCRIPT_SRC;
    script.async = true;
    script.defer = true;
    script.addEventListener("load", () => resolve(), { once: true });
    // Resolve (not reject) on error: the widget shows its own fallback and
    // the server still enforces when configured — never hang the form.
    script.addEventListener("error", () => resolve(), { once: true });
    document.head.appendChild(script);
  });
}

export function CmsTurnstile(props: {
  siteKey: string | null;
  onToken: (token: string | null) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const onTokenRef = useRef(props.onToken);
  onTokenRef.current = props.onToken;
  const describedById = useId();

  useEffect(() => {
    if (props.siteKey === null) {
      onTokenRef.current(null);
      return;
    }
    let cancelled = false;
    void loadTurnstileScript().then(() => {
      if (cancelled || !containerRef.current) return;
      if (!window.turnstile) return;
      try {
        widgetIdRef.current = window.turnstile.render(containerRef.current, {
          sitekey: props.siteKey ?? "",
          theme: "dark",
          callback: (token: string) => onTokenRef.current(token),
          "expired-callback": () => onTokenRef.current(null),
          "error-callback": () => onTokenRef.current(null),
        });
      } catch {
        onTokenRef.current(null);
      }
    });
    return () => {
      cancelled = true;
      try {
        if (widgetIdRef.current && window.turnstile?.remove) {
          window.turnstile.remove(widgetIdRef.current);
        }
      } catch {
        // Widget teardown is advisory.
      }
      widgetIdRef.current = null;
    };
  }, [props.siteKey]);

  if (props.siteKey === null) return null;
  return (
    <div>
      <div ref={containerRef} aria-describedby={describedById} />
      <p id={describedById} className="mt-1.5 text-xs opacity-60">
        Bot check by Cloudflare Turnstile. If it doesn&apos;t load, sign-in still submits — the
        server decides.
      </p>
    </div>
  );
}
