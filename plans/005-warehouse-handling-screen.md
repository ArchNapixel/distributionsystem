# Plan 005: Warehouse handling screen (animated map + warehouse view)
Status: Draft (ready for GO) · Date: 2026-11-22
Executor: Sonnet · Reviewer: Opus

## Goal and context
First step of a larger UI overhaul of the plan 004 frontend (`frontend/web`, mock data in `src/api/mock/`). This plan covers only one new screen: **Inventory → Warehouse handling**.

The screen shows:
1. **An animated map** with all warehouses (seed: Toril, Calinan, Panacan in Davao City) as markers. Markers show live stock status (fill level, low-stock warning).
2. **Click a warehouse** → animated zoom into a **graphical warehouse view**: a floor plan of its bins (A1, A2, B1 …) drawn as racks/stacks, filled in proportion to sacks held, coloured by status.
3. **Click a bin** → side panel with its lots/products/sacks and shortcuts to Receiving / Transfer pre-filled with that bin.

Current state (plan 004): warehouses have `id, name, address` only; bins have `id, warehouseId, code` only. No coordinates, no layout, no map library installed. Stock balances come from the mock store via `src/api`.

Further UI changes ("major changes" to plan 004 screens) get their own plans after this one.

## Decisions and constraints
- Read-only visualisation: all stock changes still go through the existing mock `api` (movements only). No new write paths. Invariants in CLAUDE.md unchanged.
- Role access: same as "Inventory: stock" in the plan 004 role matrix (Owner, WH manager, WH staff; Dispatcher view-only, no action shortcuts).
- Respect `prefers-reduced-motion`: animations become instant/opacity-only.
- Usable at 375px (side panel becomes a bottom sheet), no page-level horizontal scroll.
- Draft contract additions in `shared/src/inventory.ts` (pending answers below): warehouse `lat`/`lng`, bin layout position (`x`, `y`, `capacitySacks`).
- Interview round 1 (2026-11-22):
  - Map: stylised SVG map of Davao City (inline SVG: coastline, main roads, warehouse pins). No map library, no tile provider, no key. Real MapLibre map stays for Phase 3 Live map.
  - Warehouse view: top-down 2D floor plan; bins are rack blocks filled by % of capacity, coloured by status (ok / low / near full).
  - Animations (all): pulsing pins (amber/red when the warehouse has low-stock items); animated zoom from map into the warehouse floor; bins fill/drain when stock changes; trucks drive along roads for recent inter-warehouse transfers.
  - Bin layout: auto grid from bin codes (letter = row, number = column). Bin capacity in sacks added to the Warehouses & bins form.
- Interview round 2 (2026-11-22):
  - Trucks: visual replay only. Each inter-warehouse transfer from the last 24h drives once along the road when the map opens; a new transfer drives right away. Stock still moves instantly (no mock in-transit state; real vehicle stock is Phase 3).
  - Bin capacity: default 500 sacks for seed bins and new bins; editable per bin.
  - Bin panel actions: "Receive into bin" (Receiving pre-filled with warehouse + bin) and "Transfer from bin" (Transfers pre-filled with source bin). No adjust or cycle-count shortcuts. Hidden for Dispatcher.
  - Nav: first item under Inventory ("Warehouse handling"), above Stock on hand.

## Files to create or change
- `shared/src/inventory.ts`: optional `lat`, `lng` on Warehouse; `x`, `y`, `capacitySacks` on Bin (draft)
- `frontend/web/src/api/mock/seed.ts`: coordinates, bin layout, capacities
- `frontend/web/src/api/index.ts`, `hooks.ts`: `warehouseOverview()` (per-warehouse and per-bin sacks, kg, % full, low-stock flags)
- `frontend/web/src/features/inventory/handling/*`: `WarehouseMap.tsx`, `WarehouseFloor.tsx`, `BinPanel.tsx`
- `frontend/web/src/router.tsx`, `src/lib/roles.ts`: new route + nav item
- `frontend/web/src/index.css`: animation keyframes / motion tokens
- `frontend/web/src/features/setup/Warehouses.tsx`: capacity field on bins
- `frontend/web/src/features/inventory/Receiving.tsx`, `Transfers.tsx`: read pre-fill search params
- No new dependencies (SVG + CSS animations).
- tests next to the code

## Steps
1. Extend draft schemas + seed (coordinates, bin layout, capacity). Unit test for schema rules.
2. Add `warehouseOverview()` to the mock api + unit test (totals match stock-on-hand).
3. Build `WarehouseMap` (inline SVG Davao map, pulsing pins, truck replay of last-24h inter-warehouse transfers via existing movements).
4. Build `WarehouseFloor` (animated zoom-in, auto grid from bin codes, animated fill/drain by % of capacity).
5. Build `BinPanel` (lot list; Receive into bin / Transfer from bin via route search params read by the Receiving and Transfers forms). Add bin capacity field to Warehouses & bins.
6. Route, nav item, role guard; reduced-motion; responsive checks (375 / 768 / 1280).
7. Run lint, format:check, typecheck, test, build.

## Tests and acceptance criteria
- Unit: overview totals equal stock-on-hand totals per warehouse and per bin; % full = sacks / capacity; only inter-warehouse transfers from the last 24h produce truck trips (same-warehouse transfers don't).
- Component: "Receive into bin" / "Transfer from bin" open their forms with the bin pre-selected.
- Component: map renders one marker per warehouse; clicking a marker shows its floor with one shape per bin; clicking a bin shows its lots; Dispatcher sees no action shortcuts.
- After a Receiving or Transfer, returning to the screen shows updated fill levels.
- Manual: animations smooth, reduced-motion respected, no horizontal page scroll at 375px.

## Risks and rollback
- Map tiles need an external provider (and maybe a key) if a real map is chosen; a stylised SVG map has none.
- Animation performance on low-end phones: keep to CSS transforms/opacity.
- Rollback: git revert; additive schema fields are optional.

## Open questions
- (none)

## Progress
- [x] Interview round 1
- [x] Interview complete (2 rounds)
- [ ] GO received
- [ ] Steps 1–7
- [ ] Acceptance checks pass
- [ ] Opus review
