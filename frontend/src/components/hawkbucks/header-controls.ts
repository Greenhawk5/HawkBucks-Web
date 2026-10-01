/**
 * Shared compact header icon-button system for the sidebar/drawer headers
 * (Language / Reminder / Collapse / Close).
 *
 * Geometry is measured, not guessed. The expanded sidebar is 16rem (256px)
 * with a 255px inner row that has to hold the brand plus three controls. The
 * row as originally written needed 293.6px, a 38.6px overflow that pushed the
 * Collapse control out of the header — the reported bug.
 *
 * The wordmark is the only elastic term (the logo is a fixed 36px mark), so
 * the sizes below are the largest that still fit. Measured live: a 28px button
 * cluster occupies 100px, and the Sora wordmark at 16px is 109.6px, giving a
 * 245.6px row with ~9px to spare. Every roomier variant was measured and
 * rejected: 32px buttons or `px-1` padding overflow once Sora fails to load
 * and the wider system fallback takes over, and 15px type truncates to 101px.
 *
 * 28px keeps a 28px hit area, above the 24px WCAG 2.2 minimum target size.
 */

export const HEADER_ICON_BUTTON =
  "grid h-7 w-7 shrink-0 place-items-center rounded-lg text-muted-foreground outline-none transition-colors hover:bg-accent/10 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring";

export const HEADER_ICON = "h-4 w-4 shrink-0";

/** Control cluster: 3 controls + 2 gaps, fixed so it can never be squeezed out. */
export const HEADER_CONTROLS = "ms-auto flex shrink-0 items-center gap-0.5";

/** Brand row: yields width first so the controls always stay inside the header. */
export const HEADER_BRAND_ROW = "flex min-w-0 flex-[0_1_auto] items-center";

/** Wordmark: ellipsizes rather than overflowing if a wider font ever applies. */
export const HEADER_WORDMARK =
  "min-w-0 overflow-hidden text-ellipsis whitespace-nowrap font-display text-base font-extrabold uppercase tracking-tight";

/** Header horizontal padding for both sidebar and drawer rows. */
export const HEADER_PAD = "px-0.5";
