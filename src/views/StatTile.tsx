// A web replica of LogosStatCard as used on the dashboard: a label row (label + info
// button), a large value (optionally coloured, with its own copy button), and a caption
// row (with an optional copy button and an "active" dot). Each tile's info button opens
// the shared InfoDialog on its topic.

import type { CSSProperties, ReactNode } from "react";

import { Card, CopyButton } from "../ds";
import type { InfoTopic } from "./infoContent";
import "./StatTile.css";

export interface StatTileProps {
  label: string;
  value: ReactNode;
  caption?: ReactNode;
  /** CSS var for the value colour (e.g. tone of a figure). */
  valueColorVar?: string;
  /** Copy button beside the value (LiB header id, etc.). */
  copyValue?: string;
  /** Copy button beside the caption (addresses, slots). */
  copyCaption?: string;
  /** Green "active" dot beside the caption (powActive). */
  activeDot?: boolean;
  /** Dim to 0.45 when the status poll is stale. */
  dim?: boolean;
  /** Warning accent (e.g. a mining failure). */
  warning?: boolean;
  /** The info topic this tile explains. */
  topic: InfoTopic;
  onInfo: (topic: InfoTopic) => void;
  /** Test hook. */
  testId?: string;
}

export function StatTile({
  label,
  value,
  caption,
  valueColorVar,
  copyValue,
  copyCaption,
  activeDot,
  dim,
  warning,
  topic,
  onInfo,
  testId,
}: StatTileProps) {
  const style = valueColorVar ? ({ color: valueColorVar } as CSSProperties) : undefined;
  return (
    <Card
      className={["stat-tile", dim && "stat-tile--dim", warning && "stat-tile--warning"]
        .filter(Boolean)
        .join(" ")}
      data-testid={testId}
    >
      <div className="stat-tile__label-row">
        <span className="stat-tile__label">{label}</span>
        <button
          type="button"
          className="stat-tile__info"
          aria-label={`${label} info`}
          title={`${label} info`}
          onClick={() => onInfo(topic)}
        >
          i
        </button>
      </div>

      <div className="stat-tile__value-row">
        <span className="stat-tile__value" style={style}>
          {value}
        </span>
        {copyValue ? <CopyButton value={copyValue} title={`Copy ${label}`} /> : null}
      </div>

      {(caption != null && caption !== "") || copyCaption || activeDot ? (
        <div className="stat-tile__caption-row">
          {caption != null && caption !== "" ? (
            <span className="stat-tile__caption">{caption}</span>
          ) : null}
          {activeDot ? <span className="stat-tile__dot" aria-label="active" /> : null}
          {copyCaption ? <CopyButton value={copyCaption} title={`Copy ${label}`} /> : null}
        </div>
      ) : null}
    </Card>
  );
}
