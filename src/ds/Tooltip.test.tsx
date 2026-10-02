import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, test } from "vitest";
import { Tooltip } from "./Tooltip";

test("hides the bubble until hovered", () => {
  render(
    <Tooltip label="Copied slot">
      <span>trigger</span>
    </Tooltip>
  );
  expect(screen.queryByRole("tooltip")).toBeNull();
});

test("shows the bubble on hover and hides on leave", async () => {
  render(
    <Tooltip label="Copied slot">
      <span>trigger</span>
    </Tooltip>
  );
  await userEvent.hover(screen.getByText("trigger"));
  expect(screen.getByRole("tooltip")).toHaveTextContent("Copied slot");
  await userEvent.unhover(screen.getByText("trigger"));
  expect(screen.queryByRole("tooltip")).toBeNull();
});
