import { describe, expect, test } from "vitest";

import {
  checklistIds,
  implementedIds,
  parityChecklist,
  registerParity,
  uncoveredIds,
  unknownRegisteredIds,
} from "./parity";

// Importing the shell pulls in every view module (via src/views/index), and each view
// registers the parity ids it owns at import time. This is what populates the registry
// the gate measures. Side-effect imports — we want their module-scope registration.
import "../shell/Shell";
import "../views";

// THE PARITY GATE.
//
// Flip DECLARE_COMPLETE to `true` in the final phase, once every checklist id is claimed
// by a view that implements AND tests it. From that point the gate FAILS the build if any
// of the 225 ids is unimplemented/untested (uncovered) — that is the whole point of the
// contract: "no feature or action left behind" becomes enforceable, not aspirational.
//
// Until then the gate PASSES but prints the uncovered count, so P2/P3 can watch it fall.
const DECLARE_COMPLETE = true;

describe("parity gate", () => {
  test("loads the full 225-id contract", () => {
    expect(parityChecklist.length).toBe(225);
    expect(checklistIds.size).toBe(225);
  });

  test("registry round-trips the ids it is given", () => {
    const sample = parityChecklist.slice(0, 3).map((e) => e.id);
    registerParity(sample);
    const impl = implementedIds();
    for (const id of sample) expect(impl.has(id)).toBe(true);
  });

  test("no view registers an id that isn't in the contract", () => {
    expect(unknownRegisteredIds()).toEqual([]);
  });

  test("coverage report (gate is advisory until completeness is declared)", () => {
    const total = parityChecklist.length;
    const covered = implementedIds().size;
    const uncovered = uncoveredIds();

    // Visible in `npm test` output — the number P2/P3 drive to zero.
    console.log(
      `[parity] ${covered}/${total} ids implemented, ${uncovered.length} uncovered ` +
        `(gate ${DECLARE_COMPLETE ? "ENFORCING" : "advisory"})`
    );

    if (DECLARE_COMPLETE) {
      // Enforcing: every contract id must be owned by an implemented+tested view.
      expect(uncovered, `uncovered parity ids:\n${uncovered.join("\n")}`).toEqual([]);
    } else {
      // Advisory: just a sanity invariant (coverage can't exceed the contract).
      expect(covered).toBeLessThanOrEqual(total);
    }
  });
});
