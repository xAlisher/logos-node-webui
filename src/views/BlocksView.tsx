import { registerParity } from "../test/parity";
import type { BlockRow as BlockRowData } from "./blocks/blockModel";
import { BlockRow } from "./blocks/BlockRow";
import { TableHeaderCell } from "./blocks/TableHeaderCell";
import { useBlockModel, type BlockModelStatus } from "./blocks/useBlockModel";
import "./blocks/blocks.css";

// The blocks table (official BlocksView.qml). Embedded in the Explorer tab as its
// resting state. Owns parity-checklist.json "view": "Blocks Table".
registerParity([
  "blocks-table", // latest 100, newest first; Timestamp/Block/Consensus/TXs columns
  "blocks-row-expand", // tap a row to expand/collapse its detail
  "blocks-pol-expand", // proof-of-leadership subgroup toggles within a row
  "blocks-tx-expand", // transaction delegates toggle open
  "blocks-hash-copies", // copy buttons on block header / PoL / tx fields
  "blocks-unparsed-fallback", // unparsed block → raw-JSON fallback + "Unparsed block"
  "blocks-sort-indicators", // decorative sort triangles in the header (not wired)
  "blocks-empty-states", // start node / waiting for state / next block / slot absent
]);

export interface BlocksViewProps {
  /**
   * Controlled block list. When provided the table renders these rows and does
   * no fetching (used by the Explorer host and by tests). When omitted the view
   * self-feeds from the block-model hook.
   */
  blocks?: BlockRowData[];
  /** Controlled status, paired with `blocks`. */
  status?: BlockModelStatus;
  /** Whether the node is running (drives the self-feed + the empty states). */
  nodeRunning?: boolean;
  /**
   * When set, the list was filtered to this slot and it isn't present — shows
   * the "Slot N isn't in this session's blocks." empty state.
   */
  filterSlotAbsent?: number | null;
}

const COLUMNS: Array<{ text: string; cls: string; sortable?: boolean }> = [
  { text: "Timestamp", cls: "th-cell--timestamp" },
  { text: "Block", cls: "th-cell--block" },
  { text: "Consensus", cls: "th-cell--consensus" },
  { text: "TXs", cls: "th-cell--txs", sortable: false },
];

export function BlocksView({
  blocks: controlled,
  status: controlledStatus,
  nodeRunning = false,
  filterSlotAbsent = null,
}: BlocksViewProps) {
  // Controlled when a parent (ExplorerView host / a test) supplies the rows;
  // otherwise feed from the hook. (The hook runs unconditionally to satisfy the
  // rules-of-hooks; it no-ops when the node is off.)
  const self = useBlockModel(controlled === undefined ? nodeRunning : false);
  const blocks = controlled ?? self.blocks;
  const status = controlledStatus ?? self.status;

  const emptyText = resolveEmpty(status, filterSlotAbsent);

  return (
    <section className="blocks-view" data-testid="blocks-table">
      <div className="blocks-view__frame">
        <div className="blocks-view__header" role="row">
          {COLUMNS.map((c) => (
            <div key={c.text} className={`blocks-view__hcol ${c.cls}`}>
              <TableHeaderCell text={c.text} sortable={c.sortable} />
            </div>
          ))}
          <div className="blocks-view__hcol th-cell--chevron" />
        </div>

        <div className="blocks-view__list">
          {blocks.length === 0 ? (
            <div className="blocks-view__empty" data-testid="blocks-empty">
              {emptyText}
            </div>
          ) : (
            blocks.map((b, i) => <BlockRow key={b.id || `row-${i}`} block={b} />)
          )}
        </div>
      </div>
    </section>
  );
}

/** The four blocks-table empty states, in the official's wording. */
function resolveEmpty(status: BlockModelStatus, filterSlotAbsent: number | null): string {
  if (filterSlotAbsent !== null && filterSlotAbsent !== undefined) {
    return `Slot ${filterSlotAbsent} isn't in this session's blocks.`;
  }
  if (status === "off") return "Start the node to see blocks arrive.";
  if (status === "loading") return "Waiting for the node to report its state…";
  return "Waiting for the next block…";
}
