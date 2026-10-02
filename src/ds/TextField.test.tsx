import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, test, vi } from "vitest";
import { TextField } from "./TextField";

test("renders an input with placeholder", () => {
  render(<TextField placeholder="Enter amount" />);
  expect(screen.getByPlaceholderText("Enter amount")).toHaveClass("ds-textfield");
});

test("renders an associated label when provided", () => {
  render(<TextField label="Amount" />);
  const input = screen.getByLabelText("Amount");
  expect(input).toBeInTheDocument();
  expect(input).toHaveClass("ds-textfield");
});

test("fires onChange as the user types", async () => {
  const onChange = vi.fn();
  render(<TextField placeholder="x" onChange={onChange} />);
  await userEvent.type(screen.getByPlaceholderText("x"), "abc");
  expect(onChange).toHaveBeenCalledTimes(3);
});

test("honors the disabled state", () => {
  render(<TextField placeholder="x" disabled />);
  expect(screen.getByPlaceholderText("x")).toBeDisabled();
});
