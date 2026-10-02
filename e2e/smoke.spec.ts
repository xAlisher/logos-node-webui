import { test, expect } from "@playwright/test";

// Smoke: the app loads and shows live node status from sneg (via the dev proxy).
// The full parity e2e suite (one check per entry in docs/spec/parity-checklist.json) is
// built in P3 — this seeds the pattern.
test("loads and shows live node status", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Logos Node" })).toBeVisible();
  await expect(page.getByTestId("node-status")).toContainText(/Online|Bootstrapping/);
});
