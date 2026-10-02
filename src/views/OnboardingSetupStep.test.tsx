import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, test, vi } from "vitest";

import { OnboardingSetupStep } from "./OnboardingSetupStep";
import type { OnboardingMode } from "./onboardingTypes";

function setup(overrides: Partial<Parameters<typeof OnboardingSetupStep>[0]> = {}) {
  const props = {
    mode: "generate" as OnboardingMode,
    onModePicked: vi.fn(),
    userConfigPath: "",
    onUserConfigPathChange: vi.fn(),
    deploymentConfigPath: "",
    onDeploymentConfigPathChange: vi.fn(),
    onBrowseUserConfig: vi.fn(),
    onBrowseDeployment: vi.fn(),
    errorMessage: "",
    ...overrides,
  };
  render(<OnboardingSetupStep {...props} />);
  return props;
}

test("renders both choice cards; generate is selected by default", () => {
  setup();
  expect(screen.getByTestId("setup-generate-card")).toHaveAttribute("aria-checked", "true");
  expect(screen.getByTestId("setup-existing-card")).toHaveAttribute("aria-checked", "false");
});

test("existing-path fields are hidden until 'existing' is chosen (gating)", () => {
  setup();
  expect(screen.queryByTestId("setup-existing-fields")).not.toBeInTheDocument();
});

test("shows user-config + deployment fields with Browse when existing", () => {
  setup({ mode: "existing" });
  expect(screen.getByTestId("setup-existing-fields")).toBeInTheDocument();
  expect(screen.getByTestId("setup-user-config-field")).toBeInTheDocument();
  expect(screen.getByTestId("setup-deployment-field")).toBeInTheDocument();
  expect(screen.getByTestId("setup-browse-user-config")).toBeInTheDocument();
  expect(screen.getByTestId("setup-browse-deployment")).toBeInTheDocument();
});

test("picking a card fires onModePicked", async () => {
  const props = setup();
  await userEvent.click(screen.getByTestId("setup-existing-card"));
  expect(props.onModePicked).toHaveBeenCalledWith("existing");
});

test("typing a user config path reports the trimmed value", async () => {
  const props = setup({ mode: "existing" });
  await userEvent.type(screen.getByTestId("setup-user-config-field"), "x");
  expect(props.onUserConfigPathChange).toHaveBeenCalledWith("x");
});

test("Browse buttons invoke their handlers", async () => {
  const props = setup({ mode: "existing" });
  await userEvent.click(screen.getByTestId("setup-browse-user-config"));
  await userEvent.click(screen.getByTestId("setup-browse-deployment"));
  expect(props.onBrowseUserConfig).toHaveBeenCalledTimes(1);
  expect(props.onBrowseDeployment).toHaveBeenCalledTimes(1);
});

test("shows the setup error notice", () => {
  setup({ errorMessage: "bad path" });
  expect(screen.getByTestId("setup-error-notice")).toHaveTextContent("Setup failed");
  expect(screen.getByTestId("setup-error-notice")).toHaveTextContent("bad path");
});
