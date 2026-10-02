// The single info dialog opened by every info button (views/InfoSections.qml), content
// keyed by one of the 29 topics in infoContent.js. Four sections — WHAT IS IT / HOW
// IT'S CALCULATED / STATES / DOCS — each hidden when its field is empty, exactly as
// InfoSections.qml does.

import { CopyButton, Modal } from "../ds";
import { registerParity } from "../test/parity";
import { INFO_CONTENT, type InfoState, type InfoTopic, type InfoTopicContent } from "./infoContent";
import "./InfoDialog.css";

// Parity: the info dialog itself + its copyable docs link. The 29 topics are content
// keyed into this one dialog (dash-status-info-button / dash-tile-info-buttons drive it).
registerParity(["dialog-info-sections", "dialog-info-docs-link"]);

function Section({ heading, text }: { heading: string; text?: string }) {
  if (!text || text.length === 0) return null;
  return (
    <div className="info-section">
      <div className="info-section__heading">{heading}</div>
      <div className="info-section__text">{text}</div>
    </div>
  );
}

function StatesSection({ states }: { states?: InfoState[] }) {
  if (!states || states.length === 0) return null;
  return (
    <div className="info-section">
      <div className="info-section__heading">STATES</div>
      {states.map((s) => (
        <div className="info-state-row" key={s.label}>
          <span className="info-state-row__label">{s.label}</span>
          <span className="info-state-row__meaning">{s.meaning}</span>
        </div>
      ))}
    </div>
  );
}

function DocsSection({ docs }: { docs: string }) {
  if (!docs || docs.length === 0) return null;
  return (
    <div className="info-section">
      <div className="info-section__heading">DOCS</div>
      <div className="info-docs">
        <a
          className="info-docs__link"
          href={docs}
          target="_blank"
          rel="noreferrer"
          title={docs}
          data-testid="info-docs-link"
        >
          {docs}
        </a>
        <CopyButton value={docs} title="Copy docs link" />
      </div>
    </div>
  );
}

/** The four-section body — exported so other views can embed it if needed. */
export function InfoSections({ info }: { info: InfoTopicContent }) {
  return (
    <div className="info-sections" data-testid="info-sections">
      <Section heading="WHAT IS IT" text={info.what} />
      <Section heading="HOW IT'S CALCULATED" text={info.calc} />
      <StatesSection states={info.states} />
      <DocsSection docs={info.docs} />
    </div>
  );
}

export interface InfoDialogProps {
  /** Which topic to show; null/undefined keeps the dialog closed. */
  topic?: InfoTopic | null;
  /** Force-open even without driving `topic` from state (tests). */
  open?: boolean;
  onClose?: () => void;
}

export function InfoDialog({ topic, open, onClose }: InfoDialogProps) {
  const isOpen = (open ?? topic != null) && topic != null;
  const info = topic != null ? INFO_CONTENT[topic] : null;

  return (
    <Modal
      open={Boolean(isOpen && info)}
      onClose={onClose}
      className="info-dialog"
      title={info ? info.title : ""}
    >
      {info && <InfoSections info={info} />}
    </Modal>
  );
}
