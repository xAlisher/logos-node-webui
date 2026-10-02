import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, test, vi } from "vitest";

import { Header } from "./Header";

describe("Header — identity (header-logos-icon, header-title)", () => {
  test("renders the official Logos mark (an inlined SVG) and the title", () => {
    render(<Header />);
    const icon = screen.getByTestId("header-logos-icon");
    expect(icon).toHaveAttribute("role", "img");
    expect(icon.querySelector("svg")).not.toBeNull();
    expect(screen.getByTestId("header-title")).toHaveTextContent("Blockchain Node");
  });
});

describe("Header — Fund button (header-fund-button, tooltip, gating)", () => {
  test("label flips Fund ↔ Stop Mining on miningActive", () => {
    const { rerender } = render(<Header fundEnabled miningActive={false} />);
    expect(screen.getByTestId("header-fund-button")).toHaveTextContent("Fund");
    rerender(<Header fundEnabled miningActive />);
    expect(screen.getByTestId("header-fund-button")).toHaveTextContent("Stop Mining");
  });

  test("disabled unless fundEnabled; calls onFund when enabled", async () => {
    const onFund = vi.fn();
    const { rerender } = render(<Header fundEnabled={false} onFund={onFund} />);
    expect(screen.getByTestId("header-fund-button")).toBeDisabled();

    rerender(<Header fundEnabled onFund={onFund} />);
    await userEvent.click(screen.getByTestId("header-fund-button"));
    expect(onFund).toHaveBeenCalledTimes(1);
  });

  test("tooltip 'Mining runs until you stop it' shows on hover", async () => {
    render(<Header fundEnabled />);
    expect(screen.queryByRole("tooltip")).toBeNull();
    await userEvent.hover(screen.getByTestId("header-fund-button"));
    expect(screen.getByRole("tooltip")).toHaveTextContent("Mining runs until you stop it");
  });
});

describe("Header — Run button (header-run-button, stopping, gating, upgrade)", () => {
  test("label is Start Node / Stop Node per canStart/canStop", () => {
    const { rerender } = render(<Header canStart canStop={false} />);
    expect(screen.getByTestId("header-run-button")).toHaveTextContent("Start Node");
    rerender(<Header canStart={false} canStop />);
    expect(screen.getByTestId("header-run-button")).toHaveTextContent("Stop Node");
  });

  test("disabled when neither start nor stop is available", () => {
    render(<Header canStart={false} canStop={false} />);
    expect(screen.getByTestId("header-run-button")).toBeDisabled();
  });

  test("stopping shows the live 'Stopping… Ns' counter and disables", () => {
    const { rerender } = render(<Header stopping canStop stoppingSeconds={0} />);
    expect(screen.getByTestId("header-run-button")).toHaveTextContent("Stopping…");
    expect(screen.getByTestId("header-run-button")).toBeDisabled();
    rerender(<Header stopping canStop stoppingSeconds={7} />);
    expect(screen.getByTestId("header-run-button")).toHaveTextContent("Stopping… 7s");
  });

  test("click stops when canStop", async () => {
    const onStop = vi.fn();
    const onStart = vi.fn();
    render(<Header canStop onStop={onStop} onStart={onStart} />);
    await userEvent.click(screen.getByTestId("header-run-button"));
    expect(onStop).toHaveBeenCalledTimes(1);
    expect(onStart).not.toHaveBeenCalled();
  });

  test("click starts when canStart and config is fine", async () => {
    const onStart = vi.fn();
    const onRequestUpgrade = vi.fn();
    render(<Header canStart startWouldUpgrade={false} onStart={onStart} onRequestUpgrade={onRequestUpgrade} />);
    await userEvent.click(screen.getByTestId("header-run-button"));
    expect(onStart).toHaveBeenCalledTimes(1);
    expect(onRequestUpgrade).not.toHaveBeenCalled();
  });

  test("Start with a stale config opens the upgrade dialog instead of starting", async () => {
    const onStart = vi.fn();
    const onRequestUpgrade = vi.fn();
    render(<Header canStart startWouldUpgrade onStart={onStart} onRequestUpgrade={onRequestUpgrade} />);
    await userEvent.click(screen.getByTestId("header-run-button"));
    expect(onRequestUpgrade).toHaveBeenCalledTimes(1);
    expect(onStart).not.toHaveBeenCalled();
  });
});
