// The Node Dashboard (issue #5) + the Info dialog wiring (issue #11): a faithful web
// replica of NodeDashboardView.qml. A keys-backup notice, a status hero carrying the
// lifecycle lane, and a responsive grid of metric tiles — each tile (and the hero) with
// an info button that opens the shared InfoDialog, and the copy buttons the QML carries.
//
// Status is live: with no `model` override the view runs useNodeMonitor (polling the
// node read endpoints). Tests drive any of the ~13 hero states by passing a model.

import { useEffect, useMemo, useRef, useState } from "react";

import { registerParity } from "../test/parity";
import { InfoDialog } from "./InfoDialog";
import type { InfoTopic } from "./infoContent";
import {
  computeBlend,
  computeDisplay,
  computeLifecycle,
  fundedBusyLabel,
  LANE_STAGES,
  percentText,
  shorten,
  sizeText,
  TONE_VAR,
  uptimeText,
  walletStage,
} from "./nodeStatus";
import { useCapabilities } from "../deploy/capabilities";
import { defaultDashboardModel, useNodeMonitor, type DashboardModel } from "./nodeMonitor";
import { StageLane } from "./StageLane";
import { StatTile } from "./StatTile";
import type { NodeViewProps } from "./types";
import { compact, format } from "./units";
import "./NodeDashboardView.css";

// Parity — every Dashboard checklist id (status hero + its ~13 states, the lifecycle
// lane, the 15 metric tiles, the keys banner, and the per-tile info/copy actions).
registerParity([
  "dash-keys-backup-banner",
  "dash-keys-backup-dismiss",
  "dash-status-hero",
  "dash-status-hero-dots",
  "dash-status-info-button",
  "dash-uptime",
  "dash-state-not-started",
  "dash-state-disconnected",
  "dash-state-node-stopped",
  "dash-state-error",
  "dash-state-stopping",
  "dash-state-bootstrapping",
  "dash-state-bootstrapping-genesis",
  "dash-state-bootstrapping-stalled",
  "dash-state-starting",
  "dash-state-online",
  "dash-state-online-stream-ended",
  "dash-state-stale-poll",
  "dash-lifecycle-lane",
  "dash-tiles-stale-dim",
  "dash-grid-responsive",
  "dash-tile-stake",
  "dash-tile-earned",
  "dash-tile-blend",
  "dash-tile-epoch",
  "dash-tile-ready-to-claim",
  "dash-tile-peers",
  "dash-tile-peer-id",
  "dash-tile-mining-rewards",
  "dash-tile-cpu",
  "dash-tile-ram",
  "dash-tile-disk",
  "dash-tile-slot",
  "dash-tile-height",
  "dash-tile-lib",
  "dash-tile-tip",
  "dash-tile-info-buttons",
  "dash-tile-copy-buttons",
]);

const DASH = "—";

function plural(n: number, singular: string): string {
  return `${n} ${singular}${n === 1 ? "" : "s"}`;
}

function countingSinceText(iso: string): string {
  if (iso.length === 0) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return `since ${d.toLocaleDateString()}`;
}

export interface NodeDashboardViewProps extends Partial<NodeViewProps> {
  /** Drive the dashboard from an explicit model (tests / storybook); omit to poll live. */
  model?: Partial<DashboardModel>;
}

