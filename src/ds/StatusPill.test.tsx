import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";
import { StatusPill } from "./StatusPill";

test("defaults the label to the status name", () => {
  render(<StatusPill status="online" />);
  expect(screen.getByText("online")).toBeInTheDocument();
});

test("renders a custom label", () => {
  render(<StatusPill status="online" label="Online" />);
  expect(screen.getByText("Online")).toBeInTheDocument();
});

test("exposes the status via a data attribute and color token", () => {
  const { container } = render(<StatusPill status="error" label="Error" />);
  const pill = container.querySelector(".ds-statuspill") as HTMLElement;
  expect(pill.dataset.status).toBe("error");
  expect(pill.style.getPropertyValue("--ds-status-color")).toBe("var(--error)");
});

test("maps bootstrapping to the primary token", () => {
  const { container } = render(<StatusPill status="bootstrapping" />);
  const pill = container.querySelector(".ds-statuspill") as HTMLElement;
  expect(pill.style.getPropertyValue("--ds-status-color")).toBe("var(--primary)");
});
