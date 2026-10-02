import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";
import { Badge } from "./Badge";

test("renders an uppercase-able label", () => {
  render(<Badge>active</Badge>);
  expect(screen.getByText("active")).toHaveClass("ds-badge__label");
});

test("defaults the color token to accent orange", () => {
  const { container } = render(<Badge>x</Badge>);
  const badge = container.querySelector(".ds-badge") as HTMLElement;
  expect(badge.style.getPropertyValue("--ds-badge-color")).toBe("var(--accent-orange)");
});

test("recolors via the color prop", () => {
  const { container } = render(<Badge color="var(--success)">ok</Badge>);
  const badge = container.querySelector(".ds-badge") as HTMLElement;
  expect(badge.style.getPropertyValue("--ds-badge-color")).toBe("var(--success)");
});

test("renders a leading icon when provided", () => {
  render(<Badge icon={<svg data-testid="ic" />}>x</Badge>);
  expect(screen.getByTestId("ic")).toBeInTheDocument();
});
