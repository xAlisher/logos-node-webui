import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, expect, test, vi } from "vitest";

import { OnboardingFlow } from "./OnboardingFlow";
import type { OnboardingBackend } from "./onboardingTypes";

const PEER = "/ip4/1.1.1.1/udp/3000/quic-v1/p2p/12D3KooWtest";

function mockBackend(over: Partial<OnboardingBackend> = {}): OnboardingBackend {
  return {
    userConfig: "",
    useGeneratedConfig: false,
    deploymentConfig: "",
    nodeKeystorePath: "/home/n/keystore.yaml",
    keysBackedUp: false,
    bootstrapPeers: [PEER],
    configPowSection: {},
    generatedUserConfigPath: "/home/n/user_config.yaml",
    generateConfig: vi.fn(async () => ({ success: true, value: "/home/n/user_config.yaml" })),
    powConfigure: vi.fn(async () => ({ success: true })),
    backupKeystore: vi.fn(async () => ({ success: true, value: "/dst/keystore.yaml" })),
    getKeystoreKeys: vi.fn(async () => ({
      success: true,
      value: [{ label: "Leader", address: "0xaaa" }],
    })),
    getConfigWalletKeys: vi.fn(async () => ({
      success: true,
      value: [{ address: "0xaaa", label: "Leader" }],
    })),
    ...over,
  };
}

beforeEach(() => vi.clearAllMocks());

test("opens on the Welcome screen when not configuring a new node", () => {
  render(<OnboardingFlow backend={mockBackend()} />);
  expect(screen.getByTestId("onboarding-welcome")).toBeInTheDocument();
  expect(screen.queryByTestId("onboarding-stepper")).not.toBeInTheDocument();
});

test("Quick start generates from shipped peers and finishes the flow", async () => {
  const backend = mockBackend();
  const onFinished = vi.fn();
  render(<OnboardingFlow backend={backend} onFinished={onFinished} />);

  await userEvent.click(screen.getByTestId("quick-start-button"));

  await waitFor(() => expect(onFinished).toHaveBeenCalledWith(true));
  expect(backend.generateConfig).toHaveBeenCalledWith(
    expect.objectContaining({ initialPeers: [PEER], quickStart: true, deploymentMode: 0 }),
  );
});

test("Advanced enters the stepper with the full generate step set + rail", async () => {
  render(<OnboardingFlow backend={mockBackend()} />);
  await userEvent.click(screen.getByTestId("advanced-setup-button"));

  expect(screen.getByTestId("onboarding-stepper")).toBeInTheDocument();
  expect(screen.getByTestId("onboarding-setup-step")).toBeInTheDocument();
  const rail = screen.getByTestId("onboarding-step-rail");
  expect(within(rail).getByText("1. Setup")).toBeInTheDocument();
  expect(within(rail).getByText("2. Network")).toBeInTheDocument();
  expect(within(rail).getByText("3. Keys")).toBeInTheDocument();
  expect(within(rail).getByText("4. Fund")).toBeInTheDocument();
  expect(screen.getByTestId("onboarding-advance-button")).toHaveTextContent("Continue");
});

test("the complete generate → network → keys → fund → start flow", async () => {
  const backend = mockBackend();
  const onFinished = vi.fn();
  render(<OnboardingFlow backend={backend} onFinished={onFinished} />);

  // Welcome → Setup
  await userEvent.click(screen.getByTestId("advanced-setup-button"));
  // Setup (generate preselected) → Network
  await userEvent.click(screen.getByTestId("onboarding-advance-button"));
  expect(screen.getByTestId("onboarding-network-step")).toBeInTheDocument();
  expect(screen.getByTestId("onboarding-advance-button")).toHaveTextContent("Generate config");

  // Network peers are prefilled → generate → Keys
  await userEvent.click(screen.getByTestId("onboarding-advance-button"));
  expect(await screen.findByTestId("onboarding-keys-step")).toBeInTheDocument();
  expect(backend.generateConfig).toHaveBeenCalledWith(
    expect.objectContaining({ initialPeers: [PEER], quickStart: false }),
  );
  // Keys loaded from the backend.
  expect(screen.getByText("0xaaa")).toBeInTheDocument();

  // Keys gate: advance disabled until acknowledged.
  const advance = screen.getByTestId("onboarding-advance-button");
  expect(advance).toBeDisabled();
  expect(screen.getByTestId("onboarding-advance-hint")).toHaveTextContent(
    "Confirm you saved your keys to continue",
  );
  await userEvent.click(screen.getByTestId("keys-acknowledge-checkbox"));
  expect(advance).toBeEnabled();

  // Keys → Fund
  await userEvent.click(advance);
  expect(screen.getByTestId("onboarding-mining-step")).toBeInTheDocument();
  expect(screen.getByTestId("onboarding-advance-button")).toHaveTextContent("Start node");

  // Fund gate: auto-claim on with no targets → disabled.
  expect(screen.getByTestId("onboarding-advance-button")).toBeDisabled();
  expect(screen.getByTestId("onboarding-advance-hint")).toHaveTextContent(
    "Add an account for auto-claim to pay, or switch it off",
  );
  // Switch auto-claim off → valid.
  const miningStep = screen.getByTestId("onboarding-mining-step");
  await userEvent.click(within(miningStep).getAllByRole("switch")[0]);
  expect(screen.getByTestId("onboarding-advance-button")).toBeEnabled();

  // Start node → powConfigure → finished.
  await userEvent.click(screen.getByTestId("onboarding-advance-button"));
  await waitFor(() => expect(onFinished).toHaveBeenCalledWith(true));
  expect(backend.powConfigure).toHaveBeenCalledTimes(1);
  const [, configJson] = (backend.powConfigure as ReturnType<typeof vi.fn>).mock.calls[0];
  expect(JSON.parse(configJson)).toMatchObject({
    max_tickets_per_block: 2,
    tick_seconds: 300,
    auto_claim_targets: [],
  });
});

