import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";
import { Card } from "./Card";

test("renders children inside the surface", () => {
  render(<Card>Panel body</Card>);
  expect(screen.getByText("Panel body")).toHaveClass("ds-card");
});

test("merges a custom className", () => {
  render(<Card className="extra">x</Card>);
  expect(screen.getByText("x")).toHaveClass("ds-card", "extra");
});

test("forwards arbitrary props", () => {
  render(<Card data-testid="frame">x</Card>);
  expect(screen.getByTestId("frame")).toBeInTheDocument();
});
