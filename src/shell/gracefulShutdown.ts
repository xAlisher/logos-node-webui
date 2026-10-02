// useGracefulShutdown — a web port of BlockchainView.qml's graceful-shutdown
// Connections: closing the window while the node is busy (Running/Starting/Stopping)
// vetoes the close, stops the node, and closes once it has actually stopped. On the
// web the "veto" is a beforeunload prompt; the stop + deferred close are the same.
//
// The logic is exposed as `requestClose()` so it can be unit-tested without a real
// window event, and an effect fires `closeWindow()` once the node leaves the busy
// set while a quit is pending. (shell-graceful-shutdown)

import { useCallback, useEffect, useRef, useState } from "react";

import { isNodeBusy, type ShellModel } from "./shellState";

export interface GracefulShutdownDeps {
  /** Stop the node (the mutation the veto triggers). */
  stopNode: () => void;
  /** Actually close the window once the node has stopped. */
  closeWindow: () => void;
}

export interface GracefulShutdown {
  /** Whether a quit is pending (close vetoed, waiting for the node to stop). */
  quitting: boolean;
  /**
   * Handle a close request. Returns true if the close was vetoed (node busy → the
   * caller should prevent the unload), false if it is safe to close now.
   */
  requestClose: () => boolean;
}

export function useGracefulShutdown(
  model: ShellModel,
  deps: GracefulShutdownDeps,
  /**
   * Whether the graceful-shutdown veto is active. Native builds manage the node
   * subprocess, so closing the window must stop it first (true). The web build has
   * no node lifecycle — closing a browser tab leaves the containerised node
   * running — so the beforeunload prompt is just a nuisance and is disabled (false).
   * (default true)
   */
  enabled = true,
): GracefulShutdown {
  const [quitting, setQuitting] = useState(false);
  const quittingRef = useRef(false);
  quittingRef.current = quitting;
  const depsRef = useRef(deps);
  depsRef.current = deps;

  const requestClose = useCallback((): boolean => {
    if (!quittingRef.current && isNodeBusy(model)) {
      setQuitting(true);
      depsRef.current.stopNode();
      return true; // vetoed — the node is being stopped first
    }
    return false; // nothing busy — safe to close
  }, [model]);

  // Once the node leaves the busy set while a quit is pending, close for real.
  useEffect(() => {
    if (quitting && !isNodeBusy(model)) depsRef.current.closeWindow();
  }, [quitting, model]);

  // Wire the browser beforeunload so a real close while busy prompts (the web veto).
  // Skipped where there is no node lifecycle to protect (web build).
  useEffect(() => {
    if (!enabled || typeof window === "undefined") return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (requestClose()) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [requestClose, enabled]);

  return { quitting, requestClose };
}
