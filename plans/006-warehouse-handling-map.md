# Plan 006: Warehouse handling screen, part B (animated map + trucks)
Status: Done · Date: 2026-11-22
Executor: Sonnet 5.5 sub-agent "B" (runs in parallel with plan 005, sub-agent "A") · Reviewer: Opus

## Goal and context
Second half of the new **Inventory → Warehouse handling** screen in `frontend/web` (plan 004 frontend, mock data in `src/api/mock/`). Plan 005 builds the route, data, floor plan and bin panel, with a temporary card list where the map goes. This plan builds the **animated stylised map of Davao City** that replaces that card list.

The map shows:
1. Davao City as inline SVG (simplified coastline/Davao Gulf, a few main roads), drawn by hand; no real geodata needed.
2. One pin per warehouse (seed: Toril, Calinan, Panacan), pulsing; amber/red pulse when the warehouse has low stock. Label with name, sacks, % full.
3. Clicking a pin calls `onSelect(id)`; plan 005 then zooms into the floor plan.
4. **Truck replay:** each transfer between two different warehouses in the last 24h drives once along the road between them when the map opens; a transfer made while the screen is open drives right away. Visual only; stock moved instantly (no in-transit state; real vehicle stock is Phase 3).

Existing pieces to use: `api.listMovements()` (movements with `at`, `type`, `from`, `to` bin ids, …) and `useRefs()` in `src/api/hooks.ts` (bins → warehouseId). TanStack Query; `useWrite` invalidates all queries after writes, so a new transfer refetches movements.

## Decisions and constraints
- Stylised SVG map (round 1 interview, 2026-11-22). No map library, no tiles, no key, no new dependencies. Real MapLibre map is for Phase 3 Live map.
- Pin positions are map-art coordinates (SVG x/y) in `map/layout.ts`, keyed by warehouse id, plus a road path (SVG path data) per warehouse pair. Unknown warehouses (created in Warehouses & bins) get a fallback position spread along a default road, and trucks to them use a straight line. No lat/lng in the schema (YAGNI; real coordinates come with Phase 3).
- Animations: CSS keyframes for pin pulse; trucks move along the road path (SVG `offset-path`/`offsetDistance` or `<animateMotion>`; pick one, keep it simple). `prefers-reduced-motion`: no pulse, no truck motion (show a static truck icon with a "Transferred Xh ago" label instead).
- Read-only. No writes, no changes to the mock store.
- Responsive: SVG scales with `viewBox`, no horizontal page scroll at 375px; pins keep ≥ 44px tap targets.
- Accessible: pins are buttons with labels (name, sacks, % full, low-stock state); keyboard selectable.

### Contract with plan 005 (parallel work, do not change without updating both plans)
- Props: `WarehouseMap({ warehouses, onSelect })` with `warehouses: { id: string; name: string; sacks: number; pctFull: number; low: boolean }[]` and `onSelect: (id: string) => void`. Define this props type locally in `map/WarehouseMap.tsx` (structurally equal to 005's `WarehouseSummary`) so this work does not wait for 005.
- 006 creates files only under `src/features/inventory/handling/map/`. It edits no 005 file except the final integration step below.
- Final step (run only after plan 005 is Done): in `handling/WarehouseHandling.tsx`, replace `WarehouseCards` with `WarehouseMap` (import + JSX line), delete `WarehouseCards.tsx` if nothing else uses it, and update the 005 component test that expects cards so it expects map pins.

## Files to create or change
- `frontend/web/src/features/inventory/handling/map/WarehouseMap.tsx`
- `frontend/web/src/features/inventory/handling/map/layout.ts` (pin positions, road paths, fallback)
- `frontend/web/src/features/inventory/handling/map/trucks.ts` (pure: `truckTrips(movements, binToWarehouse, now)` → `{ id, fromWarehouseId, toWarehouseId, at, sacks }[]`)
- `frontend/web/src/features/inventory/handling/map/trucks.test.ts`
- `frontend/web/src/features/inventory/handling/map/WarehouseMap.test.tsx`
- `frontend/web/src/features/inventory/handling/map/map.css`
- Final step only: `handling/WarehouseHandling.tsx`, `handling/WarehouseCards.tsx` (delete), `handling/WarehouseHandling.test.tsx`

## Steps
1. `layout.ts`: SVG viewBox, coastline/roads art, pin positions for the 3 seed warehouses, road paths per pair, fallback for unknown ids.
2. `trucks.ts` + unit tests.
3. `WarehouseMap.tsx` + `map.css`: map art, pulsing pins (status colours), labels, `onSelect`, reduced motion.
4. Truck replay: read movements, compute trips, animate each once on mount; animate new trips as they appear (track already-played ids).
5. Component tests. Run `pnpm lint`, `pnpm format:check`, `pnpm typecheck`, `pnpm test`.
6. **After plan 005 is Done:** integration step from the contract; rerun all checks plus `pnpm build`; responsive check (375 / 768 / 1280).

## Tests and acceptance criteria
- Unit (`trucks.ts`): only `transfer` movements whose from/to bins are in different warehouses produce trips; movements older than 24h are excluded; same-warehouse transfers and receipts/adjustments produce none.
- Component: one pin per warehouse; a low warehouse's pin has the warning state; clicking or pressing Enter on a pin calls `onSelect` with its id; a recent inter-warehouse transfer renders one truck.
- After integration: the 005 tests pass with the map in place of the cards.
- Manual: smooth pulse and trucks, reduced motion respected, no horizontal scroll at 375px.

## Isolation
- Each sub-agent runs in its own git worktree and branch (`plan-005` for A, `plan-006` for B), created from the commit the user makes before GO. Plan 006's integration step runs after `plan-005` is merged to `main`, then `plan-006` is rebased/merged. Opus reviews each branch before merge. No pushes.

## Risks and rollback
- Hand-drawn map is not geographically exact: accepted, it's a stylised overview.
- `offset-path` support is good in current browsers; if a test env lacks it, tests assert on rendered elements, not motion.
- Parallel edits with 005: avoided by file ownership; integration is a separate final step.
- Rollback: git revert; the map folder is self-contained.

## Open questions
- (none)

## Progress
- [x] Interview complete (shared with 005, 2026-11-22)
- [x] GO received
- [x] Steps 1–5
- [x] Step 6 (after 005 Done)
- [x] Acceptance checks pass
- [x] Opus review (2026-11-22: rounded % labels)
