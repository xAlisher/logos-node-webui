import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, test, vi } from "vitest";
import { Tabs, type TabItem } from "./Tabs";

const tabs: TabItem[] = [
  { id: "dash", label: "Dashboard" },
  { id: "wallet", label: "Wallet" },
];

test("renders a tab per item", () => {
  render(<Tabs tabs={tabs} activeId="dash" />);
  expect(screen.getAllByRole("tab")).toHaveLength(2);
});

test("marks the active tab as selected", () => {
  render(<Tabs tabs={tabs} activeId="wallet" />);
  expect(screen.getByRole("tab", { name: "Wallet" })).toHaveAttribute(
    "aria-selected",
    "true"
  );
  expect(screen.getByRole("tab", { name: "Wallet" })).toHaveClass("ds-tab--active");
});

test("fires onChange with the clicked tab id", async () => {
  const onChange = vi.fn();
  render(<Tabs tabs={tabs} activeId="dash" onChange={onChange} />);
  await userEvent.click(screen.getByRole("tab", { name: "Wallet" }));
  expect(onChange).toHaveBeenCalledWith("wallet");
});
