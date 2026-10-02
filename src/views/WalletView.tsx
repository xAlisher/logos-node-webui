// Wallet tab (issue #8) — container for the three wallet panels behind a
// left-hand section nav (Accounts / Transfer / Channel Deposit), replicating the
// official `WalletView.qml`. No section is node-gated; each panel renders its own
// node-off banner.
//
// This container plays the role the QML host plays: it owns every HTTP call —
// the reads that build the account list and load a note set, and the two MUTATING
// writes (`transfer-funds`, `channel/deposit`) — and hands the panels their data
// plus the callbacks that fire those writes. Each panel keeps its own form state
// and surfaces a confirm step; the write only happens after that confirm.
//
// Account source: the 0.3.0 node HTTP API has no "list my wallet keys" endpoint
// (in the QML the keystore is remoted from C++). We reconstruct the account set
// from the two places keys surface over HTTP: `GET /pow/status` auto-claim targets
// (mining/claim keys) and `GET /leader/aged-notes` note owners (staking keys),
// merged + deduped, then read each one's balance + notes via `GET /wallet/:pk/balance`.

import { useCallback, useEffect, useState } from "react";

import { ApiError } from "../api/client";
import {
  channelDeposit,
  getLeaderAgedNotes,
  getPowStatus,
  getWalletBalance,
  transferFunds,
} from "../api/endpoints";
import { registerParity } from "../test/parity";
import { AccountsView } from "./AccountsView";
import {
  ChannelDepositView,
  type ChannelDepositForm,
  type DepositResult,
  type NotesState,
} from "./ChannelDepositView";
import { TransferView, type TransferResult } from "./TransferView";
import type { NodeViewProps } from "./types";
import { leptaString, toLepta } from "./units";

import "./wallet.css";

// parity-checklist.json "view": "Wallet".
registerParity(["wallet-section-nav"]);

/** One wallet account row (the web analogue of the QML `AccountSummary`). */
export interface WalletAccount {
  /** Zk public key (hex) — the address. */
  address: string;
  name: string;
  roleLabel: string;
  /** Balance as a lepta digit-string ("" when unknown). */
  balance: string;
  /** UTXO map (noteId -> value) for the channel-deposit note selector. */
  notes: Record<string, number>;
}

type Section = "accounts" | "transfer" | "channel-deposit";

const SECTIONS: Array<{ key: Section; label: string }> = [
  { key: "accounts", label: "Accounts" },
  { key: "transfer", label: "Transfer" },
  { key: "channel-deposit", label: "Channel Deposit" },
];

const EMPTY_NOTES: NotesState = {
  loading: false,
  notes: {},
  tip: "",
  error: "",
  loadedAddress: "",
};

const EMPTY_DEPOSIT: DepositResult = { pending: false, success: false, text: "" };

/** The LEZ channel id this build ships, or "" (the preset is hidden when empty). */
const LEZ_CHANNEL_ID = "";

function shortName(address: string): string {
  const a = address.replace(/^0x/, "");
  return a.length > 12 ? `${a.slice(0, 6)}…${a.slice(-4)}` : a || "(unknown)";
}

function errText(err: unknown): string {
  if (err instanceof ApiError) return `${err.status}: ${err.message}`;
  return err instanceof Error ? err.message : String(err);
}

