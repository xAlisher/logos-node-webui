import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";
import { Table, type TableColumn } from "./Table";

const columns: TableColumn[] = [
  { key: "height", header: "Height" },
  { key: "hash", header: "Hash", align: "right" },
];

test("renders headers and body cells", () => {
  render(
    <Table
      columns={columns}
      rows={[{ height: "5329", hash: "0xabc" }]}
    />
  );
  expect(screen.getByRole("columnheader", { name: "Height" })).toBeInTheDocument();
  expect(screen.getByRole("cell", { name: "5329" })).toBeInTheDocument();
  expect(screen.getByRole("cell", { name: "0xabc" })).toBeInTheDocument();
});

test("applies column alignment", () => {
  render(<Table columns={columns} rows={[{ height: "1", hash: "h" }]} />);
  expect(screen.getByRole("cell", { name: "h" })).toHaveStyle({ textAlign: "right" });
});

test("shows the empty state when there are no rows", () => {
  render(<Table columns={columns} rows={[]} empty="Nothing here" />);
  expect(screen.getByText("Nothing here")).toBeInTheDocument();
});

test("shows the loading state", () => {
  render(<Table columns={columns} rows={[]} loading />);
  expect(screen.getByText("Loading…")).toBeInTheDocument();
});
