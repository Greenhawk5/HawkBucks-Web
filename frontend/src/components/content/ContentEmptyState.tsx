import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Compact, purposeful empty state. Deliberately short — a hub with no published
 * records must still read as a finished destination, not a blank page, so the
 * panel states what the section holds, why it is empty, and the next action,
 * without consuming the viewport.
 */
export function ContentEmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon?: LucideIcon;
  title: string;
  description: string;
  /** Optional recovery control (clear filters, browse a topic…). */
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      data-testid="content-empty-state"
      className={cn(
        "mx-auto max-w-md rounded-2xl border border-dashed border-panel-border bg-background/30 px-6 py-10 text-center",
        className,
      )}
    >
      {Icon ? (
        <span
          aria-hidden="true"
          className="mx-auto grid h-12 w-12 place-items-center rounded-xl border border-panel-border bg-background/60 text-muted-foreground"
        >
          <Icon className="h-5 w-5" />
        </span>
      ) : null}
      <h3 className="mt-4 font-display text-lg font-extrabold">{title}</h3>
      <p className="mx-auto mt-1.5 max-w-xs text-sm leading-relaxed text-muted-foreground">
        {description}
      </p>
      {action ? <div className="mt-5 flex justify-center">{action}</div> : null}
    </div>
  );
}
