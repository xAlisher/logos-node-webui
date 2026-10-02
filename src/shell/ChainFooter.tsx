// ChainFooter — "Chain ID: <id>" (elided) + a copy button, a web replica of
// BlockchainView.qml's `chainFooter` RowLayout. Visible only when a chain id is
// reported (footer-chain-id); the copy routes through the shell clipboard helper
// (footer-chain-id-copy).

import { useState } from "react";

import { registerParity } from "../test/parity";
import { copyText } from "./clipboard";

registerParity(["footer-chain-id", "footer-chain-id-copy"]);

export interface ChainFooterProps {
  /** Chain id; empty hides the footer. */
  chainId: string;
}

export function ChainFooter({ chainId }: ChainFooterProps) {
  const [copied, setCopied] = useState(false);
  if (!chainId) return null;

  const onCopy = async () => {
    const ok = await copyText(chainId);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    }
  };

  return (
    <footer className="shell-footer" data-testid="chain-footer">
      <span className="shell-chain-id" data-testid="footer-chain-id" title={chainId}>
        Chain ID: {chainId}
      </span>
      <button
        type="button"
        className="shell-copy"
        data-testid="footer-chain-id-copy"
        aria-label={copied ? "Copied" : "Copy chain id"}
        onClick={() => void onCopy()}
      >
        {copied ? "Copied" : "Copy"}
      </button>
    </footer>
  );
}
