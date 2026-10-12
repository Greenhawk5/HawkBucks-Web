/**
 * Portal-based menu for CMS surfaces.
 *
 * WHY THIS EXISTS (the clipping bug)
 * ----------------------------------
 * The previous row action menu was an absolutely-positioned `<div>` rendered
 * INSIDE its `<td>`. Three CMS ancestors clip it, innermost first:
 *
 *   1. `.cc-scroll-x`   (`overflow-x:auto`)  — cms.css, table wrapper
 *   2. `.cc-shell-scroll` (`overflow-y:auto`) — CmsShell scroll column
 *   3. `.cc-root` (`overflow:hidden`)         — CmsShell viewport frame
 *
 * plus the sticky CMS header sits at `z-40`, the SAME stacking level as the old
 * menu, so the menu also lost ties to the header. Raising `z-index` cannot fix
 * any of this: as long as the menu is a descendant of a clipping ancestor, it
 * is clipped no matter how high its z-index.
 *
 * THE FIX
 * -------
 * Radix `DropdownMenu.Content` renders through `DropdownMenu.Portal` into
 * `document.body`, which places it outside every clipping ancestor AND outside
 * the CMS shell's stacking context. Position is computed by floating-ui (reached
 * transitively via `@radix-ui/react-menu` -> `@radix-ui/react-popper`), so the
 * menu stays anchored to its trigger and flips/shifts near viewport edges.
 *
 * Radix also supplies, for free, the behaviours a hand-rolled menu must be
 * careful about: Escape to close, pointer-down outside to dismiss, arrow-key
 * roving focus, typeahead, Home/End, focus restore to the trigger on close, and
 * `aria-expanded`/`role=menu`/`role=menuitem` wiring.
 *
 * SCOPE NOTE: the CMS shell also renders its own `.cc-root`-scoped tokens, so
 * this surface deliberately styles off the `cc-*` variables rather than the
 * public-site `bg-popover` tokens used by `components/ui/dropdown-menu.tsx`.
 */

import * as React from "react";
import * as DropdownMenuPrimitive from "@radix-ui/react-dropdown-menu";

import { cn } from "@/lib/utils";

/** A single selectable action. `onSelect` runs after the menu closes. */
export interface CmsMenuItem {
  key?: string;
  label?: React.ReactNode;
  onSelect?: () => void;
  /** Renders in the danger color and is announced as such to assistive tech. */
  danger?: boolean | undefined;
  /** Disabled items stay focusable-by-skip but cannot be selected. */
  disabled?: boolean | undefined;
  /** Short explanation shown when `disabled` is set. */
  disabledReason?: string | undefined;
  /** Renders a non-interactive section heading. */
  kind?: "item" | "label" | "separator" | undefined;
}

export interface CmsMenuProps {
  /** Accessible name for the trigger button. */
  label: string;
  items: readonly CmsMenuItem[];
  /** Trigger content. Defaults to a three-dot glyph. */
  trigger?: React.ReactNode;
  align?: "start" | "center" | "end" | undefined;
  side?: "top" | "right" | "bottom" | "left" | undefined;
  className?: string | undefined;
  disabled?: boolean | undefined;
  /** Called whenever the menu opens or closes. */
  onOpenChange?: ((open: boolean) => void) | undefined;
}

/** Matches the CMS stacking ceiling: above the sticky header (z-40). */
const MENU_Z = "z-[92]";

export function CmsMenu(props: CmsMenuProps) {
  const {
    label,
    items,
    trigger,
    align = "end",
    side = "bottom",
    className,
    disabled = false,
    onOpenChange,
  } = props;

  return (
    // Radix's own types do not allow `| undefined` on `onOpenChange`, so the
    // handler is spread only when supplied rather than passed as `undefined`.
    <DropdownMenuPrimitive.Root {...(onOpenChange !== undefined ? { onOpenChange } : {})}>
      <DropdownMenuPrimitive.Trigger asChild disabled={disabled}>
        <button
          type="button"
          className={cn(
            "cc-btn cc-btn-ghost cc-btn-sm",
            // The glyph-only trigger must stay a real, comfortable target.
            "h-8 w-8 shrink-0 px-0",
            className,
          )}
          aria-label={label}
        >
          {trigger ?? <span aria-hidden="true">⋯</span>}
        </button>
      </DropdownMenuPrimitive.Trigger>
      <DropdownMenuPrimitive.Portal>
        <DropdownMenuPrimitive.Content
          align={align}
          side={side}
          sideOffset={6}
          // Floating UI options that keep the menu on screen near the viewport
          // edges, which is what makes a bottom-row / right-column trigger safe.
          collisionPadding={12}
          avoidCollisions
          className={cn(
            MENU_Z,
            "cc-panel-elevated min-w-44 overflow-hidden p-1 shadow-2xl",
            "max-h-[var(--radix-dropdown-menu-content-available-height)]",
            "overscroll-contain",
          )}
          // Long menus scroll instead of overflowing the viewport.
          style={{ backgroundColor: "color-mix(in oklch, var(--cc-panel-2) 98%, transparent)" }}
        >
          {items.map((item, index) => {
            if (item.kind === "separator") {
              return (
                <DropdownMenuPrimitive.Separator
                  key={item.key ?? `sep-${index}`}
                  className="-mx-1 my-1 h-px"
                  style={{ backgroundColor: "var(--cc-edge-2)" }}
                />
              );
            }
            if (item.kind === "label") {
              return (
                <DropdownMenuPrimitive.Label
                  key={item.key ?? `label-${index}`}
                  className="cc-eyebrow px-3 py-1.5"
                >
                  {item.label}
                </DropdownMenuPrimitive.Label>
              );
            }
            const disabledReason = item.disabled === true;
            return (
              <DropdownMenuPrimitive.Item
                key={item.key ?? `item-${index}`}
                disabled={disabledReason}
                title={item.disabledReason}
                onSelect={() => {
                  // Radix closes the menu and restores trigger focus around
                  // this callback; the action itself must not depend on the
                  // menu staying mounted.
                  item.onSelect?.();
                }}
                className={cn(
                  "flex cursor-pointer select-none items-center gap-2 rounded-md px-3 py-2 text-left text-sm",
                  "outline-none transition-colors",
                  "focus:bg-white/8 data-[highlighted]:bg-white/8",
                  "data-[disabled]:pointer-events-none data-[disabled]:opacity-45",
                  item.danger === true ? "text-[var(--cc-danger)]" : undefined,
                )}
              >
                {item.label}
              </DropdownMenuPrimitive.Item>
            );
          })}
        </DropdownMenuPrimitive.Content>
      </DropdownMenuPrimitive.Portal>
    </DropdownMenuPrimitive.Root>
  );
}

/**
 * Backwards-compatible wrapper for the old `CmsActionMenu` API.
 *
 * Kept so existing call sites (heroes/articles/loadouts/inventory) keep working
 * while now getting portal rendering, viewport-aware positioning, and full
 * keyboard support. `items` here are always plain actionable rows.
 */
export function CmsActionMenu(props: {
  label?: string | undefined;
  items: Array<{
    label: React.ReactNode;
    onSelect: () => void;
    danger?: boolean | undefined;
    disabled?: boolean | undefined;
  }>;
}) {
  return (
    <CmsMenu
      label={props.label ?? "Row actions"}
      items={props.items.map((item) => ({
        label: item.label,
        onSelect: item.onSelect,
        danger: item.danger,
        disabled: item.disabled,
      }))}
    />
  );
}
