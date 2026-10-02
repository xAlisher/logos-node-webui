import { describe, expect, test } from "vitest";

import {
  BackendStatus,
  canStart,
  canStop,
  claimablePollActive,
  computeNodeOff,
  ConfigState,
  currentPage,
  defaultShellModel,
  fundEnabled,
  isConnecting,
  isNodeBusy,
  isStopping,
  liveDefaultModel,
  needsSetup,
  startTriggersUpgrade,
  voucherGateOpen,
  type ShellModel,
} from "./shellState";

function m(over: Partial<ShellModel> = {}): ShellModel {
  return { ...liveDefaultModel(), ...over };
}

describe("shell routing", () => {
  test("not ready → connecting, page 0", () => {
    const model = m({ ready: false });
    expect(isConnecting(model)).toBe(true);
    expect(currentPage(model)).toBe(0);
  });

  test("ready + config + setup closed → node page (1)", () => {
    expect(currentPage(m())).toBe(1);
    expect(isConnecting(m())).toBe(false);
  });

  test("ready but no config → onboarding (0) and needsSetup", () => {
    const model = m({ hasConfig: false });
    expect(needsSetup(model)).toBe(true);
    expect(currentPage(model)).toBe(0);
  });

  test("setup open routes to onboarding even with a config", () => {
    expect(currentPage(m({ setupOpen: true }))).toBe(0);
  });

  test("needsSetup is re-armable: false with a config, true once it disappears", () => {
    expect(needsSetup(m())).toBe(false);
    expect(needsSetup(m({ hasConfig: false }))).toBe(true);
  });
});

describe("header run-button gating", () => {
  test("canStart on NotStarted/Stopped (with config), not while Running", () => {
    expect(canStart(m({ status: BackendStatus.NotStarted }))).toBe(true);
    expect(canStart(m({ status: BackendStatus.Stopped }))).toBe(true);
    expect(canStart(m({ status: BackendStatus.Running }))).toBe(false);
    expect(canStart(m({ status: BackendStatus.NotStarted, hasConfig: false }))).toBe(false);
  });

  test("canStart on Error only when the module is unreachable", () => {
    expect(canStart(m({ status: BackendStatus.Error, moduleReachable: false }))).toBe(true);
    expect(canStart(m({ status: BackendStatus.Error, moduleReachable: true }))).toBe(false);
  });

  test("canStop on Running/Starting/Error while reachable; Starting abortable", () => {
    expect(canStop(m({ status: BackendStatus.Running }))).toBe(true);
    expect(canStop(m({ status: BackendStatus.Starting }))).toBe(true);
    expect(canStop(m({ status: BackendStatus.Error }))).toBe(true);
    expect(canStop(m({ status: BackendStatus.Running, moduleReachable: false }))).toBe(false);
    expect(canStop(m({ status: BackendStatus.NotStarted }))).toBe(false);
  });

  test("isStopping only in Stopping", () => {
    expect(isStopping(m({ status: BackendStatus.Stopping }))).toBe(true);
    expect(isStopping(m({ status: BackendStatus.Running }))).toBe(false);
  });

  test("start with a stale/unreadable config triggers the upgrade dialog", () => {
    expect(startTriggersUpgrade(m({ configState: ConfigState.Stale }))).toBe(true);
    expect(startTriggersUpgrade(m({ configState: ConfigState.Unreadable }))).toBe(true);
    expect(startTriggersUpgrade(m({ configState: ConfigState.Ok }))).toBe(false);
  });
});

describe("fund-button gating", () => {
  test("enabled only when running AND (mining OR synced)", () => {
    expect(fundEnabled(m({ status: BackendStatus.Running, synced: true }))).toBe(true);
    expect(fundEnabled(m({ status: BackendStatus.Running, miningActive: true, synced: false }))).toBe(true);
    expect(fundEnabled(m({ status: BackendStatus.Running, synced: false }))).toBe(false);
    expect(fundEnabled(m({ status: BackendStatus.NotStarted, synced: true }))).toBe(false);
  });
});

describe("node-off reason/severity", () => {
  test("not ready → connecting reason", () => {
    expect(computeNodeOff(m({ ready: false })).reason).toMatch(/Connecting/);
  });

  test("module unreachable → error severity", () => {
    const off = computeNodeOff(m({ moduleReachable: false }));
    expect(off.reason).toMatch(/stopped responding/);
    expect(off.severity).toBe("error");
  });

  test("stale config is info, unreadable is error", () => {
    expect(computeNodeOff(m({ configState: ConfigState.Stale })).severity).toBe("info");
    expect(computeNodeOff(m({ configState: ConfigState.Unreadable })).severity).toBe("error");
  });

  test("running + synced → empty reason (node answering)", () => {
    expect(computeNodeOff(m({ status: BackendStatus.Running, synced: true })).reason).toBe("");
  });

  test("running + not synced → catching up (info)", () => {
    const off = computeNodeOff(m({ status: BackendStatus.Running, synced: false }));
    expect(off.reason).toMatch(/catching up/);
    expect(off.severity).toBe("info");
  });

  test("error status → error severity, Node-tab guidance", () => {
    const off = computeNodeOff(m({ status: BackendStatus.Error }));
    expect(off.severity).toBe("error");
    expect(off.reason).toMatch(/Node tab/);
  });

  test("not-started → start-from-the-Node-tab", () => {
    expect(computeNodeOff(m({ status: BackendStatus.NotStarted })).reason).toMatch(/Start the node/);
  });
});

describe("claimable poll gating + voucher gate + shutdown", () => {
  test("claimable poll active only while running AND the Mining tab is open", () => {
    const running = m({ status: BackendStatus.Running });
    expect(claimablePollActive(running, "mining")).toBe(true);
    expect(claimablePollActive(running, "node")).toBe(false);
    expect(claimablePollActive(m({ status: BackendStatus.NotStarted }), "mining")).toBe(false);
  });

  test("voucher gate open only when running AND online", () => {
    expect(voucherGateOpen(m({ status: BackendStatus.Running, synced: true }))).toBe(true);
    expect(voucherGateOpen(m({ status: BackendStatus.Running, synced: false }))).toBe(false);
    expect(voucherGateOpen(m({ status: BackendStatus.NotStarted, synced: true }))).toBe(false);
  });

  test("node busy in Running/Starting/Stopping (graceful-shutdown veto set)", () => {
    expect(isNodeBusy(m({ status: BackendStatus.Running }))).toBe(true);
    expect(isNodeBusy(m({ status: BackendStatus.Starting }))).toBe(true);
    expect(isNodeBusy(m({ status: BackendStatus.Stopping }))).toBe(true);
    expect(isNodeBusy(m({ status: BackendStatus.Stopped }))).toBe(false);
  });

  test("defaultShellModel is the not-connected launch state", () => {
    const d = defaultShellModel();
    expect(d.ready).toBe(false);
    expect(isConnecting(d)).toBe(true);
  });
});
