import { useState } from "react";
import type { ReactNode } from "react";
import "./Tooltip.css";

export interface TooltipProps {
  /** The bubble text. */
  label: ReactNode;
  children: ReactNode;
  className?: string;
}

/**
 * LogosToolTip. --background-secondary bubble, 4px radius, 2px/6px padding;
 * text 12px/700 at 60% white. Shown on hover/focus of the wrapped trigger.
 * See docs/spec §Tooltip.
 */
export function Tooltip({ label, children, className }: TooltipProps) {
  const [show, setShow] = useState(false);
  return (
    <span
      className={["ds-tooltip", className].filter(Boolean).join(" ")}
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
      onFocus={() => setShow(true)}
      onBlur={() => setShow(false)}
    >
      {children}
      {show && (
        <span className="ds-tooltip__bubble" role="tooltip">
          {label}
        </span>
      )}
    </span>
  );
}
