import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, test } from "vitest";
import { StatCard } from "./StatCard";

test("renders the value and label", () => {
  render(<StatCard value="5329" label="Block height" />);
  expect(screen.getByText("5329")).toHaveClass("ds-statcard__value");
  expect(screen.getByText("Block height")).toHaveClass("ds-statcard__label");
});

test("omits the info affordance when no info is given", () => {
  render(<StatCard value="1" label="x" />);
  expect(screen.queryByLabelText("More info")).toBeNull();
});

test("surfaces info text via a tooltip on hover", async () => {
  render(<StatCard value="1" label="x" info="Slots since genesis" />);
  const info = screen.getByLabelText("More info");
  expect(info).toBeInTheDocument();
  await userEvent.hover(info);
  expect(screen.getByRole("tooltip")).toHaveTextContent("Slots since genesis");
});
