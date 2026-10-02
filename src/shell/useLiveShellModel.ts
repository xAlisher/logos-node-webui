// useLiveShellModel — the production wiring the P3 note called for: derive the
// shell's backend model from the live node, instead of leaving it at the
// never-connected default (which made the header show "Start Node" and every
// node-dependent view show "Start the node from the Node tab" even while the node
// was Online).
//
// It reuses the dashboard's NodeStatusMonitor so the header and the Node hero read
// one source of truth. HTTP-only deployment facts: the node always has a config and
// runs itself (no start/stop endpoint), so hasConfig is true and configState is Ok;
// `ready` stays false until first contact so the Connecting state is honest.

import { useNodeMonitor } from "../views/nodeMonitor";
import { ConfigState, type ShellModel } from "./shellState";

export function useLiveShellModel(): Partial<ShellModel> {
  const m = useNodeMonitor({ intervalMs: 2000 });
  return {
    // Connecting… until the node answers once; then sticky (a later drop shows the
    // stale state, not Connecting).
    ready: m.everConnected,
    everReady: m.everConnected,
    // The containerised node always has a config and manages its own lifecycle.
    hasConfig: true,
    configState: ConfigState.Ok,
    status: m.status,
    moduleReachable: m.moduleReachable,
    synced: m.synced,
    miningActive: m.miningActive,
  };
}
