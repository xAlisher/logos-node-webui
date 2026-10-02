import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";
import { Progress } from "./Progress";

test("exposes the value as aria-valuenow", () => {
  render(<Progress value={42} />);
  expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "42");
});

test("sets the fill width to the percentage", () => {
  const { container } = render(<Progress value={25} max={50} />);
  const fill = container.querySelector(".ds-progress__fill") as HTMLElement;
  expect(fill).toHaveStyle({ width: "50%" });
});

test("clamps values above the max", () => {
  render(<Progress value={200} max={100} />);
  expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "100");
});

test("indeterminate drops aria-valuenow and adds the modifier", () => {
  render(<Progress indeterminate />);
  const bar = screen.getByRole("progressbar");
  expect(bar).not.toHaveAttribute("aria-valuenow");
  expect(bar).toHaveClass("ds-progress--indeterminate");
});
