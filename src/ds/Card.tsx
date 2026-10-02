import type { HTMLAttributes } from "react";
import "./Card.css";

export type CardProps = HTMLAttributes<HTMLDivElement>;

/**
 * LogosFrame — the card/surface primitive. --surface fill, 1px --border,
 * 4px radius, 12px padding, no shadow (DS has no elevation tokens).
 * See docs/spec §Card / panel / frame.
 */
export function Card({ className, children, ...rest }: CardProps) {
  return (
    <div className={["ds-card", className].filter(Boolean).join(" ")} {...rest}>
      {children}
    </div>
  );
}
