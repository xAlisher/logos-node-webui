import type { ReactNode } from "react";
import { Card } from "./Card";
import { Tooltip } from "./Tooltip";
import "./StatCard.css";

export interface StatCardProps {
  /** The big headline value. */
  value: ReactNode;
  /** The caption beneath the divider. */
  label: ReactNode;
  /** Optional explanatory text surfaced via an "i" tooltip. */
  info?: ReactNode;
  className?: string;
}

/**
 * Node-UI StatCard: big value -> divider -> label -> optional info "i".
 * Composed from LogosFrame (Card) + text tokens. See docs/spec §4.
 */
export function StatCard({ value, label, info, className }: StatCardProps) {
  return (
    <Card className={["ds-statcard", className].filter(Boolean).join(" ")}>
      <div className="ds-statcard__value">{value}</div>
      <div className="ds-statcard__divider" />
      <div className="ds-statcard__footer">
        <span className="ds-statcard__label">{label}</span>
        {info != null && (
          <Tooltip label={info}>
            <span className="ds-statcard__info" aria-label="More info">
              i
            </span>
          </Tooltip>
        )}
      </div>
    </Card>
  );
}