test("Back returns to the previous step", async () => {
  render(<OnboardingFlow backend={mockBackend()} />);
  await userEvent.click(screen.getByTestId("advanced-setup-button"));
  await userEvent.click(screen.getByTestId("onboarding-advance-button")); // → network
  expect(screen.getByTestId("onboarding-network-step")).toBeInTheDocument();

  await userEvent.click(screen.getByTestId("onboarding-back-button"));
  expect(screen.getByTestId("onboarding-setup-step")).toBeInTheDocument();
});

test("a generate failure keeps the user on Network with the error notice", async () => {
  const backend = mockBackend({
    generateConfig: vi.fn(async () => ({ success: false, error: "address in use" })),
  });
  render(<OnboardingFlow backend={backend} />);
  await userEvent.click(screen.getByTestId("advanced-setup-button"));
  await userEvent.click(screen.getByTestId("onboarding-advance-button")); // setup → network
  await userEvent.click(screen.getByTestId("onboarding-advance-button")); // generate (fails)

  expect(await screen.findByTestId("network-error-notice")).toHaveTextContent("address in use");
  expect(screen.getByTestId("onboarding-network-step")).toBeInTheDocument();
});

test("existing-config path is Setup-only and starts the node directly", async () => {
  const backend = mockBackend();
  const onFinished = vi.fn();
  render(<OnboardingFlow backend={backend} onFinished={onFinished} />);
  await userEvent.click(screen.getByTestId("advanced-setup-button"));

  // Choose existing.
  await userEvent.click(screen.getByTestId("setup-existing-card"));
  // Advance is gated until a user config path is supplied.
  const advance = screen.getByTestId("onboarding-advance-button");
  expect(advance).toHaveTextContent("Start node");
  expect(advance).toBeDisabled();

  await userEvent.type(screen.getByTestId("setup-user-config-field"), "/home/n/user_config.yaml");
  expect(advance).toBeEnabled();
  await userEvent.click(advance);
  expect(onFinished).toHaveBeenCalledWith(true);
  // No config was generated on the existing path.
  expect(backend.generateConfig).not.toHaveBeenCalled();
});

test("new-node mode skips Welcome/Setup and starts at Network with Back disabled", () => {
  render(<OnboardingFlow backend={mockBackend()} newNode />);
  expect(screen.queryByTestId("onboarding-welcome")).not.toBeInTheDocument();
  expect(screen.getByTestId("onboarding-network-step")).toBeInTheDocument();
  // Rail has three steps (no Setup).
  const rail = screen.getByTestId("onboarding-step-rail");
  expect(within(rail).getByText("1. Network")).toBeInTheDocument();
  expect(within(rail).getByText("3. Fund")).toBeInTheDocument();
  expect(screen.queryByText("1. Setup")).not.toBeInTheDocument();
  // Back is not available on the first step.
  expect(screen.queryByTestId("onboarding-back-button")).not.toBeInTheDocument();
});

test("Exit button is shown only when canExit, and fires onExitRequested", async () => {
  const onExitRequested = vi.fn();
  const { unmount } = render(<OnboardingFlow backend={mockBackend()} onExitRequested={onExitRequested} />);
  await userEvent.click(screen.getByTestId("advanced-setup-button"));
  // Without canExit there is no Exit button.
  expect(screen.queryByTestId("onboarding-exit-button")).not.toBeInTheDocument();
  unmount();

  render(<OnboardingFlow backend={mockBackend()} canExit onExitRequested={onExitRequested} />);
  await userEvent.click(screen.getByTestId("advanced-setup-button"));
  await userEvent.click(screen.getByTestId("onboarding-exit-button"));
  expect(onExitRequested).toHaveBeenCalledTimes(1);
});

test("downloading the keystore routes through the save dialog + backup", async () => {
  const saveDialog = vi.fn(async () => "/dst/keystore.yaml");
  const backend = mockBackend({ saveDialog });
  const onKeystoreSaved = vi.fn();
  render(<OnboardingFlow backend={backend} onKeystoreSaved={onKeystoreSaved} />);

  // Drive to the Keys step.
  await userEvent.click(screen.getByTestId("advanced-setup-button"));
  await userEvent.click(screen.getByTestId("onboarding-advance-button")); // setup → network
  await userEvent.click(screen.getByTestId("onboarding-advance-button")); // generate → keys
  await screen.findByTestId("onboarding-keys-step");

  await userEvent.click(screen.getByTestId("keys-download-button"));
  await waitFor(() => expect(onKeystoreSaved).toHaveBeenCalledWith("/dst/keystore.yaml"));
  expect(saveDialog).toHaveBeenCalledTimes(1);
  expect(backend.backupKeystore).toHaveBeenCalledWith("/dst/keystore.yaml");
});
