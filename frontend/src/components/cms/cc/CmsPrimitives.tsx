import { useEffect, useRef, useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";

import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/* Surfaces                                                              */
/* ------------------------------------------------------------------ */

export function CmsCard(props: {
  title?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  padded?: boolean;
}) {
  return (
    <section className={cn("cc-panel", props.className)}>
      {props.title !== undefined || props.action !== undefined ? (
        <div className="flex items-center justify-between gap-3 border-b px-4 py-3 cc-hairline">
          <h2 className="text-sm font-semibold">{props.title}</h2>
          {props.action}
        </div>
      ) : null}
      <div className={props.padded === false ? undefined : "px-4 py-4"}>{props.children}</div>
    </section>
  );
}

export function CmsSectionTitle(props: { children: ReactNode }) {
  return <h2 className="cc-eyebrow">{props.children}</h2>;
}

export function CmsPageHeader(props: {
  eyebrow: string;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div className="min-w-0">
        <p className="cc-eyebrow">{props.eyebrow}</p>
        <h1 className="mt-1 font-display text-2xl font-bold tracking-tight">{props.title}</h1>
        {props.description ? (
          <p className="mt-1.5 max-w-2xl text-sm leading-relaxed opacity-70">{props.description}</p>
        ) : null}
      </div>
      {props.action ? (
        <div className="flex shrink-0 flex-wrap items-center gap-2">{props.action}</div>
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Stat tiles                                                            */
/* ------------------------------------------------------------------ */

export function CmsStatCard(props: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  tone?: "default" | "accent" | "warning" | "danger";
  to?: string;
}) {
  const tone =
    props.tone === "accent"
      ? "text-[var(--cc-accent)]"
      : props.tone === "warning"
        ? "text-[var(--cc-amber)]"
        : props.tone === "danger"
          ? "text-[var(--cc-danger)]"
          : undefined;
  const body = (
    <div className="cc-panel px-4 py-3.5">
      <p className="cc-eyebrow">{props.label}</p>
      <p className={cn("mt-1.5 text-2xl font-semibold leading-none tabular-nums", tone)}>
        {props.value}
      </p>
      {props.hint ? <p className="mt-1.5 text-xs opacity-70">{props.hint}</p> : null}
    </div>
  );
  if (!props.to) return body;
  return (
    <Link
      to={props.to}
      className="block rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-[var(--cc-accent)]"
    >
      {body}
    </Link>
  );
}

/* ------------------------------------------------------------------ */
/* Status badges (color + text label, never color alone)                 */
/* ------------------------------------------------------------------ */

export type CmsStatusTone = "ok" | "warning" | "danger" | "info" | "neutral";

const STATUS_TONES: Record<CmsStatusTone, string> = {
  ok: "border-[var(--cc-accent)]/35 bg-[var(--cc-accent)]/10 text-[var(--cc-accent)]",
  warning: "border-[var(--cc-amber)]/35 bg-[var(--cc-amber)]/10 text-[var(--cc-amber)]",
  danger: "border-[var(--cc-danger)]/35 bg-[var(--cc-danger)]/10 text-[var(--cc-danger)]",
  info: "border-[var(--cc-cyan)]/35 bg-[var(--cc-cyan)]/10 text-[var(--cc-cyan)]",
  neutral: "border-white/15 bg-white/5 opacity-80",
};

export function CmsStatusBadge(props: {
  tone?: CmsStatusTone;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 font-mono text-[10px] font-medium uppercase tracking-wider",
        STATUS_TONES[props.tone ?? "neutral"],
        props.className,
      )}
    >
      {props.children}
    </span>
  );
}

/** Map the REAL lifecycle states to badge tones. Only these three exist. */
export function CmsLifecycleBadge(props: { status: string }) {
  const tone: CmsStatusTone =
    props.status === "published" ? "ok" : props.status === "archived" ? "neutral" : "warning";
  return <CmsStatusBadge tone={tone}>{props.status}</CmsStatusBadge>;
}

/* ------------------------------------------------------------------ */
/* Notices                                                               */
/* ------------------------------------------------------------------ */

export function CmsNotice(props: {
  kind: "success" | "error" | "info" | "warning";
  title?: string;
  children: ReactNode;
}) {
  const styles =
    props.kind === "success"
      ? "border-[var(--cc-accent)]/40 bg-[var(--cc-accent)]/8 text-[var(--cc-accent)]"
      : props.kind === "error"
        ? "border-[var(--cc-danger)]/40 bg-[var(--cc-danger)]/8 text-[var(--cc-danger)]"
        : props.kind === "info"
          ? "border-[var(--cc-cyan)]/35 bg-[var(--cc-cyan)]/8 text-[var(--cc-cyan)]"
          : "border-[var(--cc-amber)]/40 bg-[var(--cc-amber)]/8 text-[var(--cc-amber)]";
  return (
    <div
      role={props.kind === "error" ? "alert" : "status"}
      className={cn("flex gap-2.5 rounded-lg border px-3.5 py-2.5 text-sm leading-relaxed", styles)}
    >
      <div className="min-w-0">
        {props.title ? <p className="font-semibold">{props.title}</p> : null}
        <div className={cn("text-[13px] opacity-90", props.title && "mt-0.5")}>
          {props.children}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Empty / loading / error states                                        */
/* ------------------------------------------------------------------ */

export function CmsEmpty(props: {
  title: string;
  description?: string | undefined;
  action?: ReactNode | undefined;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed px-6 py-12 text-center cc-hairline">
      <p className="text-sm font-medium">{props.title}</p>
      {props.description ? (
        <p className="max-w-sm text-xs leading-relaxed opacity-70">{props.description}</p>
      ) : null}
      {props.action ? <div className="mt-3">{props.action}</div> : null}
    </div>
  );
}

export function CmsSkeletonRows(props: { rows?: number }) {
  const rows = props.rows ?? 4;
  return (
    <div className="space-y-2" role="status" aria-label="Loading">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="cc-panel h-12 w-full animate-pulse" aria-hidden="true" />
      ))}
    </div>
  );
}

export function CmsPending(props: { title: string }) {
  return (
    <div className="mx-auto w-full max-w-[1400px] px-4 py-8 sm:px-6 lg:px-8" aria-busy="true">
      <p className="cc-eyebrow">Control Center</p>
      <h1 className="mt-1 font-display text-2xl font-bold">{props.title}</h1>
      <div className="mt-6">
        <CmsSkeletonRows rows={5} />
      </div>
    </div>
  );
}

export function CmsRouteError(props: { title: string; backTo: string; error: unknown }) {
  const detail = props.error instanceof Error ? props.error.message : "Something went wrong.";
  return (
    <div className="mx-auto w-full max-w-[1400px] px-4 py-8 sm:px-6 lg:px-8">
      <p className="cc-eyebrow">Control Center</p>
      <h1 className="mt-1 font-display text-2xl font-bold">{props.title}</h1>
      <div className="mt-6">
        <CmsNotice kind="error">{detail}</CmsNotice>
        <p className="mt-4 text-sm">
          <Link to={props.backTo} className="cc-link">
            Back
          </Link>
        </p>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Forms: sections + fields + sticky save bar                            */
/* ------------------------------------------------------------------ */

export function CmsFormSection(props: {
  title: string;
  description?: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <section className="cc-panel px-4 py-4 sm:px-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold">{props.title}</h2>
          {props.description ? (
            <p className="mt-1 max-w-xl text-[13px] leading-relaxed opacity-70">
              {props.description}
            </p>
          ) : null}
        </div>
        {props.action}
      </div>
      <div className="mt-4 space-y-4">{props.children}</div>
    </section>
  );
}

export function CmsField(props: {
  label: string;
  description?: string;
  htmlFor?: string;
  children: ReactNode;
}) {
  return (
    <div className="min-w-0">
      <label htmlFor={props.htmlFor} className="block text-sm font-medium">
        {props.label}
      </label>
      {props.description ? (
        <p className="mt-0.5 text-xs leading-relaxed opacity-65">{props.description}</p>
      ) : null}
      <div className="mt-1.5">{props.children}</div>
    </div>
  );
}

export function CmsSaveBar(props: {
  dirty: boolean;
  saving: boolean;
  message: string | null;
  error: string | null;
  onSave: () => void;
  saveLabel?: string;
  extra?: ReactNode;
}) {
  return (
    <div className="sticky bottom-0 z-30 -mx-1 border-t bg-[var(--cc-void)]/92 px-1 py-3 backdrop-blur-md cc-hairline">
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          className="cc-btn cc-btn-primary"
          disabled={props.saving || !props.dirty}
          onClick={props.onSave}
        >
          {props.saving ? "Saving…" : (props.saveLabel ?? "Save changes")}
        </button>
        {props.extra}
        <p className="text-xs opacity-70" role="status">
          {props.saving ? "Saving…" : props.dirty ? "Unsaved changes." : "All changes saved."}
        </p>
      </div>
      {props.message ? (
        <p className="mt-2 text-sm text-[var(--cc-accent)]" role="status">
          {props.message}
        </p>
      ) : null}
      {props.error ? (
        <p className="mt-2 text-sm text-[var(--cc-danger)]" role="alert">
          {props.error}
        </p>
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Publish panel — Save vs Publish is explicit, states are real only    */
/* ------------------------------------------------------------------ */

export function CmsPublishPanel(props: {
  status: string;
  updatedAt?: string | null | undefined;
  pending: boolean;
  canPublish: boolean;
  onPublish: (to: "published" | "draft" | "archived") => void;
}) {
  const hint =
    props.status === "published"
      ? "Live on the public site. Saving edits keeps them live immediately — unpublish to hide."
      : props.status === "archived"
        ? "Hidden and retired. Move back to draft for rework — archived content never publishes directly."
        : "Hidden from the public site. Only published content is publicly visible.";
  return (
    <section className="cc-panel px-4 py-4" aria-label="Publishing">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-base font-semibold">Publishing</h2>
        <CmsLifecycleBadge status={props.status} />
      </div>
      <p className="mt-1.5 text-[13px] leading-relaxed opacity-70">{hint}</p>
      {props.updatedAt ? (
        <p className="mt-1 text-xs opacity-60">
          Last updated <span title={props.updatedAt}>{relativeTime(props.updatedAt)}</span>
        </p>
      ) : null}
      <div className="mt-3 flex flex-wrap gap-2">
        {props.status !== "published" ? (
          <button
            type="button"
            className="cc-btn cc-btn-primary cc-btn-sm"
            disabled={props.pending || !props.canPublish}
            onClick={() => props.onPublish("published")}
            title={props.canPublish ? undefined : "Your role cannot publish."}
          >
            {props.pending ? "Working…" : "Publish"}
          </button>
        ) : null}
        {props.status === "published" ? (
          <button
            type="button"
            className="cc-btn cc-btn-outline cc-btn-sm"
            disabled={props.pending || !props.canPublish}
            onClick={() => props.onPublish("draft")}
          >
            {props.pending ? "Working…" : "Unpublish to draft"}
          </button>
        ) : null}
        {props.status !== "archived" ? (
          <button
            type="button"
            className="cc-btn cc-btn-outline cc-btn-sm"
            disabled={props.pending || !props.canPublish}
            onClick={() => props.onPublish("archived")}
          >
            {props.pending ? "Working…" : "Archive"}
          </button>
        ) : (
          <button
            type="button"
            className="cc-btn cc-btn-outline cc-btn-sm"
            disabled={props.pending}
            onClick={() => props.onPublish("draft")}
          >
            {props.pending ? "Working…" : "Move back to draft"}
          </button>
        )}
      </div>
      <p className="mt-2.5 border-t pt-2.5 text-xs leading-relaxed opacity-60 cc-hairline">
        Save stores edits. Publish controls visibility. They are separate operations.
      </p>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Tables                                                                */
/* ------------------------------------------------------------------ */

export interface CmsColumn<T> {
  key: string;
  header: string;
  render: (row: T) => ReactNode;
  label?: string;
}

export function CmsDataTable<T extends { contentId?: string; id?: string }>(props: {
  columns: Array<CmsColumn<T>>;
  rows: T[];
  emptyTitle: string;
  emptyDescription?: string | undefined;
  emptyAction?: ReactNode | undefined;
  rowTo?: ((row: T) => string) | undefined;
}) {
  if (props.rows.length === 0) {
    return (
      <CmsEmpty
        title={props.emptyTitle}
        description={props.emptyDescription}
        action={props.emptyAction}
      />
    );
  }
  return (
    <div className="cc-panel cc-scroll-x" style={{ padding: 0 }}>
      <table className="cc-table cc-table-stacked">
        <thead>
          <tr>
            {props.columns.map((col) => (
              <th key={col.key} scope="col">
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {props.rows.map((row, i) => {
            const key = row.contentId ?? row.id ?? String(i);
            const to = props.rowTo?.(row);
            return (
              <tr key={key}>
                {props.columns.map((col, ci) => (
                  <td key={col.key} data-label={col.label ?? col.header}>
                    {ci === 0 && to ? (
                      <Link to={to} className="cc-link font-medium">
                        {col.render(row)}
                      </Link>
                    ) : (
                      col.render(row)
                    )}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Filters: search + status tabs                                         */
/* ------------------------------------------------------------------ */

export function CmsStatusTabs(props: {
  options: Array<{ value: string; label: string; count?: number }>;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Filter by status">
      {props.options.map((opt) => {
        const active = opt.value === props.value;
        return (
          <button
            key={opt.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => props.onChange(opt.value)}
            className={cn(
              "cc-btn cc-btn-sm",
              active ? "cc-btn-primary" : "cc-btn-ghost",
              !active && "border cc-hairline",
            )}
          >
            {opt.label}
            {opt.count !== undefined ? (
              <span className="tabular-nums opacity-70">({opt.count})</span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Dialog (confirm + generic)                                            */
/* ------------------------------------------------------------------ */

export function CmsDialog(props: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!props.open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") props.onClose();
    };
    window.addEventListener("keydown", onKey);
    ref.current?.querySelector<HTMLElement>("input, textarea, select, button")?.focus();
    return () => window.removeEventListener("keydown", onKey);
  }, [props.open, props.onClose]);
  if (!props.open) return null;
  return (
    <div className="fixed inset-0 z-[90] flex items-end justify-center p-0 sm:items-center sm:p-4">
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={props.onClose}
        aria-hidden="true"
      />
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label={props.title}
        className={cn(
          "cc-panel-elevated relative max-h-[92dvh] w-full overflow-y-auto shadow-2xl",
          props.wide ? "sm:max-w-2xl" : "sm:max-w-lg",
        )}
        style={{ borderRadius: "1rem" }}
      >
        <div className="sticky top-0 flex items-center justify-between gap-3 border-b bg-[var(--cc-panel-2)] px-5 py-3.5 cc-hairline">
          <h3 className="text-sm font-semibold">{props.title}</h3>
          <button
            type="button"
            onClick={props.onClose}
            aria-label="Close dialog"
            className="cc-btn cc-btn-ghost cc-btn-sm"
          >
            ✕
          </button>
        </div>
        <div className="p-5">{props.children}</div>
      </div>
    </div>
  );
}

export function CmsConfirmDialog(props: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  body: string;
  confirmLabel?: string;
  pending?: boolean;
}) {
  return (
    <CmsDialog open={props.open} onClose={props.onClose} title={props.title}>
      <p className="text-sm leading-relaxed opacity-80">{props.body}</p>
      <div className="mt-5 flex justify-end gap-2">
        <button type="button" className="cc-btn cc-btn-ghost cc-btn-sm" onClick={props.onClose}>
          Cancel
        </button>
        <button
          type="button"
          className="cc-btn cc-btn-danger-outline cc-btn-sm"
          disabled={props.pending}
          onClick={props.onConfirm}
        >
          {props.pending ? "Working…" : (props.confirmLabel ?? "Confirm")}
        </button>
      </div>
    </CmsDialog>
  );
}

/* ------------------------------------------------------------------ */
/* Toast (imperative, one host in the shell)                             */
/* ------------------------------------------------------------------ */

interface ToastState {
  id: number;
  kind: "success" | "error" | "info";
  message: string;
}

let toastSeq = 0;
const toastListeners = new Set<(t: ToastState[]) => void>();
let toasts: ToastState[] = [];

export function cmsToast(kind: ToastState["kind"], message: string) {
  const t = { id: ++toastSeq, kind, message };
  toasts = [...toasts, t];
  toastListeners.forEach((l) => l(toasts));
  setTimeout(() => {
    toasts = toasts.filter((x) => x.id !== t.id);
    toastListeners.forEach((l) => l(toasts));
  }, 5000);
}

export function CmsToastHost() {
  const [current, setCurrent] = useState<ToastState[]>([]);
  useEffect(() => {
    toastListeners.add(setCurrent);
    return () => {
      toastListeners.delete(setCurrent);
    };
  }, []);
  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed bottom-4 right-4 z-[95] flex w-full max-w-sm flex-col gap-2 px-4 sm:px-0"
    >
      {current.map((t) => (
        <div
          key={t.id}
          className={cn(
            "cc-panel-elevated pointer-events-auto flex items-start gap-2.5 px-3.5 py-2.5 text-sm shadow-xl",
            t.kind === "success" && "text-[var(--cc-accent)]",
            t.kind === "error" && "text-[var(--cc-danger)]",
            t.kind === "info" && "text-[var(--cc-frost)]",
          )}
        >
          <span className="min-w-0 flex-1">{t.message}</span>
          <button
            type="button"
            aria-label="Dismiss notification"
            className="rounded p-0.5 opacity-70 hover:opacity-100"
            onClick={() => {
              toasts = toasts.filter((x) => x.id !== t.id);
              toastListeners.forEach((l) => l(toasts));
            }}
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Time helpers                                                          */
/* ------------------------------------------------------------------ */

export function relativeTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  const then = Date.parse(iso);
  if (Number.isNaN(then)) return "—";
  const seconds = Math.round((Date.now() - then) / 1000);
  if (seconds < 45) return "just now";
  if (seconds < 3600) return `${Math.round(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.round(seconds / 3600)}h ago`;
  if (seconds < 86400 * 7) return `${Math.round(seconds / 86400)}d ago`;
  return new Date(iso).toLocaleDateString("en", { month: "short", day: "numeric" });
}

/* ------------------------------------------------------------------ */
/* Action menu (accessible details-based menu, no JS positioning)        */
/* ------------------------------------------------------------------ */

export function CmsActionMenu(props: {
  label?: string;
  items: Array<{ label: string; onSelect: () => void; danger?: boolean }>;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);
  return (
    <div ref={ref} className="relative inline-block">
      <button
        type="button"
        className="cc-btn cc-btn-ghost cc-btn-sm"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={props.label ?? "Row actions"}
        onClick={() => setOpen((v) => !v)}
      >
        ⋯
      </button>
      {open ? (
        <div
          role="menu"
          className="cc-panel-elevated absolute right-0 z-40 min-w-40 py-1 shadow-2xl"
          style={{ padding: "0.25rem" }}
        >
          {props.items.map((item) => (
            <button
              key={item.label}
              type="button"
              role="menuitem"
              className={cn(
                "flex w-full items-center rounded-md px-3 py-2 text-left text-sm hover:bg-white/5",
                item.danger ? "text-[var(--cc-danger)]" : undefined,
              )}
              onClick={() => {
                setOpen(false);
                item.onSelect();
              }}
            >
              {item.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
