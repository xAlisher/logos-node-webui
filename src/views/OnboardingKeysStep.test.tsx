import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, test, vi } from "vitest";

import { OnboardingKeysStep } from "./OnboardingKeysStep";
import type { KeystoreKey } from "./onboardingTypes";

const KEYS: KeystoreKey[] = [
  { label: "Leader", address: "0xabc111" },
  { label: "Mining", address: "0xdef222" },
];

function setup(overrides: Partial<Parameters<typeof OnboardingKeysStep>[0]> = {}) {
  const props = {
    keys: KEYS,
    keystorePath: "/home/n/keystore.yaml",
    alreadyBackedUp: false,
    acknowledged: false,
    onAcknowledgeChange: vi.fn(),
    onDownload: vi.fn(),
    errorMessage: "",
    ...overrides,
  };
  render(<OnboardingKeysStep {...props} />);
  return props;
}

test("lists every key with its label, address and a copy button", () => {
  setup();
  const rows = screen.getAllByTestId("key-row");
  expect(rows).toHaveLength(2);
  expect(screen.getByText("Leader")).toBeInTheDocument();
  expect(screen.getByText("0xabc111")).toBeInTheDocument();
  expect(screen.getAllByRole("button", { name: /copy address/i })).toHaveLength(2);
});

test("first-run warning shows the key count; ack checkbox is present", () => {
  setup();
  expect(screen.getByTestId("keys-shown-once-notice")).toHaveTextContent("One copy, on this machine");
  expect(screen.getByTestId("keys-shown-once-notice")).toHaveTextContent("keystore of 2 keys");
  expect(screen.getByTestId("keys-acknowledge-checkbox")).toBeInTheDocument();
});

test("already-backed-up swaps to the success notice and hides the checkbox", () => {
  setup({ alreadyBackedUp: true });
  expect(screen.getByTestId("keys-already-backed-up-notice")).toHaveTextContent("Keys saved");
  expect(screen.queryByTestId("keys-acknowledge-checkbox")).not.toBeInTheDocument();
});

test("keys-not-listed fallback appears when the keystore can't be enumerated", () => {
  setup({ keys: [] });
  expect(screen.getByTestId("keys-not-listed")).toBeInTheDocument();
  expect(screen.queryByTestId("keys-list")).not.toBeInTheDocument();
});

test("Download is disabled without a keystore path and enabled with one", () => {
  const { rerender } = render(
    <OnboardingKeysStep
      keys={KEYS}
      keystorePath=""
      alreadyBackedUp={false}
      acknowledged={false}
      onAcknowledgeChange={() => {}}
      onDownload={() => {}}
      errorMessage=""
    />,
  );
  expect(screen.getByTestId("keys-download-button")).toBeDisabled();
  rerender(
    <OnboardingKeysStep
      keys={KEYS}
      keystorePath="/k.yaml"
      alreadyBackedUp={false}
      acknowledged={false}
      onAcknowledgeChange={() => {}}
      onDownload={() => {}}
      errorMessage=""
    />,
  );
  expect(screen.getByTestId("keys-download-button")).toBeEnabled();
});

test("clicking Download invokes the handler", async () => {
  const props = setup();
  await userEvent.click(screen.getByTestId("keys-download-button"));
  expect(props.onDownload).toHaveBeenCalledTimes(1);
});

test("ticking the checkbox reports the acknowledgement", async () => {
  const props = setup();
  await userEvent.click(screen.getByTestId("keys-acknowledge-checkbox"));
  expect(props.onAcknowledgeChange).toHaveBeenCalledWith(true);
});

test("shows the backup error notice", () => {
  setup({ errorMessage: "permission denied" });
  expect(screen.getByTestId("keys-error-notice")).toHaveTextContent("Backup failed");
  expect(screen.getByTestId("keys-error-notice")).toHaveTextContent("permission denied");
});
