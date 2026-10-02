import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { CopyButton } from "./CopyButton";

const writeText = vi.fn().mockResolvedValue(undefined);

beforeEach(() => {
  writeText.mockClear();
  Object.defineProperty(navigator, "clipboard", {
    value: { writeText },
    configurable: true,
  });
});

afterEach(() => vi.restoreAllMocks());

test("renders a copy button with an accessible label", () => {
  render(<CopyButton value="0xdead" />);
  expect(screen.getByRole("button", { name: "Copy" })).toBeInTheDocument();
});

test("writes the value to the clipboard on click", async () => {
  render(<CopyButton value="0xdeadbeef" />);
  await userEvent.click(screen.getByRole("button", { name: "Copy" }));
  expect(writeText).toHaveBeenCalledWith("0xdeadbeef");
});

test("shows the copied state after a successful copy", async () => {
  render(<CopyButton value="abc" />);
  await userEvent.click(screen.getByRole("button", { name: "Copy" }));
  await waitFor(() =>
    expect(screen.getByRole("button")).toHaveClass("ds-copybutton--copied")
  );
});
