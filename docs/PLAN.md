# Logos Node Web UI — plan

A faithful **web replica of the official Logos node dashboard** — matching it in **style** (Logos
Design System) and **features** (every view + action). Built and verified against **sneg's live
0.3.0 node**, and ultimately served as the web UI for the DAppNode package
(`logos-blockchain-node.public.dappnode.eth`, `links.ui`).

## Source of truth
- **Official UI:** `logos-blockchain/logos-blockchain-ui` (cloned to `/extra/tmp/logos-blockchain-ui-official`,
  master). The 37 QML views define the feature set: Onboarding flow, Node Dashboard, Wallet, Accounts,
  Transfer, Mining (+ PoW config + auto-claim targets), Leader Rewards, Blocks, Explorer, Channel
  Deposit, Node Settings, Info.
- **Design system:** `logos-design-system` (`~/basecamp/refs/logos-design-system`) — tokens + components.
- **Node API:** `logos-blockchain` 0.3.0 (`/extra/tmp/0.3.0-src`) + the live sneg node, proxied in dev to
  `http://127.0.0.1:8808` (ssh tunnel to sneg `127.0.0.1:8080`).

## Stack
- **Vite + React + TypeScript**. Logos DS reimplemented as CSS custom properties + React components (the
  official app is QML/Qt; we rebuild the same design on the web — original implementation, same design).
- **State/data:** a thin typed API client over `/api` (dev proxy → sneg; prod → the node service).
- **Tests:** Vitest + Testing Library (unit/component) and Playwright (e2e against the running UI → sneg).

## Phases
- **P0 — Mapping (bg agents, in flight):** `docs/spec/ui-inventory.md` + `docs/spec/parity-checklist.json`
  (every feature/action), `docs/spec/design-system.md` (exact tokens + component specs),
  `docs/spec/api-map.md` (endpoints, real sneg payloads, which view uses each, mutating-endpoint list).
- **P1 — Foundation:** scaffold (this repo), DS tokens → `src/styles/tokens.css`, DS component library
  (`src/ds/`), API client (`src/api/`), app shell + navigation matching `BlockchainView.qml`, dev proxy.
- **P2 — Screens:** implement each official view faithfully (style + every action), wired to real node
  data. One GitHub issue per view (epic) + sub-tasks, created from the P0 maps.
- **P3 — Parity tests:** every entry in `parity-checklist.json` has a test. Unit/component tests per
  feature + Playwright e2e that drives each screen + action against sneg. A **parity gate** test iterates
  the checklist and FAILS if any feature/action lacks an implemented, tested element — "nothing left behind."
- **P4 — Package integration:** containerize (static build + reverse-proxy to the node service), wire
  `links.ui` in the DAppNode manifest so the package's "UI" button opens it.

## Acceptance
1. Visually faithful to the official app (Logos DS, same layout/components).
2. Feature-complete: every view + every action from the parity checklist implemented.
3. All parity tests green (the checklist gate passes); e2e flows work against a real node.
4. Served from the DAppNode package via `links.ui`.

## Dev
- Tunnel: `ssh -NL 8808:127.0.0.1:8080 sneg` (node API → localhost:8808).
- `npm run dev` (Vite proxies `/api` → `http://127.0.0.1:8808`), `npm test` (Vitest), `npm run e2e` (Playwright).