export function WalletView({ nodeOffReason, nodeOffSeverity }: NodeViewProps) {
  const nodeRunning = nodeOffReason.length === 0;

  const [section, setSection] = useState<Section>("accounts");

  const [accounts, setAccounts] = useState<WalletAccount[]>([]);
  const [accountsLoading, setAccountsLoading] = useState(false);

  const [transferResult, setTransferResult] = useState<TransferResult | null>(null);
  const [transferSubmitting, setTransferSubmitting] = useState(false);

  const [notes, setNotes] = useState<NotesState>(EMPTY_NOTES);
  const [depositResult, setDepositResult] = useState<DepositResult>(EMPTY_DEPOSIT);

  const refreshAccounts = useCallback(async () => {
    if (!nodeRunning) return;
    setAccountsLoading(true);
    try {
      // Two key sources the node exposes over HTTP (there is no keystore-list
      // endpoint): the PoW auto-claim targets (/pow/status) and the staking keys
      // that own aged notes (/leader/aged-notes). Merge + dedup; the PoW/claim
      // role wins when a key is both.
      const [statusR, agedR] = await Promise.allSettled([getPowStatus(), getLeaderAgedNotes()]);
      const roleByKey = new Map<string, string>();
      if (agedR.status === "fulfilled") {
        for (const n of agedR.value.notes ?? []) {
          if (n.public_key && !roleByKey.has(n.public_key)) roleByKey.set(n.public_key, "Staking key");
        }
      }
      if (statusR.status === "fulfilled") {
        for (const t of statusR.value.auto_claim.targets) {
          roleByKey.set(t.public_key, "Mining / claim key");
        }
      }
      if (statusR.status === "rejected" && agedR.status === "rejected") throw statusR.reason;

      const rows = await Promise.all(
        [...roleByKey.entries()].map(async ([pk, roleLabel]): Promise<WalletAccount> => {
          try {
            const bal = await getWalletBalance(pk);
            return {
              address: pk,
              name: shortName(pk),
              roleLabel,
              balance: leptaString(bal.balance),
              notes: bal.notes ?? {},
            };
          } catch {
            return { address: pk, name: shortName(pk), roleLabel, balance: "", notes: {} };
          }
        }),
      );
      setAccounts(rows);
    } catch {
      setAccounts([]);
    } finally {
      setAccountsLoading(false);
    }
  }, [nodeRunning]);

  useEffect(() => {
    void refreshAccounts();
  }, [refreshAccounts]);

  // --- MUTATING: POST /wallet/transactions/transfer-funds (after confirm) ---
  const onTransfer = useCallback(
    async (fromAddress: string, toAddress: string, amountCanonical: string) => {
      setTransferSubmitting(true);
      setTransferResult(null);
      try {
        const res = await transferFunds({
          tip: null,
          change_public_key: fromAddress,
          funding_public_keys: [fromAddress],
          recipient_public_key: toAddress,
          amount: Number(toLepta(amountCanonical)),
        });
        setTransferResult({ hash: res.hash });
      } catch (err) {
        setTransferResult({ error: errText(err) });
      } finally {
        setTransferSubmitting(false);
      }
    },
    [],
  );

  // --- READ: load a chosen account's notes for the deposit note selector ---
  const onGetNotes = useCallback(async (address: string) => {
    setNotes({ ...EMPTY_NOTES, loading: true, loadedAddress: address });
    try {
      const bal = await getWalletBalance(address);
      setNotes({
        loading: false,
        notes: bal.notes ?? {},
        tip: bal.tip ?? "",
        error: "",
        loadedAddress: address,
      });
    } catch (err) {
      setNotes({
        loading: false,
        notes: {},
        tip: "",
        error: `Failed to load notes — ${errText(err)}`,
        loadedAddress: address,
      });
    }
  }, []);

  // --- MUTATING: POST /channel/deposit (after the wizard Confirm step) ---
  const onDeposit = useCallback(async (form: ChannelDepositForm) => {
    setDepositResult({ pending: true, success: false, text: "" });
    try {
      const res = await channelDeposit({
        tip: form.tipHex || null,
        // DepositOp shape is not captured in the spec; this is a best-effort
        // encoding of the three note-level fields the QML collects.
        deposit: {
          channel_id: form.channelIdHex,
          input_note_ids: form.inputNoteIds,
          metadata_base58: form.metadataBase58,
        },
        change_public_key: form.changePublicKey,
        funding_public_keys: form.fundingPublicKeys,
        max_tx_fee: Number(toLepta(form.maxTxFee)) || 0,
      });
      setDepositResult({ pending: false, success: true, text: res.hash });
    } catch (err) {
      setDepositResult({ pending: false, success: false, text: errText(err) });
    }
  }, []);

  const onDepositReset = useCallback(() => {
    setNotes(EMPTY_NOTES);
    setDepositResult(EMPTY_DEPOSIT);
  }, []);

  return (
    <div className="wallet-view" data-testid="view-wallet">
      <nav className="wallet-nav" data-testid="wallet-section-nav" aria-label="Wallet sections">
        {SECTIONS.map((s) => (
          <button
            key={s.key}
            type="button"
            className={
              "wallet-nav__item" + (s.key === section ? " wallet-nav__item--active" : "")
            }
            aria-current={s.key === section}
            onClick={() => setSection(s.key)}
          >
            {s.label}
          </button>
        ))}
      </nav>

      <div className="wallet-panel">
        {section === "accounts" && (
          <AccountsView
            accounts={accounts}
            nodeOffReason={nodeOffReason}
            nodeOffSeverity={nodeOffSeverity}
            loading={accountsLoading}
            onRefresh={() => void refreshAccounts()}
          />
        )}
        {section === "transfer" && (
          <TransferView
            accounts={accounts}
            nodeRunning={nodeRunning}
            nodeOffReason={nodeOffReason}
            nodeOffSeverity={nodeOffSeverity}
            onTransfer={(f, t, a) => void onTransfer(f, t, a)}
            result={transferResult}
            submitting={transferSubmitting}
          />
        )}
        {section === "channel-deposit" && (
          <ChannelDepositView
            accounts={accounts}
            nodeRunning={nodeRunning}
            nodeOffReason={nodeOffReason}
            nodeOffSeverity={nodeOffSeverity}
            lezChannelId={LEZ_CHANNEL_ID}
            notes={notes}
            onGetNotes={(a) => void onGetNotes(a)}
            onSubmit={(f) => void onDeposit(f)}
            result={depositResult}
            onReset={onDepositReset}
          />
        )}
      </div>
    </div>
  );
}
