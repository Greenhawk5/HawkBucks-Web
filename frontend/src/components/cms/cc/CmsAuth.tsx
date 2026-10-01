import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";

import { ASSETS } from "@/lib/assets";
import { BRAND_NAME } from "@/lib/site";
import { CmsPending, CmsRouteError } from "./CmsPrimitives";

/**
 * Standalone restricted sign-in gate. Rendered WITHOUT the Control Center
 * shell (no sidebar/header/footer) so anonymous users see only the auth
 * surface. Always paired with a loader that returns `{ session }` — no CMS
 * data is fetched without a session.
 */
export function CmsSignInRequired(props: { title: string }) {
  return (
    <div className="cc-root cc-shell-bg flex min-h-dvh items-center justify-center px-4 py-12 font-sans">
      <div className="w-full max-w-md">
        <div className="cc-panel-elevated px-6 py-8 sm:px-8" style={{ borderRadius: "1rem" }}>
          <div className="flex flex-col items-center text-center">
            <img
              src={ASSETS.logo}
              alt=""
              aria-hidden="true"
              draggable={false}
              className="h-12 w-12 rounded-2xl"
            />
            <p className="cc-eyebrow mt-4">Restricted · {BRAND_NAME} Control Center</p>
            <h1 className="mt-2 font-display text-xl font-bold">{props.title}</h1>
            <p className="mt-1.5 text-sm opacity-70">
              Authentication required.{" "}
              <Link to="/admin" className="cc-link">
                Sign in
              </Link>
            </p>
          </div>
        </div>
        <p className="mt-4 text-center font-mono text-[10px] opacity-40">
          Private admin surface — never indexed.
        </p>
      </div>
    </div>
  );
}

export function CmsRoutePending(props: { title: string }) {
  return (
    <div className="cc-root cc-shell-bg min-h-dvh font-sans">
      <CmsPending title={props.title} />
    </div>
  );
}

export function CmsRouteErrorStandalone(props: { title: string; backTo: string; error: unknown }) {
  return (
    <div className="cc-root cc-shell-bg min-h-dvh font-sans">
      <CmsRouteError title={props.title} backTo={props.backTo} error={props.error} />
    </div>
  );
}

/** Shell-free wrapper used by the login page + pending/error fallbacks. */
export function CmsBarePage(props: { children: ReactNode }) {
  return <div className="cc-root cc-shell-bg min-h-dvh font-sans">{props.children}</div>;
}
