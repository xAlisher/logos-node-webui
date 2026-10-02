// NodeOffNotice — the single "the node can't answer right now, and here is why" banner,
// replicating controls/NodeOffNotice.qml. Declared unconditionally at the top of every
// node-dependent view; renders nothing when the node is answering (reason === "").
//
// The reason + severity are computed ONCE in the shell (where the real status lives) and
// passed down, so no view re-infers it from a bare boolean.
//
// Self-contained for P1: styled with var(--token) custom properties + a plain element.
// TODO(P2): swap for <LogosNotice> from src/ds once that lands.

export type NoticeSeverity = "info" | "warning" | "error";

export interface NodeOffNoticeProps {
  reason: string;
  severity?: NoticeSeverity;
}

export function NodeOffNotice({ reason, severity = "info" }: NodeOffNoticeProps) {
  if (!reason) return null;
  return (
    <div
      role="status"
      data-testid="node-off-notice"
      data-severity={severity}
      className="node-off-notice"
    >
      {reason}
    </div>
  );
}
