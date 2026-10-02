// useVoucherRefresh — the shell's coalesced claimable-vouchers refresh, a web port
// of BlockchainView.qml's 2s voucher Timer + voucherGateOpen gate. While the node is
// running AND online (the gate), it refreshes the claimable ("ready to claim")
// vouchers once immediately and then on a 2s cadence, feeding the Rewards/Dashboard
// "Ready to Claim". When the gate closes it stops and clears the last result, so a
// stopped node never shows a stale count. (shell-voucher-refresh)

import { useEffect, useRef, useState } from "react";

import { getLeaderClaimVouchers, type LeaderClaimVouchers } from "../api/endpoints";

export interface VoucherRefreshOptions {
  /** running && online — the only time the node will answer this read. */
  gateOpen: boolean;
  /** Refresh cadence in ms (default 2000, matching the QML Timer). */
  intervalMs?: number;
  /** Injected fetch (tests pass a stub); defaults to the real endpoint. */
  fetchVouchers?: () => Promise<LeaderClaimVouchers>;
}

export interface VoucherRefreshState {
  vouchers: LeaderClaimVouchers | null;
  /** How many successful refreshes have landed (lets the view react to new counts). */
  refreshCount: number;
}

export function useVoucherRefresh(options: VoucherRefreshOptions): VoucherRefreshState {
  const { gateOpen, intervalMs = 2000, fetchVouchers = getLeaderClaimVouchers } = options;
  const [state, setState] = useState<VoucherRefreshState>({ vouchers: null, refreshCount: 0 });
  const fetchRef = useRef(fetchVouchers);
  fetchRef.current = fetchVouchers;

  useEffect(() => {
    if (!gateOpen) {
      // Node not running/online — drop the last known list (QML clears on !Running).
      setState((prev) => (prev.vouchers === null ? prev : { vouchers: null, refreshCount: prev.refreshCount }));
      return;
    }

    let cancelled = false;
    const refresh = async () => {
      try {
        const v = await fetchRef.current();
        if (!cancelled) setState((prev) => ({ vouchers: v, refreshCount: prev.refreshCount + 1 }));
      } catch {
        // Keep the last known list on transient errors (QML does the same).
      }
    };

    void refresh();
    const id = setInterval(() => void refresh(), intervalMs);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [gateOpen, intervalMs]);

  return state;
}
