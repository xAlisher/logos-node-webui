import type { ReactNode } from "react";
import "./Table.css";

export type TableAlign = "left" | "center" | "right";

export interface TableColumn {
  key: string;
  header: ReactNode;
  align?: TableAlign;
}

export type TableRow = Record<string, ReactNode>;

export interface TableProps {
  columns: TableColumn[];
  rows: TableRow[];
  /** Shown centered when there are no rows. */
  empty?: ReactNode;
  /** Shows a loading state row instead of rows. */
  loading?: boolean;
  /** Stable key per row; defaults to the row index. */
  rowKey?: (row: TableRow, index: number) => string;
  className?: string;
}

/**
 * LogosTable. 36px header bar (--background-button, 8px radius) over 64px rows
 * with a 1px --border-tertiary-muted divider. Header text 12px/500
 * --text-secondary; body cells 14px --text. See docs/spec §Table.
 */
export function Table({
  columns,
  rows,
  empty = "No data",
  loading = false,
  rowKey,
  className,
}: TableProps) {
  return (
    <table className={["ds-table", className].filter(Boolean).join(" ")}>
      <thead className="ds-table__head">
        <tr>
          {columns.map((c) => (
            <th
              key={c.key}
              className="ds-table__th"
              style={{ textAlign: c.align ?? "left" }}
              scope="col"
            >
              {c.header}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {loading ? (
          <tr>
            <td className="ds-table__state" colSpan={columns.length}>
              Loading…
            </td>
          </tr>
        ) : rows.length === 0 ? (
          <tr>
            <td className="ds-table__state" colSpan={columns.length}>
              {empty}
            </td>
          </tr>
        ) : (
          rows.map((row, i) => (
            <tr key={rowKey?.(row, i) ?? String(i)} className="ds-table__row">
              {columns.map((c) => (
                <td
                  key={c.key}
                  className="ds-table__td"
                  style={{ textAlign: c.align ?? "left" }}
                >
                  {row[c.key]}
                </td>
              ))}
            </tr>
          ))
        )}
      </tbody>
    </table>
  );
}
