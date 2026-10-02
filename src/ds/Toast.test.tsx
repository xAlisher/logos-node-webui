import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, test, vi } from "vitest";
import { Toast } from "./Toast";

test("renders the message with the info role by default", () => {
  render(<Toast message="Synced" />);
  expect(screen.getByRole("status")).toHaveTextContent("Synced");
});

test("uses the alert role and error modifier for errors", () => {
  render(<Toast message="Node unreachable" variant="error" />);
  const toast = screen.getByRole("alert");
  expect(toast).toHaveTextContent("Node unreachable");
  expect(toast).toHaveClass("ds-toast--error");
});

test("renders no dismiss button without onDismiss", () => {
  render(<Toast message="x" />);
  expect(screen.queryByRole("button", { name: "Dismiss" })).toBeNull();
});

test("fires onDismiss when the dismiss button is clicked", async () => {
  const onDismiss = vi.fn();
  render(<Toast message="x" onDismiss={onDismiss} />);
  await userEvent.click(screen.getByRole("button", { name: "Dismiss" }));
  expect(onDismiss).toHaveBeenCalledOnce();
});
