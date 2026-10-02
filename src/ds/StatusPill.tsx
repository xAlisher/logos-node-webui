import type { CSSProperties } from "react";
import "./StatusPill.css";

export type NodeStatus =
  | "online"
  | "bootstrapping"
  | "starting"
  | "offline"
  | "error";

const STATUS_COLOR: Record<NodeStatus, string> = {
  online: "var(--success)",
  bootstrapping: "var(--primary)",
  starting: "var(--warning)",
  offline: "var(--text-tertiary)",
  error: "var(--error)",
};

export interface StatusPillProps {
  status: NodeStatus;
  /** Defaults to the status name. */
  label?: string;
  className?: string;
}

/**
 * Node-UI status pill: a dot + label colored by node state. green online /
 * orange bootstrapping / yellow starting / red error. See docs/spec §Badge
 * (Status pill) and §4.
 */
export function StatusPill({ status, label, className }: StatusPillProps) {
  const style = { "--ds-status-color": STATUS_COLOR[status] } as CSSProperties;
  return (
    <span
      className={["ds-statuspill", className].filter(Boolean).join(" ")}
      data-status={status}
      style={style}
    >
      <span className="ds-statuspill__dot" aria-hidden="true" />
      <span className="ds-statuspill__label">{label ?? status}</span>
    </span>
  );
}
