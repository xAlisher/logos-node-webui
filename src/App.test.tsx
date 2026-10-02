import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";

import { App } from "./App";

test("App renders the shell", () => {
  render(<App />);
  expect(screen.getByTestId("app-shell")).toBeInTheDocument();
  // Header title from BlockchainView.qml.
  expect(screen.getByRole("heading", { name: "Blockchain Node" })).toBeInTheDocument();
});
