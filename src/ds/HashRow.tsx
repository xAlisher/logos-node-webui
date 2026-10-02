import type { ReactNode } from "react";
import { CopyButton } from "./CopyButton";
import "./HashRow.css";

export interface HashRowProps {
  /** Left-column label. */
  label?: ReactNode;
  /** The scalar value (hash / key / address / amount). */
  value: string;
  /** Optional qualifier after the label (e.g. the slot a hash belongs to). */
  note?: ReactNode;
  /** Render the value in the monospace stack (default true). */
  mono?: boolean;
  /** Show the trailing copy button (default true). */
  copyable?: boolean;
  /** Fixed label column width in px. */
  labelWidth?: number;
  className?: string;
}

/**
 * HashRow / KeyValue. label (--text-secondary, 12px) + value
 * (mono, 12px, --text-tertiary) + CopyButton. See docs/spec §4.
 */
export function HashRow({
  label,
  value,
  note,
  mono = true,
  copyable = true,
  labelWidth = 110,
  className,
}: HashRowProps) {
  return (
    <div className={["ds-hashrow", className].filter(Boolean).join(" ")}>
      {label != null && (
        <span className="ds-hashrow__label" style={{ width: labelWidth }}>
          {label}
        </span>
      )}
      {note != null && <span className="ds-hashrow__note">{note}</span>}
      <span
        className={["ds-hashrow__value", mono && "ds-hashrow__value--mono"]
          .filter(Boolean)
          .join(" ")}
        title={value}
      >
        {value && value.length > 0 ? value : "—"}
      </span>
      {copyable && value && value.length > 0 && <CopyButton value={value} />}
    </div>
  );
}

/** Alias: the DS calls this KeyValue when the value isn't a hash. */
export { HashRow as KeyValue };
