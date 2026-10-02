import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, test, vi } from "vitest";

import { OnboardingNetworkStep } from "./OnboardingNetworkStep";

function setup(overrides: Partial<Parameters<typeof OnboardingNetworkStep>[0]> = {}) {
  const props = {
    locked: false,
    userConfigPath: "",
    custom: false,
    onCustomChange: vi.fn(),
    customDeploymentPath: "",
    onCustomDeploymentPathChange: vi.fn(),
    onBrowseDeployment: vi.fn(),
    peersText: "/ip4/1.2.3.4/udp/3000/quic-v1/p2p/12D3KooWabc",
    onPeersTextChange: vi.fn(),
    needsDeployment: false,
    needsPeers: false,
    errorMessage: "",
    ...overrides,
  };
  render(<OnboardingNetworkStep {...props} />);
  return props;
}

test("renders the two deployment choice cards + peers field + info button", () => {
  setup();
  expect(screen.getByTestId("network-default-card")).toHaveAttribute("aria-checked", "true");
  expect(screen.getByTestId("network-custom-card")).toHaveAttribute("aria-checked", "false");
  expect(screen.getByTestId("network-peers-field")).toBeInTheDocument();
  expect(screen.getByTestId("network-peers-info")).toBeInTheDocument();
});

test("custom deployment path field is hidden on the default card", () => {
  setup();
  expect(screen.queryByTestId("network-deployment-path-field")).not.toBeInTheDocument();
});

test("custom card shows the deployment path field + Browse", () => {
  setup({ custom: true });
  expect(screen.getByTestId("network-deployment-path-field")).toBeInTheDocument();
  expect(screen.getByTestId("network-browse-deployment")).toBeInTheDocument();
});

test("choosing a card toggles custom", async () => {
  const props = setup();
  await userEvent.click(screen.getByTestId("network-custom-card"));
  expect(props.onCustomChange).toHaveBeenCalledWith(true);
});

test("editing the peers textarea reports the new text", async () => {
  const props = setup({ peersText: "" });
  await userEvent.type(screen.getByTestId("network-peers-field"), "a");
  expect(props.onPeersTextChange).toHaveBeenCalledWith("a");
});

test("opens the bootstrap-peers info dialog", async () => {
  setup();
  await userEvent.click(screen.getByTestId("network-peers-info"));
  expect(screen.getByRole("dialog")).toHaveTextContent("Bootstrap peers");
});

test("locked notice appears and the fields become read-only", () => {
  setup({ locked: true, custom: true, userConfigPath: "/home/n/user_config.yaml" });
  const notice = screen.getByTestId("network-locked-notice");
  expect(notice).toHaveTextContent("These settings are already written");
  expect(notice).toHaveTextContent("/home/n/user_config.yaml");
  expect(screen.getByTestId("network-peers-field")).toHaveAttribute("readonly");
  // Browse is hidden while locked.
  expect(screen.queryByTestId("network-browse-deployment")).not.toBeInTheDocument();
});

test("validation notice: needs a deployment file when custom", () => {
  setup({ custom: true, needsDeployment: true });
  expect(screen.getByTestId("network-validation-notice")).toHaveTextContent(
    "Choose a deployment file to continue",
  );
});

test("validation notice: needs at least one peer", () => {
  setup({ needsPeers: true });
  expect(screen.getByTestId("network-validation-notice")).toHaveTextContent(
    "Add at least one bootstrap peer to continue",
  );
});

test("shows the generate error notice", () => {
  setup({ errorMessage: "no route to host" });
  expect(screen.getByTestId("network-error-notice")).toHaveTextContent(
    "Could not generate a config",
  );
  expect(screen.getByTestId("network-error-notice")).toHaveTextContent("no route to host");
});
