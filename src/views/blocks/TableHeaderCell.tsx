import "./blocks.css";

export interface TableHeaderCellProps {
  text: string;
  /** Show the (decorative) sort triangles. Default true. */
  sortable?: boolean;
}

/**
 * TableHeaderCell — a blocks-table column header: label + a stacked up/down
 * triangle pair. Faithful replica of controls/TableHeaderCell.qml.
 *
 * IMPORTANT: the triangles are DECORATIVE — the official has no click handler
 * and no sort wiring (see docs/spec/ui-inventory.md "Ambiguities"). They are
 * rendered as indicators only; there is intentionally no sort behaviour.
 */
export function TableHeaderCell({ text, sortable = true }: TableHeaderCellProps) {
  return (
    <div className="th-cell">
      <span className="th-cell__label">{text}</span>
      {sortable && (
        <span className="th-cell__sort" aria-hidden="true" data-testid="sort-indicator">
          <svg className="th-cell__tri" width="10" height="6" viewBox="0 0 10 6">
            <path d="M5 0L10 6H0z" fill="currentColor" />
          </svg>
          <svg className="th-cell__tri" width="10" height="6" viewBox="0 0 10 6">
            <path d="M5 6L0 0h10z" fill="currentColor" />
          </svg>
        </span>
      )}
    </div>
  );
}
