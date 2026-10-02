import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, test, vi } from "vitest";
import { Button } from "./Button";

test("renders its label", () => {
  render(<Button>Click me</Button>);
  expect(screen.getByRole("button", { name: "Click me" })).toBeInTheDocument();
});

test("defaults to the neutral variant and default size", () => {
  render(<Button>Go</Button>);
  const btn = screen.getByRole("button", { name: "Go" });
  expect(btn).toHaveClass("ds-button", "ds-button--neutral", "ds-button--default");
});

test("applies the primary + compact modifier classes", () => {
  render(
    <Button variant="primary" size="compact">
      Go
    </Button>
  );
  const btn = screen.getByRole("button", { name: "Go" });
  expect(btn).toHaveClass("ds-button--primary", "ds-button--compact");
});

test("fires onClick when enabled", async () => {
  const onClick = vi.fn();
  render(<Button onClick={onClick}>Hit</Button>);
  await userEvent.click(screen.getByRole("button", { name: "Hit" }));
  expect(onClick).toHaveBeenCalledOnce();
});

test("does not fire onClick when disabled", async () => {
  const onClick = vi.fn();
  render(
    <Button disabled onClick={onClick}>
      No
    </Button>
  );
  await userEvent.click(screen.getByRole("button", { name: "No" }));
  expect(onClick).not.toHaveBeenCalled();
});
