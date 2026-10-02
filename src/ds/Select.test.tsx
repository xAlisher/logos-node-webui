import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, test, vi } from "vitest";
import { Select, type SelectOption } from "./Select";

const options: SelectOption[] = [
  { label: "Online", value: "online" },
  { label: "Offline", value: "offline" },
];

test("shows the placeholder when nothing is selected", () => {
  render(<Select options={options} placeholder="Pick one" aria-label="status" />);
  expect(screen.getByRole("button", { name: "status" })).toHaveTextContent("Pick one");
});

test("shows the selected option label", () => {
  render(<Select options={options} value="offline" aria-label="status" />);
  expect(screen.getByRole("button", { name: /status/i })).toHaveTextContent("Offline");
});

test("opens the popup and fires onChange with the chosen value", async () => {
  const onChange = vi.fn();
  render(<Select options={options} onChange={onChange} aria-label="status" />);
  // closed: no listbox
  expect(screen.queryByRole("listbox")).toBeNull();
  await userEvent.click(screen.getByRole("button", { name: "status" }));
  expect(screen.getByRole("listbox")).toBeInTheDocument();
  await userEvent.click(screen.getByRole("option", { name: "Offline" }));
  expect(onChange).toHaveBeenCalledWith("offline");
  // closes after choosing
  expect(screen.queryByRole("listbox")).toBeNull();
});

test("does not open when disabled", async () => {
  render(<Select options={options} disabled aria-label="status" />);
  await userEvent.click(screen.getByRole("button", { name: "status" }));
  expect(screen.queryByRole("listbox")).toBeNull();
});
