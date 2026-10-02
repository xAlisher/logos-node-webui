// ViewStub — the shared P1 placeholder body: a view title + a "built in P2" chip,
// optionally preceded by the shell's node-off notice for node-dependent views.
// Replaced screen-by-screen as the P2 agents implement each view against the spec.

import type { ReactNode } from "react";

import { NodeOffNotice, type NoticeSeverity } from "../shell/NodeOffNotice";

export interface ViewStubProps {
  /** Slug used for the test id (view-<id>). */
  id: string;
  /** Visible view title. */
  title: string;
  /** When provided, renders the single node-off notice at the top. */
  nodeOffReason?: string;
  nodeOffSeverity?: NoticeSeverity;
  children?: ReactNode;
}

export function ViewStub({
  id,
  title,
  nodeOffReason,
  nodeOffSeverity = "info",
  children,
}: ViewStubProps) {
  return (
    <section className="view-stub" data-testid={`view-${id}`}>
      {nodeOffReason !== undefined && (
        <NodeOffNotice reason={nodeOffReason} severity={nodeOffSeverity} />
      )}
      <h2 className="view-stub-title">{title}</h2>
      <p className="view-stub-placeholder">built in P2</p>
      {children}
    </section>
  );
}
