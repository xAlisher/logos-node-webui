import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, test, vi } from "vitest";
import { Modal } from "./Modal";

test("renders nothing when closed", () => {
  render(
    <Modal open={false} title="Hidden">
      body
    </Modal>
  );
  expect(screen.queryByRole("dialog")).toBeNull();
});

test("renders title, body and footer when open", () => {
  render(
    <Modal open title="Confirm" footer={<button>OK</button>}>
      Are you sure?
    </Modal>
  );
  expect(screen.getByRole("dialog")).toBeInTheDocument();
  expect(screen.getByText("Confirm")).toBeInTheDocument();
  expect(screen.getByText("Are you sure?")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "OK" })).toBeInTheDocument();
});

test("closes on backdrop click but not on panel click", async () => {
  const onClose = vi.fn();
  render(
    <Modal open onClose={onClose} title="T">
      body
    </Modal>
  );
  await userEvent.click(screen.getByText("body"));
  expect(onClose).not.toHaveBeenCalled();
  // backdrop is the dialog's parent
  await userEvent.click(screen.getByRole("dialog").parentElement as HTMLElement);
  expect(onClose).toHaveBeenCalledOnce();
});

test("closes on Escape", async () => {
  const onClose = vi.fn();
  render(
    <Modal open onClose={onClose} title="T">
      body
    </Modal>
  );
  await userEvent.keyboard("{Escape}");
  expect(onClose).toHaveBeenCalledOnce();
});
