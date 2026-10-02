import { render } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";

import { useGracefulShutdown } from "./gracefulShutdown";
import { BackendStatus, liveDefaultModel, type ShellModel } from "./shellState";

function Probe({
  model,
  stopNode,
  closeWindow,
  onReady,
}: {
  model: ShellModel;
  stopNode: () => void;
  closeWindow: () => void;
  onReady: (requestClose: () => boolean) => void;
}) {
  const { requestClose } = useGracefulShutdown(model, { stopNode, closeWindow });
  onReady(requestClose);
  return null;
}

function m(over: Partial<ShellModel> = {}): ShellModel {
  return { ...liveDefaultModel(), ...over };
}

describe("useGracefulShutdown (shell-graceful-shutdown)", () => {
  test("closing with an idle node closes immediately (no veto)", () => {
    const stopNode = vi.fn();
    const closeWindow = vi.fn();
    let requestClose!: () => boolean;
    render(
      <Probe
        model={m({ status: BackendStatus.NotStarted })}
        stopNode={stopNode}
        closeWindow={closeWindow}
        onReady={(rc) => (requestClose = rc)}
      />,
    );
    expect(requestClose()).toBe(false);
    expect(stopNode).not.toHaveBeenCalled();
  });

  test("closing while busy vetoes and stops the node, then closes once stopped", () => {
    const stopNode = vi.fn();
    const closeWindow = vi.fn();
    let requestClose!: () => boolean;
    const { rerender } = render(
      <Probe
        model={m({ status: BackendStatus.Running })}
        stopNode={stopNode}
        closeWindow={closeWindow}
        onReady={(rc) => (requestClose = rc)}
      />,
    );

    // Busy → close is vetoed and the node is told to stop.
    expect(requestClose()).toBe(true);
    expect(stopNode).toHaveBeenCalledTimes(1);
    expect(closeWindow).not.toHaveBeenCalled();

    // Node moves Running → Stopping (still busy): still no close.
    rerender(
      <Probe
        model={m({ status: BackendStatus.Stopping })}
        stopNode={stopNode}
        closeWindow={closeWindow}
        onReady={(rc) => (requestClose = rc)}
      />,
    );
    expect(closeWindow).not.toHaveBeenCalled();

    // Node reaches Stopped while quitting → close for real.
    rerender(
      <Probe
        model={m({ status: BackendStatus.Stopped })}
        stopNode={stopNode}
        closeWindow={closeWindow}
        onReady={(rc) => (requestClose = rc)}
      />,
    );
    expect(closeWindow).toHaveBeenCalledTimes(1);
  });
});
