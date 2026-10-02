import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, test } from "vitest";

import { ToastHost, useToastHost, type ToastController } from "./ToastHost";

function Harness({ expose }: { expose: (c: ToastController) => void }) {
  const controller = useToastHost();
  expose(controller);
  return <ToastHost controller={controller} />;
}

describe("ToastHost (shell-keystore-backup-toast, shell-stop-failed-toast)", () => {
  test("nothing rendered until a toast is shown", () => {
    let c!: ToastController;
    render(<Harness expose={(x) => (c = x)} />);
    expect(screen.queryByTestId("shell-toast-host")).toBeNull();
    expect(c).toBeDefined();
  });

  test("keystore-backup success toast shows title + path", () => {
    let c!: ToastController;
    render(<Harness expose={(x) => (c = x)} />);
    act(() => void c.showToast({ variant: "success", title: "Keystore saved", detail: "/home/u/keystore.yaml", durationMs: 0 }));
    const toast = screen.getByTestId("shell-toast-success");
    expect(toast).toHaveTextContent("Keystore saved");
    expect(toast).toHaveTextContent("/home/u/keystore.yaml");
  });

  test("stop-failed error toast shows and can be dismissed", async () => {
    let c!: ToastController;
    render(<Harness expose={(x) => (c = x)} />);
    act(() => void c.showToast({ variant: "error", title: "Couldn't stop the node", detail: "timeout", durationMs: 0 }));
    expect(screen.getByTestId("shell-toast-error")).toHaveTextContent("Couldn't stop the node");
    await userEvent.click(screen.getByRole("button", { name: "Dismiss" }));
    expect(screen.queryByTestId("shell-toast-error")).toBeNull();
  });
});
