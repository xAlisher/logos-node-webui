import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, test, vi } from "vitest";

import { OnboardingWelcome } from "./OnboardingWelcome";

const base = {
  busy: false,
  busyMessage: "",
  errorMessage: "",
  quickStartAvailable: true,
  onQuickStart: () => {},
  onAdvanced: () => {},
};

test("renders the welcome screen with title and both buttons", () => {
  render(<OnboardingWelcome {...base} />);
  expect(screen.getByText("Blockchain Node")).toBeInTheDocument();
  expect(screen.getByTestId("quick-start-button")).toHaveTextContent("Quick start");
  expect(screen.getByTestId("advanced-setup-button")).toHaveTextContent("Advanced");
});

test("hides Quick start and relabels advanced when no peers are configured", () => {
  render(<OnboardingWelcome {...base} quickStartAvailable={false} />);
  expect(screen.queryByTestId("quick-start-button")).not.toBeInTheDocument();
  expect(screen.getByTestId("advanced-setup-button")).toHaveTextContent("Set up your node");
});

test("fires quick start and advanced callbacks", async () => {
  const onQuickStart = vi.fn();
  const onAdvanced = vi.fn();
  render(<OnboardingWelcome {...base} onQuickStart={onQuickStart} onAdvanced={onAdvanced} />);
  await userEvent.click(screen.getByTestId("quick-start-button"));
  await userEvent.click(screen.getByTestId("advanced-setup-button"));
  expect(onQuickStart).toHaveBeenCalledTimes(1);
  expect(onAdvanced).toHaveBeenCalledTimes(1);
});

test("busy overlay replaces the buttons and shows the message", () => {
  render(<OnboardingWelcome {...base} busy busyMessage="Setting up your node…" />);
  expect(screen.getByTestId("welcome-busy-overlay")).toHaveTextContent("Setting up your node…");
  expect(screen.getByTestId("welcome-busy-overlay")).toHaveTextContent(
    "Writing your config, creating your keys, and starting the node.",
  );
  expect(screen.queryByTestId("quick-start-button")).not.toBeInTheDocument();
});

test("shows the error notice when generation fails", () => {
  render(<OnboardingWelcome {...base} errorMessage="disk full" />);
  const notice = screen.getByTestId("welcome-error-notice");
  expect(notice).toHaveTextContent("Could not generate a config");
  expect(notice).toHaveTextContent("disk full");
});
