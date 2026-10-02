import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, test, vi } from "vitest";

import { PowConfigView } from "./PowConfigView";

/** Last recorded call of a vi mock (ES2020 lib has no Array.prototype.at). */
function lastCall<T extends unknown[]>(calls: T[]): T {
  return calls[calls.length - 1];
}

describe("PowConfigView — render", () => {
  test("renders the three mining fields at the node defaults", () => {
    render(<PowConfigView embedded />);
    expect(screen.getByTestId("pow-config")).toBeInTheDocument();
    expect(screen.getByTestId("pow-max-threads")).toHaveValue("1");
    expect(screen.getByTestId("pow-max-tickets")).toHaveValue("2");
    expect(screen.getByTestId("pow-claim-tick")).toHaveValue("300");
  });

  test("renders a per-field info button", () => {
    render(<PowConfigView embedded />);
    expect(screen.getByTestId("pow-info-threads")).toBeInTheDocument();
    expect(screen.getByTestId("pow-info-tickets")).toBeInTheDocument();
    expect(screen.getByTestId("pow-info-tick")).toBeInTheDocument();
  });

  test("standalone (non-embedded) mode shows the Proof of Work heading", () => {
    render(<PowConfigView />);
    expect(screen.getByText("Proof of Work")).toBeInTheDocument();
  });

  test("seeds from an existing pow section, incl. max_threads=null → Auto", () => {
    render(
      <PowConfigView
        embedded
        initial={{ max_threads: null, max_tickets_per_block: 4, tick_seconds: 60 }}
      />,
    );
    // Auto threads on → the threads field is hidden.
    expect(screen.queryByTestId("pow-max-threads")).toBeNull();
    expect(screen.getByRole("switch")).toBeChecked();
    expect(screen.getByTestId("pow-max-tickets")).toHaveValue("4");
    expect(screen.getByTestId("pow-claim-tick")).toHaveValue("60");
  });
});

describe("PowConfigView — Auto threads", () => {
  test("toggling Auto hides the Search threads field", async () => {
    render(<PowConfigView embedded />);
    expect(screen.getByTestId("pow-max-threads")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("switch"));
    expect(screen.queryByTestId("pow-max-threads")).toBeNull();
  });
});

describe("PowConfigView — validation (onboard-fund-validation)", () => {
  test("a non-positive integer shows the field error and reports invalid", async () => {
    const onChange = vi.fn();
    render(<PowConfigView embedded onChange={onChange} />);
    // Initial report: valid.
    await waitFor(() => expect(onChange).toHaveBeenCalled());
    expect(lastCall(onChange.mock.calls)?.[1]).toBe(true);
    expect(screen.queryByTestId("pow-mining-field-error")).toBeNull();

    const tickets = screen.getByTestId("pow-max-tickets");
    await userEvent.clear(tickets);
    await userEvent.type(tickets, "0");

    expect(screen.getByTestId("pow-mining-field-error")).toBeInTheDocument();
    expect(lastCall(onChange.mock.calls)?.[1]).toBe(false);
  });

  test("reports the parsed config up on edit", async () => {
    const onChange = vi.fn();
    render(<PowConfigView embedded onChange={onChange} />);
    const tick = screen.getByTestId("pow-claim-tick");
    await userEvent.clear(tick);
    await userEvent.type(tick, "120");
    await waitFor(() =>
      expect(lastCall(onChange.mock.calls)?.[0]).toMatchObject({
        max_threads: 1,
        max_tickets_per_block: 2,
        tick_seconds: 120,
      }),
    );
  });

  test("surfaces a powConfigure save error", () => {
    render(<PowConfigView embedded errorMessage="disk full" />);
    expect(screen.getByTestId("pow-save-error")).toHaveTextContent(
      "Could not save the mining settings: disk full",
    );
  });
});
