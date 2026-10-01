import { useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";

import { CmsSignInRequired } from "./CmsAuth";
import { CmsFormSection, CmsNotice, CmsPublishPanel, cmsToast } from "./CmsPrimitives";

interface SessionShape {
  authenticated: boolean;
  user: {
    id: string;
    username: string;
    displayName: string;
    role: string;
  } | null;
  expiresAt: string | null;
}

/**
 * Shared editor frame: breadcrumb back-link, title block with lifecycle
 * badge context, two-column workspace (form sections left, publishing +
 * metadata rail right), sticky save feedback.
 *
 * Mutation wiring stays per-entity — this only standardizes layout, state
 * feedback, and the Save≠Publish distinction.
 */
export function CmsEditorFrame(props: {
  session: SessionShape;
  backTo: string;
  backLabel: string;
  eyebrow: string;
  title: string;
  subtitle?: string;
  status: string;
  updatedAt?: string | null;
  publishPending: boolean;
  canPublish: boolean;
  onPublish: (to: "published" | "draft" | "archived") => void;
  rail?: ReactNode;
  children: ReactNode;
}) {
  const { session } = props;
  if (!session.authenticated || !session.user) {
    return <CmsSignInRequired title={props.title} />;
  }
  // SHELL-AGNOSTIC BY DESIGN: this frame renders ONLY page content. The
  // single CmsShell lives on the parent list route (/admin/articles, …),
  // whose <Outlet /> injects the editor into the shell's existing main
  // content area. Rendering a second CmsShell here produced the nested
  // sidebar+topbar duplication — never restore one.
  return (
    <div className="space-y-5">
      <div>
        <p className="text-xs">
          <Link to={props.backTo} className="cc-link">
            ← {props.backLabel}
          </Link>
        </p>
        <p className="cc-eyebrow mt-3">{props.eyebrow}</p>
        <h1 className="mt-1 font-display text-2xl font-bold tracking-tight">{props.title}</h1>
        {props.subtitle ? (
          <p className="mt-1.5 max-w-2xl text-sm leading-relaxed opacity-70">{props.subtitle}</p>
        ) : null}
      </div>
      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="min-w-0 space-y-4">{props.children}</div>
        <div className="space-y-4 lg:sticky lg:top-20">
          <CmsPublishPanel
            status={props.status}
            updatedAt={props.updatedAt}
            pending={props.publishPending}
            canPublish={props.canPublish}
            onPublish={props.onPublish}
          />
          {props.rail}
        </div>
      </div>
    </div>
  );
}

export function useCmsEditorState() {
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  async function run(action: () => Promise<string>) {
    setPending(true);
    setError(null);
    setMessage(null);
    try {
      const ok = await action();
      setMessage(ok);
      cmsToast("success", ok);
      return true;
    } catch (e) {
      const m = e instanceof Error ? e.message : "Save failed.";
      setError(m);
      return false;
    } finally {
      setPending(false);
    }
  }
  return { pending, message, error, run, setError, setMessage };
}

export function CmsEditorFeedback(props: { message: string | null; error: string | null }) {
  return (
    <>
      {props.message ? <CmsNotice kind="success">{props.message}</CmsNotice> : null}
      {props.error ? <CmsNotice kind="error">{props.error}</CmsNotice> : null}
    </>
  );
}

export { CmsFormSection };
