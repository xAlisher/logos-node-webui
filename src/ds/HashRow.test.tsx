import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { HashRow, KeyValue } from "./HashRow";

beforeEach(() => {
  Object.defineProperty(navigator, "clipboard", {
    value: { writeText: vi.fn().mockResolvedValue(undefined) },
    configurable: true,
  });
});
afterEach(() => vi.restoreAllMocks());

test("renders the label and value", () => {
  render(<HashRow label="Tip" value="0xabc123" />);
  expect(screen.getByText("Tip")).toBeInTheDocument();
  expect(screen.getByText("0xabc123")).toHaveClass("ds-hashrow__value");
});

test("uses the mono class by default", () => {
  render(<HashRow label="Tip" value="0xabc" />);
  expect(screen.getByText("0xabc")).toHaveClass("ds-hashrow__value--mono");
});

test("shows a copy button when copyable and has a value", () => {
  render(<HashRow label="Tip" value="0xabc" />);
  expect(screen.getByRole("button", { name: "Copy" })).toBeInTheDocument();
});

test("hides the copy button when copyable is false", () => {
  render(<HashRow label="Tip" value="0xabc" copyable={false} />);
  expect(screen.queryByRole("button")).toBeNull();
});

test("KeyValue is an alias of HashRow", () => {
  render(<KeyValue label="Phase" value="Following" copyable={false} />);
  expect(screen.getByText("Following")).toBeInTheDocument();
});
