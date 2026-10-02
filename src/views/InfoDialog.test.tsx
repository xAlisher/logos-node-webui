import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, test, vi } from "vitest";

import { InfoDialog } from "./InfoDialog";
import { INFO_CONTENT, INFO_TOPICS } from "./infoContent";

describe("InfoDialog", () => {
  test("closed when no topic is given", () => {
    render(<InfoDialog topic={null} />);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  test("the content set covers all 29 info topics", () => {
    expect(INFO_TOPICS).toHaveLength(29);
  });

  test("renders every topic with its title and a sections body", () => {
    for (const topic of INFO_TOPICS) {
      const { unmount } = render(<InfoDialog topic={topic} open />);
      const dialog = screen.getByRole("dialog");
      expect(within(dialog).getByText(INFO_CONTENT[topic].title)).toBeInTheDocument();
      expect(within(dialog).getByTestId("info-sections")).toBeInTheDocument();
      // WHAT IS IT is present for every topic (all have `what`).
      expect(within(dialog).getByText("WHAT IS IT")).toBeInTheDocument();
      unmount();
    }
  });

  test("the Status topic shows all four sections and the state rows", () => {
    render(<InfoDialog topic="status" open />);
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText("WHAT IS IT")).toBeInTheDocument();
    expect(within(dialog).getByText("HOW IT'S CALCULATED")).toBeInTheDocument();
    expect(within(dialog).getByText("STATES")).toBeInTheDocument();
    expect(within(dialog).getByText("DOCS")).toBeInTheDocument();
    // A few of the state labels the hero can actually show.
    expect(within(dialog).getByText("Bootstrapping")).toBeInTheDocument();
    expect(within(dialog).getByText("Disconnected")).toBeInTheDocument();
    expect(within(dialog).getByText("Node stopped")).toBeInTheDocument();
  });

  test("the DOCS link is present and copyable when a topic has docs", async () => {
    render(<InfoDialog topic="status" open />);
    const link = screen.getByTestId("info-docs-link");
    expect(link).toHaveAttribute("href", INFO_CONTENT.status.docs);
    expect(screen.getByRole("button", { name: "Copy docs link" })).toBeInTheDocument();
  });

  test("copying the docs link writes the URL to the clipboard", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });
    render(<InfoDialog topic="peers" open />);
    await userEvent.click(screen.getByRole("button", { name: "Copy docs link" }));
    expect(writeText).toHaveBeenCalledWith(INFO_CONTENT.peers.docs);
  });

  test("the DOCS section is hidden for a topic with no docs link", () => {
    // `submitted` ships with docs: "".
    expect(INFO_CONTENT.submitted.docs).toBe("");
    render(<InfoDialog topic="submitted" open />);
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).queryByText("DOCS")).toBeNull();
    expect(within(dialog).queryByTestId("info-docs-link")).toBeNull();
  });

  test("the HOW IT'S CALCULATED section is hidden when a topic has no calc", () => {
    // `autoClaim` is a behaviour, documented entirely under `what`.
    expect(INFO_CONTENT.autoClaim.calc).toBeUndefined();
    render(<InfoDialog topic="autoClaim" open />);
    expect(within(screen.getByRole("dialog")).queryByText("HOW IT'S CALCULATED")).toBeNull();
  });

  test("the STATES section is hidden when a topic lists no states", () => {
    // `miningOverview` is prose only.
    expect(INFO_CONTENT.miningOverview.states).toBeUndefined();
    render(<InfoDialog topic="miningOverview" open />);
    expect(within(screen.getByRole("dialog")).queryByText("STATES")).toBeNull();
  });

  test("Escape closes the dialog (onClose)", async () => {
    const onClose = vi.fn();
    render(<InfoDialog topic="epoch" open onClose={onClose} />);
    await userEvent.keyboard("{Escape}");
    expect(onClose).toHaveBeenCalled();
  });
});
