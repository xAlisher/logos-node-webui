// Channel Deposit panel (embedded in WalletView) — `channel_deposit_with_notes`.
// Faithful replica of the official `ChannelDepositView.qml`: a 4-step wizard
//   0. Select notes  → pick the UTXOs to consume for the selected account
//   1. Fields        → channel id (+ LEZ preset), change/funding keys, max fee,
//                      metadata (base58), optional tip (+ "Use query tip")
//   2. Confirm       → read-only review of the EXACT payload
//   3. Result        → submitting spinner → tx hash (copyable) / error
// with a Back / Next / Confirm & deposit / New deposit footer.
//
// Step 2 (Confirm) is the guard in front of the mutating `POST /channel/deposit`:
// the view only calls `onSubmit` from "Confirm & deposit", and WalletView issues
// the POST there.

import { useState } from "react";

import { Button } from "../ds/Button";
import { CopyButton } from "../ds/CopyButton";
import { Select } from "../ds/Select";
import { TextField } from "../ds/TextField";
import { Toast } from "../ds/Toast";
import { NodeOffNotice, type NoticeSeverity } from "../shell/NodeOffNotice";
import { registerParity } from "../test/parity";
import { BASE58, HEX64, format, isAmountInput, normalizeInput, sumLepta } from "./units";
import type { WalletAccount } from "./WalletView";

// parity-checklist.json "view": "Channel Deposit".
registerParity([
  "deposit-node-off-banner",
  "deposit-step-indicator",
  "deposit-wizard-flow",
  "deposit-account-picker",
  "deposit-note-selector",
  "deposit-channel-id-field",
  "deposit-lez-preset",
  "deposit-change-picker",
  "deposit-funding-add",
  "deposit-funding-remove",
  "deposit-max-fee-field",
  "deposit-metadata-field",
  "deposit-tip-field",
  "deposit-use-query-tip",
  "deposit-confirm-review",
  "deposit-next-back",
  "deposit-confirm-submit",
  "deposit-result",
  "deposit-new-deposit",
  "deposit-notes-states",
  "deposit-field-validation",
]);

export interface NotesState {
  loading: boolean;
  notes: Record<string, number>;
  tip: string;
  error: string;
  /** Address whose notes are currently loaded ("" = none chosen yet). */
  loadedAddress: string;
}

export interface DepositResult {
  pending: boolean;
  success: boolean;
  text: string;
}

export interface ChannelDepositForm {
  channelIdHex: string;
  inputNoteIds: string[];
  metadataBase58: string;
  changePublicKey: string;
  fundingPublicKeys: string[];
  /** Canonical LOGOS string. */
  maxTxFee: string;
  /** "" means "use the current tip". */
  tipHex: string;
}

export interface ChannelDepositViewProps {
  accounts: WalletAccount[];
  nodeRunning: boolean;
  nodeOffReason: string;
  nodeOffSeverity: NoticeSeverity;
  /** A LEZ channel id this build ships, or "" (preset absent when empty). */
  lezChannelId: string;
  notes: NotesState;
  onGetNotes: (address: string) => void;
  onSubmit: (form: ChannelDepositForm) => void;
  result: DepositResult;
  /** Clears upstream notes + result when the wizard is reset. */
  onReset: () => void;
}

const STEP_COUNT = 4;

interface FundingKey {
  publicKey: string;
  label: string;
}

