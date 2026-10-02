import { useState } from "react";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, test, vi } from "vitest";

import {
  OnboardingMiningStep,
  isPositiveInt,
  powFieldsValid,
  type PowFormState,
} from "./OnboardingMiningStep";
import {
  DEFAULT_CLAIM_TICK_SECONDS,
  DEFAULT_MAX_THREADS,
  DEFAULT_TICKETS_PER_BLOCK,
  NO_CAP_THRESHOLD,
  type AutoClaimTarget,
  type PowAccount,
} from "./onboardingTypes";

const ACCOUNTS: PowAccount[] = [
  { address: "0xaaa", label: "Leader" },
  { address: "0xbbb", label: "Mining" },
];

const defaultPow: PowFormState = {
  autoThreads: false,
  threads: String(DEFAULT_MAX_THREADS),
  tickets: String(DEFAULT_TICKETS_PER_BLOCK),
  tick: String(DEFAULT_CLAIM_TICK_SECONDS),
};

// Stateful harness: targets + pow + switches live here so add/remove/toggle flow.
function Harness(props: {
  initialTargets?: AutoClaimTarget[];
  initialAutoClaim?: boolean;
  onAdd?: (t: AutoClaimTarget) => void;
}) {
  const [autoClaimOn, setAutoClaimOn] = useState(props.initialAutoClaim ?? true);
  const [targets, setTargets] = useState<AutoClaimTarget[]>(props.initialTargets ?? []);
  const [pow, setPow] = useState<PowFormState>(defaultPow);
  return (
    <OnboardingMiningStep
      accounts={ACCOUNTS}
      autoClaimOn={autoClaimOn}
      onAutoClaimChange={setAutoClaimOn}
      targets={targets}
      onAddTarget={(t) => {
        props.onAdd?.(t);
        setTargets((p) => [...p, t]);
      }}
      onRemoveTarget={(i) => setTargets((p) => p.filter((_, idx) => idx !== i))}
      pow={pow}
      onPowChange={setPow}
      busy={false}
      errorMessage=""
    />
  );
}

test("unit: isPositiveInt / powFieldsValid", () => {
  expect(isPositiveInt("1")).toBe(true);
  expect(isPositiveInt("0")).toBe(false);
  expect(isPositiveInt("-1")).toBe(false);
  expect(isPositiveInt("x")).toBe(false);
  expect(powFieldsValid(defaultPow)).toBe(true);
  expect(powFieldsValid({ ...defaultPow, tickets: "0" })).toBe(false);
  // autoThreads lets the threads field be ignored.
  expect(powFieldsValid({ ...defaultPow, autoThreads: true, threads: "" })).toBe(true);
});

test("renders the Recommended auto-claim switch (on by default) + targets editor", () => {
  render(<Harness />);
  expect(screen.getByTestId("mining-recommended-badge")).toHaveTextContent("Recommended");
  expect(screen.getByRole("switch", { checked: true })).toBeInTheDocument();
  expect(screen.getByTestId("auto-claim-targets")).toBeInTheDocument();
});

test("turning auto-claim off hides the targets editor and shows the off note", async () => {
  render(<Harness />);
  const autoSwitch = screen.getByTestId("auto-claim-targets");
  expect(autoSwitch).toBeInTheDocument();
  // The first switch in the card is the auto-claim switch.
  await userEvent.click(screen.getAllByRole("switch")[0]);
  expect(screen.getByTestId("autoclaim-off-note")).toBeInTheDocument();
  expect(screen.queryByTestId("auto-claim-targets")).not.toBeInTheDocument();
});

test("Add is disabled until an account is picked, then adds a capped target", async () => {
  const onAdd = vi.fn();
  render(<Harness onAdd={onAdd} />);
  expect(screen.getByTestId("add-target-button")).toBeDisabled();

  // Open the account combo and choose Leader.
  await userEvent.click(screen.getByRole("button", { name: "Account" }));
  await userEvent.click(screen.getByRole("option", { name: "Leader" }));
  expect(screen.getByTestId("add-target-button")).toBeEnabled();

  await userEvent.click(screen.getByTestId("add-target-button"));
  expect(onAdd).toHaveBeenCalledWith({ public_key: "0xaaa", threshold: "100000000" });
  expect(screen.getByTestId("target-row")).toHaveTextContent("to 100000000");
});

test("No cap hides the threshold field and adds the no-cap sentinel", async () => {
  const onAdd = vi.fn();
  render(<Harness onAdd={onAdd} />);
  await userEvent.click(screen.getByRole("button", { name: "Account" }));
  await userEvent.click(screen.getByRole("option", { name: "Mining" }));

  // No-cap switch is the second switch in the targets row.
  const switches = screen.getAllByRole("switch");
  await userEvent.click(switches[1]);
  expect(screen.queryByTestId("threshold-field")).not.toBeInTheDocument();

  await userEvent.click(screen.getByTestId("add-target-button"));
  expect(onAdd).toHaveBeenCalledWith({ public_key: "0xbbb", threshold: NO_CAP_THRESHOLD });
  expect(screen.getByTestId("target-row")).toHaveTextContent("No cap");
});

test("a target can be removed", async () => {
  render(<Harness initialTargets={[{ public_key: "0xaaa", threshold: "100000000" }]} />);
  expect(screen.getByTestId("target-row")).toBeInTheDocument();
  await userEvent.click(screen.getByTestId("remove-target-button"));
  expect(screen.queryByTestId("target-row")).not.toBeInTheDocument();
});

test("opens the auto-claim-targets info dialog", async () => {
  render(<Harness />);
  await userEvent.click(screen.getByTestId("targets-info"));
  expect(screen.getByRole("dialog")).toHaveTextContent("Auto-claim targets");
});

test("renders the three pow fields with their info buttons", () => {
  render(<Harness />);
  expect(screen.getByTestId("threads-field")).toBeInTheDocument();
  expect(screen.getByTestId("tickets-field")).toBeInTheDocument();
  expect(screen.getByTestId("tick-field")).toBeInTheDocument();
  const form = screen.getByTestId("mining-pow-form");
  expect(within(form).getAllByRole("button", { name: /^About/ }).length).toBeGreaterThanOrEqual(3);
});

test("Auto threads switch hides the Search threads field", async () => {
  render(<Harness />);
  expect(screen.getByTestId("threads-field")).toBeInTheDocument();
  // Within the pow form, the only switch is the auto-threads switch.
  const form = screen.getByTestId("mining-pow-form");
  await userEvent.click(within(form).getByRole("switch"));
  expect(screen.queryByTestId("threads-field")).not.toBeInTheDocument();
});

test("invalid mining field shows the >=1 validation error", async () => {
  render(<Harness />);
  const tickets = screen.getByTestId("tickets-field");
  await userEvent.clear(tickets);
  await userEvent.type(tickets, "0");
  expect(screen.getByTestId("pow-mining-field-error")).toBeInTheDocument();
});

test("fund validation notice appears when auto-claim is on with no targets", () => {
  render(<Harness />);
  expect(screen.getByTestId("fund-validation-notice")).toHaveTextContent(
    "Add an account for auto-claim to pay, or switch it off",
  );
});
