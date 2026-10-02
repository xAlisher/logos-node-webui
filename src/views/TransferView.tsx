// Transfer panel (embedded in WalletView) — send funds between keys. Faithful
// replica of the official `TransferView.qml`: From combo (rich account summary),
// To hex field, Amount (LGO) field with the locale-aware numeric grammar, an
// "Available: X" hint, the "More than this account holds." over-balance error,
// a Send button gated on node+from+to+amount+not-over, and the result notice.
//
// The one deliberate addition over the QML: the mutating `transfer-funds` call
// is GUARDED by a confirmation modal. Send opens a review dialog; only its
// "Confirm & send" fires `onTransfer`, which is where WalletView issues the POST.

import { useState } from "react";

import { Button } from "../ds/Button";
import { CopyButton } from "../ds/CopyButton";
import { Modal } from "../ds/Modal";
import { Select } from "../ds/Select";
import { TextField } from "../ds/TextField";
import { Toast } from "../ds/Toast";
import { NodeOffNotice, type NoticeSeverity } from "../shell/NodeOffNotice";
import { registerParity } from "../test/parity";
import { canonical, compareLepta, format, isAmountInput, normalizeInput, toLepta } from "./units";
import type { WalletAccount } from "./WalletView";

// parity-checklist.json "view": "Transfer".
registerParity([
  "transfer-node-off-banner",
  "transfer-from-combo",
  "transfer-to-field",
  "transfer-amount-field",
  "transfer-available-hint",
  "transfer-overbalance",
  "transfer-send-button",
  "transfer-result-notice",
]);

export interface TransferResult {
  hash?: string;
  error?: string;
}

export interface TransferViewProps {
  accounts: WalletAccount[];
  nodeRunning: boolean;
  nodeOffReason: string;
  nodeOffSeverity: NoticeSeverity;
  /** Issued after the user confirms. (fromAddress, toAddress, canonical LOGOS). */
  onTransfer: (fromAddress: string, toAddress: string, amountCanonical: string) => void;
  result?: TransferResult | null;
  submitting?: boolean;
}

export function TransferView({
  accounts,
  nodeRunning,
  nodeOffReason,
  nodeOffSeverity,
  onTransfer,
  result,
  submitting = false,
}: TransferViewProps) {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [amount, setAmount] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);

  const fromAccount = accounts.find((a) => a.address === from) ?? null;
  const fromBalance = fromAccount ? fromAccount.balance : "";
  const amountLepta = toLepta(normalizeInput(amount));
  // NaN (invalid/unfetched balance) must not read as "insufficient".
  const overBalance = compareLepta(amountLepta, fromBalance) > 0;
  const availableHint = format(fromBalance);

  const canSend =
    nodeRunning &&
    from.trim().length > 0 &&
    to.trim().length > 0 &&
    amountLepta.length > 0 &&
    !overBalance;

  const onAmountChange = (value: string) => {
    if (isAmountInput(value)) setAmount(value);
  };

  const confirmSend = () => {
    setConfirmOpen(false);
    onTransfer(from.trim(), to.trim(), canonical(amountLepta));
  };

  const sent = (result?.hash ?? "").length > 0;
  const failed = (result?.error ?? "").length > 0;

  return (
    <section className="wallet-transfer" data-testid="view-transfer">
      <NodeOffNotice reason={nodeOffReason} severity={nodeOffSeverity} />

      <div className="wallet-transfer__form">
        <label className="wallet-field__label" htmlFor="transfer-from">
          From
        </label>
        <Select
          aria-label="From account"
          placeholder="From account"
          value={from}
          options={accounts.map((a) => ({
            label: a.name + (a.balance ? ` — ${format(a.balance)}` : ""),
            value: a.address,
          }))}
          onChange={setFrom}
        />

        <TextField
          label="To"
          placeholder="Recipient key — 64 hex characters"
          value={to}
          onChange={(e) => setTo(e.target.value)}
          data-testid="transfer-to-field"
        />

        <div className="wallet-transfer__amount-head">
          <span className="wallet-field__label">Amount (LGO)</span>
          {availableHint && (
            <span className="wallet-transfer__available" data-testid="transfer-available-hint">
              Available: {availableHint}
            </span>
          )}
        </div>
        <TextField
          placeholder="0.00"
          inputMode="decimal"
          value={amount}
          onChange={(e) => onAmountChange(e.target.value)}
          aria-label="Amount (LGO)"
          data-testid="transfer-amount-field"
        />
        {overBalance && (
          <p className="wallet-transfer__overbalance" data-testid="transfer-overbalance">
            More than this account holds.
          </p>
        )}

        <div className="wallet-transfer__actions">
          <Button
            variant="primary"
            disabled={!canSend || submitting}
            onClick={() => setConfirmOpen(true)}
            data-testid="transfer-send-button"
          >
            {submitting ? "Sending…" : "Send"}
          </Button>
        </div>

        {(sent || failed) && (
          <div data-testid="transfer-result-notice">
            <Toast variant={sent ? "success" : "error"} message={
              <span className="wallet-result">
                <strong>{sent ? "Transaction sent" : "Transfer failed"}</strong>
                <span className="wallet-result__detail">
                  {sent ? result?.hash : result?.error}
                </span>
                {sent && result?.hash && <CopyButton value={result.hash} title="Copy tx hash" />}
              </span>
            } />
          </div>
        )}
      </div>

      <Modal
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title="Confirm transfer"
        footer={
          <>
            <Button onClick={() => setConfirmOpen(false)}>Cancel</Button>
            <Button variant="primary" onClick={confirmSend} data-testid="transfer-confirm">
              Confirm &amp; send
            </Button>
          </>
        }
      >
        <dl className="wallet-confirm">
          <dt>From</dt>
          <dd>{fromAccount ? `${fromAccount.name} (${fromAccount.address})` : from}</dd>
          <dt>To</dt>
          <dd className="wallet-confirm__hex">{to.trim()}</dd>
          <dt>Amount</dt>
          <dd>{format(amountLepta)}</dd>
        </dl>
      </Modal>
    </section>
  );
}
