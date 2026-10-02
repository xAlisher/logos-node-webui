import { render } from "@testing-library/react";
import { afterEach, describe, expect, test, vi } from "vitest";

import type { LeaderClaimVouchers } from "../api/endpoints";
import { useVoucherRefresh } from "./voucherRefresh";

function payload(n: number): LeaderClaimVouchers {
  return {
    tip: "tip",
    reward_amount: 100,
    total_claimable: 100 * n,
    vouchers: Array.from({ length: n }, (_, i) => ({ commitment: `c${i}`, nullifier: `n${i}` })),
  };
}

function Probe({ gateOpen, fetchVouchers }: { gateOpen: boolean; fetchVouchers: () => Promise<LeaderClaimVouchers> }) {
  const { vouchers } = useVoucherRefresh({ gateOpen, fetchVouchers, intervalMs: 2000 });
  return <span data-testid="count">{vouchers?.vouchers.length ?? -1}</span>;
}

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("useVoucherRefresh (shell-voucher-refresh)", () => {
  test("does not fetch while the gate is closed", () => {
    vi.useFakeTimers();
    const fetchVouchers = vi.fn().mockResolvedValue(payload(1));
    render(<Probe gateOpen={false} fetchVouchers={fetchVouchers} />);
    expect(fetchVouchers).not.toHaveBeenCalled();
  });

  test("refreshes once immediately and again on the 2s cadence while open", async () => {
    vi.useFakeTimers();
    const fetchVouchers = vi.fn().mockResolvedValue(payload(2));
    render(<Probe gateOpen fetchVouchers={fetchVouchers} />);

    // Immediate refresh on gate open.
    expect(fetchVouchers).toHaveBeenCalledTimes(1);

    // Coalesced 2s cadence.
    await vi.advanceTimersByTimeAsync(2000);
    expect(fetchVouchers).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(2000);
    expect(fetchVouchers).toHaveBeenCalledTimes(3);
  });

  test("stops polling when the gate closes", async () => {
    vi.useFakeTimers();
    const fetchVouchers = vi.fn().mockResolvedValue(payload(1));
    const { rerender } = render(<Probe gateOpen fetchVouchers={fetchVouchers} />);
    expect(fetchVouchers).toHaveBeenCalledTimes(1);

    rerender(<Probe gateOpen={false} fetchVouchers={fetchVouchers} />);
    await vi.advanceTimersByTimeAsync(6000);
    // No further fetches after the gate closed.
    expect(fetchVouchers).toHaveBeenCalledTimes(1);
  });
});
