import type { ReactNode } from "react";

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
    <section id={id} aria-labelledby={`${id}-heading`} className={className}>
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
