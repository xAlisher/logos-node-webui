import type { CSSProperties, HTMLAttributes, ReactNode } from "react";
import "./Badge.css";

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  /** A color token driving text + border; background is this color @ 18%. */
  color?: string;
  /** Optional 12x12 leading icon. */
  icon?: ReactNode;
}

/**
 * LogosBadge. Uppercase 11px/500 label, 4px radius, 1px border. `color` drives
 * text + border, background is that color at 18% alpha. Default accentOrange.
 * See docs/spec §Badge / pill.
 */
export function Badge({
  color = "var(--accent-orange)",
  icon,
  className,
  style,
  children,
  ...rest
}: BadgeProps) {
  const mergedStyle = {
    "--ds-badge-color": color,
    ...style,
  } as CSSProperties;
  return (
    <span
      className={["ds-badge", className].filter(Boolean).join(" ")}
      style={mergedStyle}
      {...rest}
    >
      {icon && <span className="ds-badge__icon">{icon}</span>}
      <span className="ds-badge__label">{children}</span>
    </span>
  );
}
