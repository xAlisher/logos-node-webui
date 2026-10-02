import { useCallback, useState } from "react";
import "./CopyButton.css";

export interface CopyButtonProps {
  /** Text copied to the clipboard on click. */
  value: string;
  /** Accessible label / tooltip. */
  title?: string;
  className?: string;
}

const copyIcon = (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
    <rect
      x="5.5"
      y="5.5"
      width="8"
      height="8"
      rx="1.5"
      stroke="currentColor"
      strokeWidth="1.3"
    />
    <path
      d="M10.5 5V3.5A1.5 1.5 0 009 2H3.5A1.5 1.5 0 002 3.5V9a1.5 1.5 0 001.5 1.5H5"
      stroke="currentColor"
      strokeWidth="1.3"
      strokeLinecap="round"
    />
  </svg>
);

const checkIcon = (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
    <path
      d="M3.5 8.5l3 3 6-6.5"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

/**
 * Node-UI copy-to-clipboard affordance appended to any hash/ID/address/amount.
 * Shows a check for ~1.2s after a successful copy. See docs/spec §4 (CopyButton).
 */
export function CopyButton({ value, title = "Copy", className }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);
  const onCopy = useCallback(async () => {
    try {
      await navigator.clipboard?.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      /* clipboard unavailable — no-op */
    }
  }, [value]);

  return (
    <button
      type="button"
      className={["ds-copybutton", copied && "ds-copybutton--copied", className]
        .filter(Boolean)
        .join(" ")}
      onClick={onCopy}
      aria-label={copied ? "Copied" : title}
      title={copied ? "Copied" : title}
    >
      {copied ? checkIcon : copyIcon}
    </button>
  );
}
