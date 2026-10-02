// Parity harness — the machine-readable backbone of the "no feature or action left
// behind" contract. It loads the 225-entry checklist (docs/spec/parity-checklist.json,
// derived from docs/spec/ui-inventory.md + the official QML) and maintains a registry
// of ids that a view has declared it OWNS (implements + tests).
//
// Views register the ids they own by calling `registerParity([...])` at module scope.
// The parity gate (parity.test.tsx) imports every view so those registrations run,
// then compares the registry against the checklist to report / enforce coverage.

import checklistData from "../../docs/spec/parity-checklist.json";

export interface ParityEntry {
  /** Stable, unique id — the unit of parity accounting. */
  id: string;
  /** Which screen/region of the UI inventory this belongs to. */
  view: string;
  /** feature | action | state. */
  kind: string;
  /** Human-readable description of the feature/action/state. */
  desc: string;
  /** display | button | navigation | flow | input | ... */
  actionType: string;
}

/** The full parity contract, exactly as shipped in the spec (225 entries). */
export const parityChecklist: readonly ParityEntry[] = checklistData as ParityEntry[];

/** Every checklist id, for fast membership checks. */
export const checklistIds: ReadonlySet<string> = new Set(
  parityChecklist.map((e) => e.id)
);

// The registry is a module-level singleton: importing a view (its registerParity
// call runs at import time) populates it for the lifetime of the test process.
const registry = new Set<string>();

/**
 * Declare that the importing view implements + tests the given checklist ids.
 * Called at module scope by each view. Ids are deduped; registering an id that is
 * not in the checklist is allowed here but flagged by the gate (see parity.test.tsx).
 */
export function registerParity(ids: readonly string[]): void {
  for (const id of ids) registry.add(id);
}

/** Snapshot of the ids declared implemented so far. */
export function implementedIds(): ReadonlySet<string> {
  return new Set(registry);
}

/** Checklist ids that no view has claimed yet — the gap the P2/P3 agents drive to zero. */
export function uncoveredIds(): string[] {
  return parityChecklist.filter((e) => !registry.has(e.id)).map((e) => e.id);
}

/** Registered ids that don't exist in the checklist (typo / stale id) — always a bug. */
export function unknownRegisteredIds(): string[] {
  return [...registry].filter((id) => !checklistIds.has(id));
}

/** Clear the registry. Test-only; use with care — it wipes view registrations too. */
export function resetParity(): void {
  registry.clear();
}
