# Plan 005: Warehouse handling screen, part A (floor plan + bin panel)
Status: Draft (ready for GO) · Date: 2026-11-22
Executor: Sonnet 5.5 sub-agent "A" (runs in parallel with plan 006, sub-agent "B") · Reviewer: Opus

## Goal and context
First step of a larger UI overhaul of the plan 004 frontend (`frontend/web`, mock data in `src/api/mock/`). The new screen **Inventory → Warehouse handling** is split in two plans:
- **005 (this plan):** route, nav, data, warehouse floor plan, bin panel. Until 006 lands, the map area is a simple list of warehouse cards (name, sacks, % full, low-stock badge) that opens the floor plan.
- **006 (parallel):** the animated SVG map with pulsing pins and truck replay. Its last step swaps the card list for the map.

Screen behaviour owned here:
1. Pick a warehouse → animated zoom into a **top-down 2D floor plan**: bins (A1, A2, B1 …) drawn as rack blocks in an auto grid, filled by % of capacity, coloured by status.
2. Click a bin → side panel (bottom sheet at <768px) with its lots/products/sacks, plus "Receive into bin" and "Transfer from bin".

Current state (plan 004): warehouses have `id, name, address`; bins have `id, warehouseId, code`. Stock comes from the mock store via `src/api` (`api.listStock`, `api.getRefs`, `useRefs`, `useWrite` in `src/api/hooks.ts`). Nav items live in `src/lib/roles.ts`, routes in `src/router.tsx` (code-based TanStack routes).

## Decisions and constraints
- Read-only visualisation: stock changes still go only through the existing mock `api` (movements). No new write paths. CLAUDE.md invariants unchanged.
- Role access: area `inventory` (Owner, WH manager, WH staff, Dispatcher). Action buttons only for roles with area `stockops` (Dispatcher sees no buttons).
- Nav: first item under Inventory, label "Warehouse handling", path `/inventory/handling`.
- Floor: top-down 2D. Auto grid from bin code: leading letters = row, trailing number = column (A1 → row A, col 1). Codes that don't match go in a trailing "Other" row.
- Bin status colours: ok; low (bin holds a product below its reorder point, same rule as Alerts); near full (≥ 90% of capacity).
- Capacity: `capacitySacks` on Bin, positive integer, default 500 for seed and new bins, editable in Warehouses & bins. % full can exceed 100% (shown, not blocked; capacity is not enforced by the ledger).
- Animations: zoom-in from the card/pin into the floor (CSS transform/opacity); bin fill/drain animates when stock changes (transition on height/scale). `prefers-reduced-motion`: instant or opacity-only.
- Pre-fill: bin panel buttons link to `/inventory/receiving?binId=…` and `/inventory/transfers?fromBinId=…`; those forms read the search param for their default value.
- No new dependencies.
- Responsive: usable at 375px, no page-level horizontal scroll.

### Contract with plan 006 (parallel work, do not change without updating both plans)
- 005 creates `src/features/inventory/handling/WarehouseHandling.tsx`, which renders `<WarehouseCards warehouses={summaries} onSelect={setSelectedId} />` in the overview area, where `summaries: { id: string; name: string; sacks: number; pctFull: number; low: boolean }[]` (exported type `WarehouseSummary` from `src/api/index.ts`).
- 006 builds `WarehouseMap` with the **same props** and, in its final step, replaces `WarehouseCards` with `WarehouseMap` in `WarehouseHandling.tsx` (one import + one JSX line).
- 005 never creates or edits files under `handling/map/`. 006 edits no other 005 file.

## Files to create or change
- `shared/src/inventory.ts`: `capacitySacks` on Bin (positive int, default 500) and BinInput; test in `shared/`
- `frontend/web/src/api/mock/seed.ts`: capacity 500 on seed bins
- `frontend/web/src/api/index.ts`, `hooks.ts`: `getWarehouseOverview()` → `{ warehouses: WarehouseSummary[]; bins: BinSummary[] }` (BinSummary: id, warehouseId, code, row, col, sacks, kg, capacitySacks, pctFull, low, lots: { lotId, productId, sacks }[]), and a hook
- `frontend/web/src/api/mock/store.test.ts` (or a new `overview.test.ts`): overview tests
- `frontend/web/src/features/inventory/handling/WarehouseHandling.tsx`, `WarehouseCards.tsx`, `WarehouseFloor.tsx`, `BinPanel.tsx`, `handling.css`, `WarehouseHandling.test.tsx`
- `frontend/web/src/router.tsx`, `src/lib/roles.ts`: route + nav item
- `frontend/web/src/features/setup/Warehouses.tsx`: capacity field on bins
- `frontend/web/src/features/inventory/Receiving.tsx`, `Transfers.tsx`: read pre-fill search params

## Steps
1. Add `capacitySacks` to the Bin schema + seed; schema unit test (positive int, default 500).
2. Add `getWarehouseOverview()` + hook; unit tests.
3. Route `/inventory/handling`, nav item (first in Inventory), role guard.
4. `WarehouseCards` (temporary overview) and `WarehouseHandling` page with selected-warehouse state.
5. `WarehouseFloor`: auto grid, fill levels, status colours, zoom-in and fill/drain animations, reduced motion.
6. `BinPanel`: lot list, two action links (hidden without `stockops`); bottom sheet on mobile.
7. Pre-fill search params in Receiving and Transfers; capacity field in Warehouses & bins.
8. Responsive check (375 / 768 / 1280). Run `pnpm lint`, `pnpm format:check`, `pnpm typecheck`, `pnpm test`, `pnpm build`.

## Tests and acceptance criteria
- Unit: overview sacks per warehouse and per bin equal `listStock` totals; pctFull = sacks / capacity × 100; grid row/col parsed from codes (A1, B12, odd codes → Other).
- Component: nav shows "Warehouse handling" first in Inventory; one card per warehouse; selecting one shows one block per bin; clicking a bin lists its lots; Dispatcher sees no action buttons; "Receive into bin" / "Transfer from bin" open forms with the bin pre-selected; after a receive, the bin's sacks update.
- Manual: animations smooth, reduced motion respected, no horizontal scroll at 375px.

## Isolation
- Each sub-agent runs in its own git worktree and branch (`plan-005` for A, `plan-006` for B), created from the commit the user makes before GO. Plan 006's integration step runs after `plan-005` is merged to `main`, then `plan-006` is rebased/merged. Opus reviews each branch before merge. No pushes.

## Risks and rollback
- Parallel edits with 006: avoided by the file ownership in the contract above.
- Rollback: git revert; the schema field is additive with a default.

## Open questions
- (none)

## Progress
- [x] Interview complete (2 rounds, 2026-11-22; split into 005 + 006)
- [ ] GO received
- [ ] Steps 1–8
- [ ] Acceptance checks pass
- [ ] Opus review
