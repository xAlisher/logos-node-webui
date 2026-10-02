import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";

import { App } from "./App";

// The web App feeds the shell a LIVE model from the node monitor. In jsdom there is
// no backend, so the first poll never connects → the shell shows its Connecting
// state (ready=false). We assert the shell mounts and is in that honest state;
// the operation page itself is covered by the shell/view suites (with a model) and
// the Playwright e2e (against a live node).
test("App mounts the shell and connects to the node", () => {
  render(<App />);
  expect(screen.getByTestId("app-shell")).toBeInTheDocument();
  expect(screen.getByTestId("shell-connecting")).toBeInTheDocument();
});
