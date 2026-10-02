import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, test, vi } from "vitest";
import { Switch } from "./Switch";

test("reflects the checked state via aria + modifier class", () => {
  render(<Switch checked onChange={() => {}} />);
  const sw = screen.getByRole("switch");
  expect(sw).toHaveAttribute("aria-checked", "true");
  expect(sw).toHaveClass("ds-switch--on");
});

test("toggles to the opposite value on click", async () => {
  const onChange = vi.fn();
  render(<Switch checked={false} onChange={onChange} />);
  await userEvent.click(screen.getByRole("switch"));
  expect(onChange).toHaveBeenCalledWith(true);
});

test("renders an optional label", () => {
  render(<Switch checked={false} label="Enable mining" />);
  expect(screen.getByText("Enable mining")).toBeInTheDocument();
});

test("does not fire when disabled", async () => {
  const onChange = vi.fn();
  render(<Switch checked={false} disabled onChange={onChange} />);
  await userEvent.click(screen.getByRole("switch"));
  expect(onChange).not.toHaveBeenCalled();
});