export function ChannelDepositView({
  accounts,
  nodeRunning,
  nodeOffReason,
  nodeOffSeverity,
  lezChannelId,
  notes,
  onGetNotes,
  onSubmit,
  result,
  onReset,
}: ChannelDepositViewProps) {
  const [step, setStep] = useState(0);
  const [selectedAddress, setSelectedAddress] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [channelId, setChannelId] = useState("");
  const [lezChecked, setLezChecked] = useState(false);
  const [changeKey, setChangeKey] = useState("");
  const [fundingKeys, setFundingKeys] = useState<FundingKey[]>([]);
  const [fundingPick, setFundingPick] = useState("");
  const [maxFee, setMaxFee] = useState("");
  const [metadata, setMetadata] = useState("");
  const [tip, setTip] = useState("");

  const accountOptions = accounts.map((a) => ({ label: a.name, value: a.address }));
  const labelFor = (addr: string) => accounts.find((a) => a.address === addr)?.name ?? "";

  // --- Step 0: notes ---
  const noteEntries = Object.entries(notes.notes);
  const selectedTotal = sumLepta(
    noteEntries.filter(([id]) => selected.has(id)).map(([, v]) => v),
  );

  const pickAccount = (addr: string) => {
    setSelectedAddress(addr);
    setSelected(new Set());
    if (addr) onGetNotes(addr);
  };

  const toggleNote = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // --- Step 1: field validity ---
  const channelIdValid = HEX64.test(channelId.trim());
  const metadataValid = metadata.trim() === "" || BASE58.test(metadata.trim());
  const tipValid = tip.trim() === "" || HEX64.test(tip.trim());

  const addFunding = () => {
    const k = fundingPick.trim();
    if (!k || fundingKeys.some((f) => f.publicKey.toLowerCase() === k.toLowerCase())) return;
    setFundingKeys((prev) => [...prev, { publicKey: k, label: labelFor(k) }]);
    setFundingPick("");
  };
  const removeFunding = (i: number) =>
    setFundingKeys((prev) => prev.filter((_, idx) => idx !== i));

  const canAdvance = (() => {
    switch (step) {
      case 0:
        return selected.size > 0;
      case 1:
        return (
          channelIdValid &&
          changeKey.trim().length > 0 &&
          fundingKeys.length > 0 &&
          maxFee.trim().length > 0 &&
          metadataValid &&
          tipValid
        );
      default:
        return true;
    }
  })();

  const goNext = () => {
    if (step < STEP_COUNT - 1) {
      const nextStep = step + 1;
      setStep(nextStep);
      // Prefill the key fields from the chosen wallet when first reaching step 1.
      if (nextStep === 1) {
        if (changeKey.trim() === "" && selectedAddress) setChangeKey(selectedAddress);
        if (fundingKeys.length === 0 && selectedAddress)
          setFundingKeys([{ publicKey: selectedAddress, label: labelFor(selectedAddress) }]);
      }
    }
  };
  const goBack = () => step > 0 && setStep(step - 1);

  const buildForm = (): ChannelDepositForm => ({
    channelIdHex: channelId.trim(),
    inputNoteIds: noteEntries.filter(([id]) => selected.has(id)).map(([id]) => id),
    metadataBase58: metadata.trim(),
    changePublicKey: changeKey.trim(),
    fundingPublicKeys: fundingKeys.map((f) => f.publicKey),
    maxTxFee: normalizeInput(maxFee.trim()),
    tipHex: tip.trim(),
  });

  const submit = () => {
    setStep(3);
    onSubmit(buildForm());
  };

  const reset = () => {
    setStep(0);
    setSelectedAddress("");
    setSelected(new Set());
    setChannelId("");
    setLezChecked(false);
    setChangeKey("");
    setFundingKeys([]);
    setFundingPick("");
    setMaxFee("");
    setMetadata("");
    setTip("");
    onReset();
  };

  const summaryLines: Array<{ k: string; v: string }> = [
    { k: "Channel ID", v: channelId.trim() },
    {
      k: `Notes to consume (${buildForm().inputNoteIds.length})`,
      v: buildForm().inputNoteIds.join("\n"),
    },
    { k: "Total amount", v: format(selectedTotal) },
    { k: "Change public key", v: changeKey.trim() },
    { k: "Funding public keys", v: fundingKeys.map((f) => f.publicKey).join("\n") },
    { k: "Max tx fee", v: maxFee.trim() ? `${normalizeInput(maxFee.trim())} LGO` : "" },
    { k: "Metadata (base58)", v: metadata.trim() || "(none)" },
    { k: "Optional tip hex", v: tip.trim() || "(current tip)" },
  ];

  return (
    <section className="wallet-deposit" data-testid="view-channel-deposit">
      <NodeOffNotice reason={nodeOffReason} severity={nodeOffSeverity} />

      <div className="wallet-deposit__head">
        <span className="wallet-deposit__step" data-testid="deposit-step-indicator">
          Step {step + 1} of {STEP_COUNT}
        </span>
      </div>

      <div className="wallet-deposit__body" data-testid="deposit-wizard-flow" data-step={step}>
        {step === 0 && (
          <div className="wallet-deposit__panel" data-testid="deposit-step-notes">
            <p className="wallet-field__help">
              Select the notes (UTXOs) to deposit into the channel. Their full value is
              consumed.
            </p>
            <label className="wallet-field__label">Deposit from</label>
            <Select
              aria-label="Deposit from"
              placeholder="Choose an account"
              value={selectedAddress}
              options={accountOptions}
              onChange={pickAccount}
            />

            <div className="wallet-deposit__notes" data-testid="deposit-note-selector">
              {!selectedAddress ? (
                <p className="wallet-field__help" data-testid="deposit-notes-choose">
                  Choose an account to load its notes.
                </p>
              ) : notes.loading ? (
                <p className="wallet-field__help" data-testid="deposit-notes-loading">
                  Loading notes…
                </p>
              ) : notes.error ? (
                <p className="wallet-field__error" data-testid="deposit-notes-error">
                  {notes.error}
                </p>
              ) : noteEntries.length === 0 ? (
                <p className="wallet-field__help" data-testid="deposit-notes-empty">
                  This account holds no notes.
                </p>
              ) : (
                <>
                  <ul className="wallet-deposit__note-list">
                    {noteEntries.map(([id, value]) => (
                      <li key={id} className="wallet-deposit__note">
                        <label>
                          <input
                            type="checkbox"
                            checked={selected.has(id)}
                            onChange={() => toggleNote(id)}
                          />
                          <code className="wallet-deposit__note-id">{id}</code>
                          <span className="wallet-deposit__note-value">{format(value)}</span>
                        </label>
                      </li>
                    ))}
                  </ul>
                  <p className="wallet-deposit__note-total" data-testid="deposit-note-total">
                    {selected.size} selected / {format(selectedTotal)}
                  </p>
                </>
              )}
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="wallet-deposit__panel" data-testid="deposit-step-fields">
            <div className="wallet-deposit__field-head">
              <span className="wallet-field__label">Channel ID hex</span>
              {lezChannelId.length > 0 && (
                <label className="wallet-deposit__lez" data-testid="deposit-lez-preset">
                  <input
                    type="checkbox"
                    checked={lezChecked}
                    onChange={(e) => {
                      const on = e.target.checked;
                      setLezChecked(on);
                      setChannelId(on ? lezChannelId : "");
                    }}
                  />
                  LEZ testnet
                </label>
              )}
            </div>
            <TextField
              placeholder="64 hex characters"
              value={channelId}
              readOnly={lezChecked}
              onChange={(e) => setChannelId(e.target.value)}
              aria-label="Channel ID hex"
              data-testid="deposit-channel-id-field"
            />
            {channelId.trim().length > 0 && !channelIdValid && (
              <p className="wallet-field__error" data-testid="deposit-channel-id-error">
                A channel ID is 64 hex characters (32 bytes).
              </p>
            )}

            <label className="wallet-field__label">Change goes to</label>
            <Select
              aria-label="Change goes to"
              placeholder="Choose an account"
              value={changeKey}
              options={accountOptions}
              onChange={setChangeKey}
            />

            <label className="wallet-field__label">Accounts funding the gas fee</label>
            <div className="wallet-deposit__funding-add">
              <Select
                aria-label="Funding account"
                placeholder="Account…"
                value={fundingPick}
                options={accountOptions}
                onChange={setFundingPick}
              />
              <Button
                size="compact"
                disabled={
                  !fundingPick ||
                  fundingKeys.some((f) => f.publicKey.toLowerCase() === fundingPick.toLowerCase())
                }
                onClick={addFunding}
                data-testid="deposit-funding-add"
              >
                Add
              </Button>
            </div>
            <ul className="wallet-deposit__funding-list">
              {fundingKeys.length === 0 && (
                <li className="wallet-field__help">No accounts added yet.</li>
              )}
              {fundingKeys.map((f, i) => (
                <li key={f.publicKey} className="wallet-deposit__funding-row">
                  {f.label && <span className="wallet-deposit__funding-label">{f.label}</span>}
                  <code className="wallet-deposit__funding-key">{f.publicKey}</code>
                  <button
                    type="button"
                    className="wallet-deposit__funding-remove"
                    aria-label="Remove this account"
                    title="Remove this account"
                    onClick={() => removeFunding(i)}
                    data-testid={`deposit-funding-remove-${i}`}
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>

            <label className="wallet-field__label">Max tx fee</label>
            <TextField
              placeholder="Maximum transaction fee (LGO)"
              value={maxFee}
              inputMode="decimal"
              onChange={(e) => {
                if (isAmountInput(e.target.value)) setMaxFee(e.target.value);
              }}
              aria-label="Max tx fee"
              data-testid="deposit-max-fee-field"
            />

            <label className="wallet-field__label">Metadata (base58, optional)</label>
            <TextField
              placeholder="Base58-encoded metadata bytes"
              value={metadata}
              onChange={(e) => setMetadata(e.target.value)}
              aria-label="Metadata"
              data-testid="deposit-metadata-field"
            />
            {metadata.trim() !== "" && !metadataValid && (
              <p className="wallet-field__error" data-testid="deposit-metadata-error">
                Invalid base58 input
              </p>
            )}

            <label className="wallet-field__label">
              Optional tip hex (leave empty for current tip)
            </label>
            <div className="wallet-deposit__tip">
              <TextField
                placeholder="64 hex characters"
                value={tip}
                onChange={(e) => setTip(e.target.value)}
                aria-label="Optional tip hex"
                data-testid="deposit-tip-field"
              />
              <Button
                size="compact"
                disabled={notes.tip === ""}
                onClick={() => setTip(notes.tip)}
                data-testid="deposit-use-query-tip"
              >
                Use query tip
              </Button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="wallet-deposit__panel" data-testid="deposit-confirm-review">
            <p className="wallet-field__help">
              Review the deposit. This is the exact payload that will be submitted.
            </p>
            <dl className="wallet-confirm">
              {summaryLines.map((line) => (
                <div className="wallet-confirm__row" key={line.k}>
                  <dt>{line.k}</dt>
                  <dd className="wallet-confirm__hex">{line.v}</dd>
                </div>
              ))}
            </dl>
          </div>
        )}

        {step === 3 && (
          <div className="wallet-deposit__panel" data-testid="deposit-result">
            {result.pending ? (
              <p className="wallet-deposit__submitting" data-testid="deposit-submitting">
                Submitting deposit…
              </p>
            ) : result.text ? (
              <Toast
                variant={result.success ? "success" : "error"}
                message={
                  <span className="wallet-result">
                    <strong>{result.success ? "Deposit submitted" : "Deposit failed"}</strong>
                    <span className="wallet-result__detail">{result.text}</span>
                    {result.success && <CopyButton value={result.text} title="Copy tx hash" />}
                  </span>
                }
              />
            ) : null}
          </div>
        )}
      </div>

      <div className="wallet-deposit__footer" data-testid="deposit-next-back">
        {step > 0 && step < 3 && (
          <Button onClick={goBack} data-testid="deposit-back">
            Back
          </Button>
        )}
        <span className="wallet-deposit__footer-spacer" />
        {step < 2 && (
          <Button
            variant="primary"
            disabled={!canAdvance}
            onClick={goNext}
            data-testid="deposit-next"
          >
            Next
          </Button>
        )}
        {step === 2 && (
          <Button
            variant="primary"
            disabled={!nodeRunning}
            onClick={submit}
            data-testid="deposit-confirm-submit"
          >
            Confirm &amp; deposit
          </Button>
        )}
        {step === 3 && !result.pending && (
          <Button onClick={reset} data-testid="deposit-new-deposit">
            New deposit
          </Button>
        )}
      </div>
    </section>
  );
}
