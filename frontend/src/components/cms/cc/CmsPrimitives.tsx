import { useEffect, useRef, useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { Check, Copy, X } from "lucide-react";

import { writeClipboardText } from "@/lib/clipboard";
import { cn } from "@/lib/utils";
import { CmsSelectCheckbox } from "./CmsPagination";

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
  /** Renders a dismiss control; used for transient result banners. */
  onDismiss?: () => void;
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
      className={cn(
        "flex gap-2.5 rounded-lg border px-3.5 py-2.5 text-sm leading-relaxed",
        // When a dismiss control exists the banner owns its own trailing
        // column, so the text must not be allowed to grow into it.
        props.onDismiss !== undefined ? "items-start" : "items-center",
        styles,
      )}
    >
      <div className="min-w-0 flex-1">
        {props.title ? <p className="font-semibold">{props.title}</p> : null}
        <div className={cn("text-[13px] opacity-90", props.title && "mt-0.5")}>
          {props.children}
        </div>
      </div>
      {props.onDismiss !== undefined ? (
        <button
          type="button"
          className="-me-1 shrink-0 rounded p-1 opacity-70 transition-opacity hover:opacity-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--cc-accent)]"
          onClick={props.onDismiss}
        >
          <X className="h-4 w-4" aria-hidden="true" />
          <span className="sr-only">Dismiss</span>
        </button>
      ) : null}
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
  /**
   * Reserve one line of height for the description even when there is none (or
   * when it is shorter than a neighbour's), so the CONTROLS in a multi-column
   * field row line up on the same baseline.
   *
   * Without this, a field whose helper text is missing or shorter sits higher
   * than its neighbour — the misalignment seen in the Hero Identity editor,
   * where a three-line Summary helper pushed its input well below the Class
   * control beside it. Opt-in so existing editors are not re-flowed.
   */
  alignControl?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="min-w-0">
      <label htmlFor={props.htmlFor} className="block text-sm font-medium">
        {props.label}
      </label>
      <p
        className={cn(
          "mt-0.5 text-xs leading-relaxed opacity-65",
          props.alignControl === true && "min-h-4",
        )}
      >
        {props.description}
      </p>
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
  /**
   * Opt-in row selection. The selection column is rendered FIRST so it reads as
   * a control rather than a field of the record, and its header cell carries the
   * page-scoped select-all with an explicit label — the brief requires that a
   * page selection is never mistaken for a cross-page one.
   */
  selectable?: {
    selected: Record<string, true>;
    onToggleRow: (contentId: string, next: boolean) => void;
    allOnPageSelected: boolean;
    someOnPageSelected: boolean;
    onTogglePage: (next: boolean) => void;
    /** Accessible label for the page select-all control. */
    pageLabel: string;
    disabled?: boolean;
  };
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
  const rowKey = (row: T, index: number) => row.contentId ?? row.id ?? String(index);
  const isRowSelected = (row: T): boolean => {
    const id = row.contentId;
    if (id === undefined || props.selectable === undefined) return false;
    return props.selectable.selected[id] === true;
  };
  return (
    <div className="cc-panel cc-scroll-x" style={{ padding: 0 }}>
      <table className="cc-table cc-table-stacked">
        <thead>
          <tr>
            {props.selectable ? (
              <th scope="col" className="w-10">
                <CmsSelectCheckbox
                  checked={props.selectable.allOnPageSelected}
                  indeterminate={
                    !props.selectable.allOnPageSelected && props.selectable.someOnPageSelected
                  }
                  onChange={props.selectable.onTogglePage}
                  label={props.selectable.pageLabel}
                  disabled={props.selectable.disabled}
                />
              </th>
            ) : null}
            {props.columns.map((col) => (
              <th key={col.key} scope="col">
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {props.rows.map((row, i) => {
            const key = rowKey(row, i);
            const to = props.rowTo?.(row);
            const selectionId = row.contentId ?? row.id;
            return (
              <tr key={key} data-selected={isRowSelected(row)}>
                {props.selectable ? (
                  <td data-label="Select">
                    <CmsSelectCheckbox
                      checked={
                        selectionId !== undefined && props.selectable.selected[selectionId] === true
                      }
                      onChange={(next) => {
                        if (selectionId !== undefined)
                          props.selectable!.onToggleRow(selectionId, next);
                      }}
                      label={`Select ${key}`}
                      disabled={props.selectable.disabled}
                    />
                  </td>
                ) : null}
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

/**
 * Dialog widths. `sm` is the default confirmation surface, `md` is the
 * current `wide` value, and `lg` is a media/detail surface that only
 * widens at the `lg` breakpoint so it never pushes a two-column layout
 * onto a phone. Every value is a max-width, so the panel stays fluid
 * and full-bleed on small screens.
 */
const DIALOG_WIDTHS = {
  sm: "sm:max-w-lg",
  md: "sm:max-w-2xl",
  lg: "sm:max-w-2xl lg:max-w-4xl",
} as const;

export function CmsDialog(props: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  /** @deprecated Pass `size` instead. Kept so existing call sites are unchanged. */
  wide?: boolean;
  size?: keyof typeof DIALOG_WIDTHS;
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
  const size = props.size ?? (props.wide ? "md" : "sm");
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
          DIALOG_WIDTHS[size],
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
  /**
   * Visual weight of the confirm action. `danger` is for irreversible or
   * retire-from-public operations; `default` is the neutral lifecycle change.
   */
  tone?: "default" | "danger";
}) {
  // Destructive confirmations keep the danger style. The mapping is spelled out
  // so the danger affordance stays a single greppable convention rather than an
  // inline conditional that could silently drift.
  const confirmClass =
    props.tone === "danger" ? "cc-btn-danger-outline cc-btn-sm" : "cc-btn-primary cc-btn-sm";
  return (
    <CmsDialog open={props.open} onClose={props.onClose} title={props.title}>
      <p className="text-sm leading-relaxed opacity-80">{props.body}</p>
      <div className="mt-5 flex justify-end gap-2">
        <button type="button" className="cc-btn cc-btn-ghost cc-btn-sm" onClick={props.onClose}>
          Cancel
        </button>
        <button
          type="button"
          className={`cc-btn ${confirmClass}`}
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
/* Inline copy affordance — sits beside the value it copies             */
/* Local to the value on purpose: copying an asset id must never be a  */
/* page-wide "Copy URL" button, because the action has to be reachable  */
/* at the point the user is reading the id.                             */
/*                                                                     */
/* This is the ONE copy control in the Control Center. Every caller     */
/* supplies the exact string to copy, so the clipboard mechanics, the   */
/* success treatment and the failure wording can never drift apart      */
/* between the card and the detail dialog.                              */
/*                                                                     */
/* Success is communicated two ways so it is never color-only: the       */
/* glyph swaps Copy -> Check AND `data-copied` tints the box. The       */
/* button is also the live region for its own state — its accessible    */
/* name changes to "… — copied" while a screen reader is focused on it, */
/* so it re-announces without stealing focus.                            */
/*                                                                     */
/* `onClick` stops propagation deliberately: this button is frequently   */
/* a SIBLING of an interactive card (never a child, to keep the DOM     */
/* valid), but stopping here guarantees that pressing Copy can never     */
/* bubble into an ancestor's open/preview handler.                      */
/* ------------------------------------------------------------------ */

const COPIED_RESET_MS = 1800;

export function CmsCopyButton(props: {
  /** Exact text placed on the clipboard. Never a derived/shortened form. */
  value: string;
  /** Describes the VALUE, not the button: "Copy asset ID", not "Copy". */
  label: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Never leave a timer running past unmount (the dialog closes right
  // after a copy in the common case).
  useEffect(
    () => () => {
      if (timer.current !== null) clearTimeout(timer.current);
    },
    [],
  );

  async function handleCopy() {
    // Never let a clipboard rejection escape as an unhandled rejection.
    const ok = await writeClipboardText(props.value);
    if (!ok) {
      cmsToast("error", "Copy failed. Your browser blocked clipboard access.");
      return;
    }
    setCopied(true);
    if (timer.current !== null) clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied(false), COPIED_RESET_MS);
  }

  return (
    <button
      type="button"
      className={cn("cc-icon-btn", props.className)}
      data-copied={copied ? "true" : undefined}
      aria-label={copied ? `${props.label} — copied` : props.label}
      title={copied ? "Copied" : props.label}
      onClick={(e) => {
        // Keep an enclosing card/link/preview handler from also firing.
        e.stopPropagation();
        void handleCopy();
      }}
    >
      {copied ? (
        <Check aria-hidden="true" className="h-3.5 w-3.5" />
      ) : (
        <Copy aria-hidden="true" className="h-3.5 w-3.5" />
      )}
    </button>
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
/* Action menu                                                         */
/* ------------------------------------------------------------------ */

/**
 * Re-exported from CmsMenu, which renders through a Radix portal.
 *
 * The implementation that used to live here was an absolutely-positioned
 * `<div>` inside the table cell, so `.cc-scroll-x`, `.cc-shell-scroll` and
 * `.cc-root` clipped it and the sticky CMS header (`z-40`) tied it. See the
 * header comment in CmsMenu.tsx for the full diagnosis.
 */
export { CmsActionMenu, CmsMenu } from "./CmsMenu";
