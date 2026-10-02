import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, test, vi } from "vitest";

import { NO_CAP_THRESHOLD } from "./onboardingTypes";
import { PowAutoClaimTargets } from "./PowAutoClaimTargets";

/** Last recorded call of a vi mock (ES2020 lib has no Array.prototype.at). */
function lastCall<T extends unknown[]>(calls: T[]): T {
  return calls[calls.length - 1];
}

const ADDR1 = "aaaa1111bbbb2222cccc3333dddd4444eeee5555ffff6666aaaa7777bbbb8888";
const ADDR2 = "1111aaaa2222bbbb3333cccc4444dddd5555eeee6666ffff7777aaaa8888bbbb";
const ACCOUNTS = [
  { address: ADDR1, label: "Main" },
  { address: ADDR2, label: "Savings" },
];

async function pickAccount(name: string) {
  await userEvent.click(screen.getByRole("button", { name: "Auto-claim account" }));
  await userEvent.click(screen.getByRole("option", { name }));
}

describe("PowAutoClaimTargets — render", () => {
  test("renders the enable switch (on, Recommended), combo, and Add", () => {
    render(<PowAutoClaimTargets accounts={ACCOUNTS} />);
    expect(screen.getByTestId("pow-auto-claim-targets")).toBeInTheDocument();
    expect(screen.getByText("Recommended")).toBeInTheDocument();
    expect(screen.getByText("Pays into")).toBeInTheDocument();
    expect(screen.getByTestId("pow-targets-info")).toBeInTheDocument();
    expect(screen.getByTestId("pow-add-target")).toBeInTheDocument();
  });

  test("off: switching auto-claim off shows the off-note and hides the editor", async () => {
    const onEnabled = vi.fn();
    const { container } = render(
      <PowAutoClaimTargets accounts={ACCOUNTS} onEnabledChange={onEnabled} />,
    );
    await userEvent.click(container.querySelector("#pow-autoclaim-enable")!);
    expect(onEnabled).toHaveBeenCalledWith(false);
    expect(screen.getByTestId("pow-autoclaim-off-note")).toBeInTheDocument();
    expect(screen.queryByTestId("pow-add-target")).toBeNull();
  });

  test("advance hint when auto-claim is on with no targets", () => {
    render(<PowAutoClaimTargets accounts={ACCOUNTS} />);
    expect(screen.getByTestId("pow-targets-needed")).toHaveTextContent(
      "Add an account for auto-claim to pay, or switch it off",
    );
  });
});

describe("PowAutoClaimTargets — add / remove", () => {
  test("Add is disabled until an account is picked, then adds a capped target", async () => {
    const onChange = vi.fn();
    render(<PowAutoClaimTargets accounts={ACCOUNTS} onChange={onChange} />);
    expect(screen.getByTestId("pow-add-target")).toBeDisabled();

    await pickAccount("Main");
    expect(screen.getByTestId("pow-add-target")).toBeEnabled();
    await userEvent.click(screen.getByTestId("pow-add-target"));

    const row = screen.getByTestId("pow-target-row");
    expect(within(row).getByText("Main")).toBeInTheDocument();
    expect(within(row).getByText("to 100000000")).toBeInTheDocument();
    await waitFor(() =>
      expect(lastCall(onChange.mock.calls)?.[0]).toEqual([
        { public_key: ADDR1, threshold: "100000000" },
      ]),
    );
  });

  test("No cap hides the threshold field and stores the sentinel", async () => {
    const { container } = render(<PowAutoClaimTargets accounts={ACCOUNTS} />);
    await pickAccount("Savings");
    await userEvent.click(container.querySelector("#pow-no-cap")!);
    expect(screen.queryByTestId("pow-threshold")).toBeNull();

    await userEvent.click(screen.getByTestId("pow-add-target"));
    const row = screen.getByTestId("pow-target-row");
    expect(within(row).getByText("No cap")).toBeInTheDocument();
    // Sentinel is the u64::MAX string.
    expect(NO_CAP_THRESHOLD).toBe("18446744073709551615");
  });

  test("Remove drops the target", async () => {
    render(<PowAutoClaimTargets accounts={ACCOUNTS} />);
    await pickAccount("Main");
    await userEvent.click(screen.getByTestId("pow-add-target"));
    expect(screen.getByTestId("pow-target-row")).toBeInTheDocument();

    await userEvent.click(screen.getByTestId("pow-remove-target"));
    expect(screen.queryByTestId("pow-target-row")).toBeNull();
  });

  test("seeds from initialTargets", () => {
    render(
      <PowAutoClaimTargets
        accounts={ACCOUNTS}
        initialTargets={[{ public_key: ADDR1, threshold: "500" }]}
      />,
    );
    const row = screen.getByTestId("pow-target-row");
    expect(within(row).getByText("Main")).toBeInTheDocument();
    expect(within(row).getByText("to 500")).toBeInTheDocument();
  });
});
