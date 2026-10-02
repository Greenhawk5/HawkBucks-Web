/**
 * Live result count on the filter/result boundary. Renders the server-reported
 * total only — never an estimate or a fabricated figure. Hidden while the first
 * page is still loading so the number never flickers a stale value.
 */
export function ResultCount({
  count,
  label,
  className,
}: {
  count: number;
  /** Pre-interpolated count string, e.g. "24 Heroes". */
  label: string;
  className?: string;
}) {
  return (
    <p
      className={className}
      role="status"
      aria-live="polite"
      data-testid="result-count"
      data-count={count}
    >
      {label}
    </p>
  );
}
