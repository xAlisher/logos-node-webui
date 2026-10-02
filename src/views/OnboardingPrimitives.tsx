import { useState } from "react";

import { Button, CopyButton, Modal } from "../ds";
import type { NoticeSeverity } from "../shell/NodeOffNotice";
import "./onboarding.css";

export interface OnboardingNoticeProps {
  shown: boolean;
  severity: NoticeSeverity | "success";
  title: string;
  message?: string;
  /** When true, append a CopyButton for the message (error notices). */
  copyable?: boolean;
  "data-testid"?: string;
}

/**
 * LogosNotice replica used across the wizard: a severity-bordered block with a
 * title, an optional message, and (for errors) a copy action.
 */
export function OnboardingNotice({
  shown,
  severity,
  title,
  message,
  copyable,
  "data-testid": testId,
}: OnboardingNoticeProps) {
  if (!shown) return null;
  return (
    <div
      role={severity === "error" ? "alert" : "status"}
      data-testid={testId}
      data-severity={severity}
      className={`onboarding-notice onboarding-notice--${severity}`}
    >
      <div className="onboarding-notice__body">
        <p className="onboarding-notice__title">{title}</p>
        {message && <p className="onboarding-notice__message">{message}</p>}
      </div>
      {copyable && message ? <CopyButton value={message} title="Copy error" /> : null}
    </div>
  );
}

const INFO_CONTENT: Record<string, string> = {
  bootstrapPeers:
    "Bootstrap peers are the nodes yours dials on start to find the chain. " +
    "One multiaddr per line. The deployment config does not provide them, so at " +
    "least one is required.",
  powAutoClaimTargets:
    "Auto-claim targets are the accounts the node pays mined rewards into. The " +
    "threshold is the balance an account should reach — not an amount to pay. " +
    "Once an account is at or above it, the node stops paying that one.",
  powSearchThreads:
    "How many CPU threads the miner searches with. Auto lets the node choose.",
  powTicketsPerBlock:
    "How many mining tickets the node keeps in flight per block. A whole number ≥ 1.",
  powClaimPeriod:
    "How often, in seconds, the node attempts to claim mined tickets. A whole number ≥ 1.",
};

export interface OnboardingInfoButtonProps {
  topic: keyof typeof INFO_CONTENT | string;
  title: string;
  "data-testid"?: string;
}

/**
 * LogosInfoButton replica — a small "i" that opens a Modal with the topic's
 * explanation (views/InfoSections.qml / infoContent.js, condensed).
 */
export function OnboardingInfoButton({
  topic,
  title,
  "data-testid": testId,
}: OnboardingInfoButtonProps) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        className="onboarding-info-button"
        aria-label={`About ${title}`}
        title={title}
        onClick={() => setOpen(true)}
        data-testid={testId}
      >
        i
      </button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={title}
        footer={
          <Button onClick={() => setOpen(false)}>Close</Button>
        }
      >
        <p>{INFO_CONTENT[topic] ?? title}</p>
      </Modal>
    </>
  );
}
