import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, test, vi } from "vitest";

import { ChainFooter } from "./ChainFooter";

afterEach(() => vi.restoreAllMocks());

describe("ChainFooter (footer-chain-id, footer-chain-id-copy)", () => {
  test("hidden when no chain id is reported", () => {
    render(<ChainFooter chainId="" />);
    expect(screen.queryByTestId("chain-footer")).toBeNull();
  });

  test("shows 'Chain ID: <id>' when a chain id is reported", () => {
    render(<ChainFooter chainId="logos-testnet-0.3.0" />);
    expect(screen.getByTestId("footer-chain-id")).toHaveTextContent("Chain ID: logos-testnet-0.3.0");
  });

  test("copy button routes the chain id through the clipboard helper", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", { clipboard: { writeText } });
    render(<ChainFooter chainId="logos-testnet-0.3.0" />);
    await userEvent.click(screen.getByTestId("footer-chain-id-copy"));
    expect(writeText).toHaveBeenCalledWith("logos-testnet-0.3.0");
    await waitFor(() =>
      expect(screen.getByTestId("footer-chain-id-copy")).toHaveTextContent("Copied"),
    );
    vi.unstubAllGlobals();
  });
});
