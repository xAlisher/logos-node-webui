import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";
import { App } from "./App";

afterEach(() => vi.restoreAllMocks());

test("renders node status from the API", async () => {
  vi.spyOn(globalThis, "fetch").mockResolvedValue(
    new Response(
      JSON.stringify({
        cryptarchia_info: { lib: "x", lib_slot: 1, tip: "y", slot: 2, height: 5329, state: "Online" },
        phase: "Following",
      }),
      { status: 200 }
    )
  );
  render(<App />);
  await waitFor(() => expect(screen.getByTestId("node-status")).toHaveTextContent("Online"));
  expect(screen.getByTestId("node-status")).toHaveTextContent("5329");
});
