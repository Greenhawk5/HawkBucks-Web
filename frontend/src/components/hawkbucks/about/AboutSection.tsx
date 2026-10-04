import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Anchor offset for every About section.
 *
 * The public shell pins `TopNavbar` with `sticky top-0` at `h-16` (4rem) plus
 * its 1px bottom border, so a section scrolled to the very top of the viewport
 * lands UNDER the navbar and its heading is clipped. `scroll-mt-24` (6rem)
 * reserves that 4rem bar plus 2rem of breathing room, and it is the SAME offset
 * the index rail already uses (`sticky top-24`), so the rail and the sections
 * stay visually aligned.
 *
 * `scroll-mt-*` (not `scroll-mt` inline math) is deliberate: it is declarative,
 * works for native anchor jumps AND programmatic `scrollIntoView`, needs no JS
 * measurement, and is responsive on its own because the navbar height is a
 * fixed `h-16` at every breakpoint.
 */
export const ABOUT_SECTION_ANCHOR_CLASS = "scroll-mt-24";

/**
 * The same 6rem offset in pixels, for APIs that cannot take a class
 * (`IntersectionObserver` rootMargin). Kept adjacent to the class above so the
 * two can never drift apart.
 */
export const ABOUT_SECTION_ANCHOR_PX = 96;

/**
 * Section primitive for the About page.
 *
 * Every About section shares one construction: a hairline top rule, an
 * optional kicker, the heading, and the body. The rule is the only ornament —
 * it separates sections the way an index page separates entries, so the page
 * never needs a card, a glow or a decorative number to stay readable.
 */
export function AboutSection({
  id,
  kicker,
  title,
  children,
  className,
}: {
  id: string;
  kicker?: string;
  title: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      id={id}
      aria-labelledby={`${id}-heading`}
      className={cn(ABOUT_SECTION_ANCHOR_CLASS, className)}
    >
      <div className="border-t border-border/60 pt-8">
        {kicker ? (
          <p className="font-display text-[11px] font-bold uppercase tracking-[0.2em] text-primary">
            {kicker}
          </p>
        ) : null}
        <h2
          id={`${id}-heading`}
          className="mt-2 font-display text-2xl font-extrabold tracking-tight sm:text-[1.75rem]"
        >
          {title}
        </h2>
        {children}
      </div>
    </section>
  );
}

/**
 * Body copy at the project's readable measure (under ~80 characters). Long
 * localized strings wrap here rather than being truncated, so German, Arabic
 * and Persian all stay fully readable.
 */
export function AboutProse({ children }: { children: ReactNode }) {
  return (
    <div className="mt-5 space-y-4 text-[15px] leading-7 text-muted-foreground">{children}</div>
  );
}