export function NodeDashboardView({ model: override }: NodeDashboardViewProps) {
  const caps = useCapabilities();
  // Live poller — disabled when a model override is supplied so tests stay deterministic.
  const live = useNodeMonitor({ enabled: override === undefined });
  const m: DashboardModel = useMemo(
    () => (override === undefined ? live : { ...defaultDashboardModel(), ...override }),
    [override, live],
  );

  const [openTopic, setOpenTopic] = useState<InfoTopic | null>(null);
  const [keysDismissed, setKeysDismissed] = useState(false);

  // Wallet-lane high-water mark (holds at its best; stake going away pulls it down).
  const [walletHighWater, setWalletHighWater] = useState(2);
  const running = m.status === 2; // BackendStatus.Running
  const stage = walletStage(m);
  const stakeReportedGone = running && m.stakeTotal.length > 0 && m.stakeNoteCount === 0;
  const hwRef = useRef(walletHighWater);
  hwRef.current = walletHighWater;
  useEffect(() => {
    if (stakeReportedGone && stage < hwRef.current) setWalletHighWater(stage);
    else if (stage > hwRef.current) setWalletHighWater(stage);
  }, [stage, stakeReportedGone]);

  const display = computeDisplay(m);
  const lifecycle = computeLifecycle(m, walletHighWater);
  const blend = computeBlend(m.blendRole);
  const onInfo = (topic: InfoTopic) => setOpenTopic(topic);

  const showUptime = m.connected && m.uptimeSeconds > 0;
  const dim = m.statusStale;

  // ---- Tile captions / values (ported from the QML `d` helpers) ----
  const stakeCaption = (() => {
    if (m.stakeTotal.length === 0) return "";
    if (m.stakeNoteCount === 0) return "Nothing has aged yet";
    const parts: string[] = [];
    if (m.stakeAddresses.length === 1) parts.push(shorten(m.stakeAddresses[0]));
    parts.push(plural(m.stakeNoteCount, "note"));
    if (m.stakeAddresses.length > 1) parts.push(plural(m.stakeAddresses.length, "key"));
    return parts.join(" · ");
  })();

  const earnedCaption = (() => {
    if (m.earnedTotal.length === 0) return "";
    if (m.earnedClaimCount === 0) return "No rewards claimed yet";
    const parts = [plural(m.earnedClaimCount, "voucher")];
    const since = countingSinceText(m.claimsCountingSince);
    if (since.length > 0) parts.push(since);
    return parts.join(" · ");
  })();

  const voucherCaption =
    m.voucherCount > 0 && m.voucherTotalClaimable.length > 0
      ? `≈${compact(m.voucherTotalClaimable)} before fees`
      : "";

  const miningCaption = (() => {
    if (m.miningError.length > 0) return m.miningError;
    const { powClaimsSubmitted: s, powClaimsPending: p, claimableTickets: t, powRewardsClaimed: c } = m;
    if (s > 0 && p > 0) return `${s} sent · ${p} settling`;
    if (p > 0) return t > 0 ? `${p} settling · ${t} waiting` : plural(p, "claim") + " settling";
    if (s > 0) return t > 0 ? `${s} sent · ${t} waiting` : `${s} sent, not seen yet`;
    if (t > 0) return `${c} claimed · ${t} waiting`;
    if (c > 0) {
      const parts = [plural(c, "ticket")];
      const since = countingSinceText(m.claimsCountingSince);
      if (since.length > 0) parts.push(since);
      return parts.join(" · ");
    }
    return m.miningActive ? "no tickets claimed" : "";
  })();

  const cpuSampled = m.nodeCpuPercent >= 0;
  const cpuMachineShare = Math.min(100, m.nodeCpuPercent / Math.max(1, m.cpuCount));
  const cpuCaption = !cpuSampled
    ? ""
    : m.cpuCount === 1
      ? `${percentText(cpuMachineShare)} of 1 core`
      : `${percentText(cpuMachineShare)} of ${m.cpuCount} cores`;

  const diskCritical = m.nodeDiskFreeMb >= 0 && m.nodeDiskFreeMb < 2048;
  const diskLow = m.nodeDiskFreeMb >= 0 && m.nodeDiskFreeMb < 5120;
  const diskColor = diskCritical ? "var(--error)" : diskLow ? "var(--warning)" : undefined;

  const showKeysBanner = m.keystorePresent && !m.keysBackedUp && !keysDismissed;

  const subClass = display.isError ? "dashboard__hero-sub--error" : "dashboard__hero-sub--muted";

  return (
    <section className="dashboard" data-testid="view-node-dashboard">
      {/* ---- Back up your keys ---- */}
      {showKeysBanner && (
        <div className="dashboard__keys-banner" role="alert" data-testid="keys-backup-banner">
          <div className="dashboard__keys-banner-body">
            <span className="dashboard__keys-banner-title">Back up your keys</span>
            <span className="dashboard__keys-banner-message">
              Your keystore has not been saved anywhere else. Nothing can reissue these keys, and
              the rewards this node earns are only reachable with them. Settings → Back up your keys
              has the download.
            </span>
          </div>
          <button
            type="button"
            className="dashboard__keys-banner-dismiss"
            aria-label="Dismiss"
            onClick={() => setKeysDismissed(true)}
          >
            ✕
          </button>
        </div>
      )}

      {/* ---- Status hero + lifecycle lane ---- */}
      <div className="dashboard__hero" data-testid="status-hero">
        <div className="dashboard__hero-top">
          <div className="dashboard__hero-headline">
            <span
              className="dashboard__hero-label"
              data-testid="hero-label"
              style={{ color: TONE_VAR[display.tone] }}
            >
              {display.label}
            </span>
            {display.dots && (
              <span className="dashboard__hero-dots" data-testid="hero-dots" aria-hidden="true" style={{ color: TONE_VAR[display.tone] }}>
                <span>.</span>
                <span>.</span>
                <span>.</span>
              </span>
            )}
          </div>

          <div className="dashboard__hero-spacer" />

          <div className="dashboard__hero-side">
            {showUptime && (
              <span className="dashboard__hero-uptime" data-testid="hero-uptime">
                Uptime: {uptimeText(m.uptimeSeconds)}
              </span>
            )}
            {display.sub.length > 0 && (
              <span className={`dashboard__hero-sub ${subClass}`} data-testid="hero-sub">
                {display.sub}
              </span>
            )}
          </div>

          <button
            type="button"
            className="dashboard__hero-info"
            aria-label="Status info"
            title="Status info"
            data-testid="status-info-button"
            onClick={() => onInfo("status")}
          >
            i
          </button>
        </div>

        <StageLane
          stages={LANE_STAGES.map((label, i) => ({
            label,
            busyLabel:
              i === 0
                ? "Starting"
                : i === 1
                  ? "Syncing…"
                  : i === 2
                    ? fundedBusyLabel(m.miningActive)
                    : i === 3
                      ? "Aging"
                      : i === 4
                        ? "Waiting for a slot"
                        : undefined,
          }))}
          currentIndex={lifecycle.currentIndex}
          busy={lifecycle.busy}
          failed={lifecycle.failed}
        />
      </div>

      {/* ---- Metric grid ---- */}
      <div className="dashboard__grid" data-testid="metric-grid" data-responsive="1-4">
        <StatTile
          testId="tile-stake"
          label="Stake"
          topic="stake"
          onInfo={onInfo}
          value={m.stakeTotal.length > 0 ? format(m.stakeTotal) : DASH}
          caption={stakeCaption}
          copyCaption={m.stakeAddresses.length === 1 ? m.stakeAddresses[0] : undefined}
        />
        <StatTile
          testId="tile-earned"
          label="Earned"
          topic="earned"
          onInfo={onInfo}
          value={m.earnedTotal.length > 0 ? format(m.earnedTotal) : DASH}
          caption={earnedCaption}
        />
        <StatTile
          testId="tile-blend"
          label="Blend"
          topic="blend"
          onInfo={onInfo}
          value={blend.label}
          valueColorVar={blend.colorVar}
          caption={blend.caption}
        />
        <StatTile
          testId="tile-epoch"
          label="Epoch"
          topic="epoch"
          onInfo={onInfo}
          value={m.epoch}
        />
        <StatTile
          testId="tile-ready-to-claim"
          label="Ready to Claim"
          topic="readyToClaim"
          onInfo={onInfo}
          value={m.voucherCount >= 0 ? String(m.voucherCount) : DASH}
          caption={voucherCaption}
        />
        <StatTile
          testId="tile-peers"
          label="Peers"
          topic="peers"
          onInfo={onInfo}
          dim={dim}
          value={m.peerCount >= 0 ? String(m.peerCount) : DASH}
          valueColorVar={m.peerCount === 0 ? "var(--error)" : undefined}
          caption={m.connectionCount >= 0 ? plural(m.connectionCount, "connection") : ""}
        />
        <StatTile
          testId="tile-peer-id"
          label="Peer ID"
          topic="peerId"
          onInfo={onInfo}
          value={shorten(m.peerId)}
          copyCaption={m.peerId || undefined}
        />
        <StatTile
          testId="tile-mining-rewards"
          label="Mining Rewards"
          topic="mining"
          onInfo={onInfo}
          warning={m.miningError.length > 0}
          value={m.powRewardsLepta.length > 0 ? compact(m.powRewardsLepta) : compact("0")}
          caption={miningCaption}
          activeDot={m.powActive}
        />
        {/* CPU / RAM / Disk are sampled by the native backend and not exposed over
            HTTP — hidden in the web build (they would be permanent em-dashes). */}
        {caps.resourceSampling && (
          <>
            <StatTile
              testId="tile-cpu"
              label="CPU"
              topic="cpu"
              onInfo={onInfo}
              dim={dim}
              value={cpuSampled ? percentText(m.nodeCpuPercent) : DASH}
              caption={cpuCaption}
            />
            <StatTile
              testId="tile-ram"
              label="RAM"
              topic="ram"
              onInfo={onInfo}
              dim={dim}
              value={m.nodeMemoryMb >= 0 ? sizeText(m.nodeMemoryMb) : DASH}
            />
            <StatTile
              testId="tile-disk"
              label="Disk"
              topic="disk"
              onInfo={onInfo}
              value={m.nodeDiskUsedMb >= 0 ? sizeText(m.nodeDiskUsedMb) : DASH}
              valueColorVar={diskColor}
              caption={m.nodeDiskFreeMb >= 0 ? `${sizeText(m.nodeDiskFreeMb)} free` : ""}
            />
          </>
        )}
        <StatTile
          testId="tile-slot"
          label="Slot"
          topic="slot"
          onInfo={onInfo}
          dim={dim}
          value={m.slot.length > 0 ? m.slot : DASH}
          copyCaption={m.slot || undefined}
        />
        <StatTile
          testId="tile-height"
          label="Height"
          topic="height"
          onInfo={onInfo}
          dim={dim}
          value={m.heightValue.length > 0 ? m.heightValue : DASH}
          copyCaption={m.heightValue || undefined}
        />
        <StatTile
          testId="tile-lib"
          label="LiB"
          topic="lib"
          onInfo={onInfo}
          dim={dim}
          value={shorten(m.lib)}
          caption={m.libSlot.length > 0 ? `slot ${m.libSlot}` : ""}
          copyValue={m.lib || undefined}
          copyCaption={m.libSlot || undefined}
        />
        <StatTile
          testId="tile-tip"
          label="TiP"
          topic="tip"
          onInfo={onInfo}
          dim={dim}
          value={shorten(m.tip)}
          copyCaption={m.tip || undefined}
        />
      </div>

      <InfoDialog topic={openTopic} onClose={() => setOpenTopic(null)} />
    </section>
  );
}
