import "./Progress.css";

export interface ProgressProps {
  /** Current value (0..max). Ignored when indeterminate. */
  value?: number;
  max?: number;
  indeterminate?: boolean;
  className?: string;
}

/**
 * LogosProgressBar. 8px tall, --background-secondary track, --primary fill,
 * 4px radius. Indeterminate = a 30%-wide bar sliding across. See docs/spec
 * §Progress bar.
 */
export function Progress({
  value = 0,
  max = 100,
  indeterminate = false,
  className,
}: ProgressProps) {
  const pct = max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0;
  return (
    <div
      className={[
        "ds-progress",
        indeterminate && "ds-progress--indeterminate",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={indeterminate ? undefined : Math.round(pct)}
    >
      <div
        className="ds-progress__fill"
        style={indeterminate ? undefined : { width: `${pct}%` }}
      />
    </div>
  );
}
