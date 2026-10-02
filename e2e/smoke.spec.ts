import { test, expect } from "@playwright/test";

// Smoke: the app loads and shows the running-node operation page (header + tabs),
// wired to the live node via the dev proxy (/api -> sneg over the ssh tunnel on :8808).
test("loads the node operation page", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByTestId("shell-header")).toContainText("Blockchain Node");
  // The Node (dashboard) tab is the resting section; its status hero is present.
  await expect(page.getByTestId("status-hero")).toBeVisible();
});

// Switches across all six section tabs against the live node, asserting each view's
// section mounts (the StackLayout-equivalent only mounts the active section).
test("switches across all six tabs", async ({ page }) => {
  await page.goto("/");

  const sections: Array<[string, string]> = [
    ["Node", "view-node-dashboard"],
    ["Rewards", "view-leader-rewards"],
    ["Explorer", "view-explorer"],
    ["Wallet", "view-wallet"],
    ["Mining", "view-mining"],
    ["Settings", "view-node-settings"],
  ];

  for (const [label, testid] of sections) {
    await page.getByRole("tab", { name: label }).click();
    await expect(page.getByRole("tab", { name: label })).toHaveAttribute("aria-selected", "true");
    await expect(page.getByTestId(testid)).toBeVisible();
  }

  // Back to Node leaves us on the dashboard again.
  await page.getByRole("tab", { name: "Node" }).click();
  await expect(page.getByTestId("view-node-dashboard")).toBeVisible();
});
