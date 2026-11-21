# Plan 007: Interactive Davao warehouse map (MapLibre)
Status: Done · Date: 2026-11-22
Executor: Opus 5.5 (user request) · Reviewer: none (Opus executes)

## Goal and context
Replace the drawn map on **Inventory → Warehouse handling** (`frontend/web/src/features/inventory/handling/map/`, plan 006) with a **real, interactive map of Davao City** you can drag, zoom, tilt and rotate. The warehouses sit at their real locations, shown as the 3D-looking building with a floating label card from the user's reference image. Trucks drive along real roads for recent transfers between warehouses.

History: this plan first restyled the drawn SVG map (the "illustrated" look from the user's reference image: angled buildings, asphalt roads, label cards with pins). Mid-work the user switched to a real interactive map. The building, label card and truck SVG pieces from that work (uncommitted in `map/WarehouseMap.tsx` and `map/map.css`) are reused as map markers.

Kept from plan 006: the `WarehouseMapProps` contract (`warehouses`, `onSelect`), `truckTrips()` (last-24h inter-warehouse transfers), pin status (green OK; amber pin, red pulse and "Low stock" text when low), keyboard-selectable warehouses, the reduced-motion fallback, and the map filling the content area (full-height wrapper in `WarehouseHandling.tsx`).

## Decisions and constraints
- Interview (2026-11-22):
  - Real map with **MapLibre GL**, which CLAUDE.md already lists as the map library. Basemap: **light, faded** (OpenFreeMap "positron" style, free, no API key), so warehouses, routes and trucks stand out.
  - Warehouses: a 3D-look building marker with its own roof colour (Calinan orange, Panacan green, Toril blue, fallback slate), plus a label card ("name · N sacks • P% full", with a "Low stock" line when low). Clicking a marker, or pressing Enter on it, calls `onSelect`.
  - Trucks: shown only for recent transfers (no parked trucks). They follow **saved route lines** per warehouse pair, stored in the app (`map/routes.ts`). The routes are traced once at build time with the public OSRM demo router, using the approximate public district coordinates below. There are no routing calls at runtime. A pair without a saved route uses a straight line.
  - Locations: warehouses get **latitude/longitude**, set by **clicking on a small map** in the Warehouses & bins form, which also shows the current spot. These are optional draft schema fields. A warehouse with no location is not drawn, and the map shows "N warehouses have no location yet; set it in Warehouses & bins".
  - Seed coordinates (approximate; correct them in setup): Toril 7.0186, 125.4970; Calinan 7.1897, 125.4553; Panacan 7.1460, 125.6580.
  - Controls: zoom +/- buttons, a "Fit all warehouses" button, and tilt/rotate (right-drag or two-finger drag), plus a compass that resets the bearing. The initial view fits all placed warehouses.
- Truck motion: the truck marker is interpolated along the route with `requestAnimationFrame` (about 6 s per trip) and rotated to its heading. Each trip plays once, as in plan 006. With reduced motion, the truck sits at the destination with "Transferred Xh ago".
- External requests at runtime: only map tiles, style and fonts from OpenFreeMap (public data, no user data sent). This is recorded in the CLAUDE.md Stack line.
- New dependency: `maplibre-gl` (latest stable version at least two weeks old). The map is lazy-loaded with the handling screen, so other screens don't pay for its size.
- Tests: jsdom has no WebGL, so tests mock `maplibre-gl` (`vi.mock`) and check our markers, controls and callbacks. The real map is checked by hand.
- Accessibility: markers are buttons with labels (name, sacks, % full, low stock), map controls have labels, and colour is never the only status signal.

## Files to create or change
- `frontend/web/package.json`, `pnpm-lock.yaml`: add `maplibre-gl`
- `shared/src/inventory.ts` (and its test): optional `lat` (−90..90) and `lng` (−180..180) on Warehouse and WarehouseInput (draft contract)
- `frontend/web/src/api/mock/seed.ts`: seed coordinates
- `frontend/web/src/api/index.ts`: optional `lat` and `lng` on `WarehouseSummary`
- `frontend/web/src/features/inventory/handling/map/WarehouseMap.tsx`: MapLibre map, building/label markers (React portals into marker elements), truck animation, controls, "no location" notice
- `frontend/web/src/features/inventory/handling/map/layout.ts`: roof colours, map style URL, default Davao view (the SVG positions and roads are removed)
- `frontend/web/src/features/inventory/handling/map/routes.ts` (new): saved route coordinates per warehouse pair, plus `routeBetween(fromId, toId, from, to)` (reversed when needed, straight-line fallback)
- `frontend/web/src/features/inventory/handling/map/map.css`: marker, card, truck and pulse styles, reduced motion
- `frontend/web/src/features/inventory/handling/map/LocationPicker.tsx` (new): small click-to-place map for the warehouse form
- `frontend/web/src/features/inventory/handling/map/WarehouseMap.test.tsx`, `routes.test.ts`: tests with a mocked `maplibre-gl`
- `frontend/web/src/features/setup/Warehouses.tsx`: location picker in the warehouse form
- `frontend/web/src/features/inventory/handling/WarehouseHandling.tsx`: lazy-load the map (the full-height wrapper is already added)
- `CLAUDE.md`: Stack line notes OpenFreeMap tiles for MapLibre

## Steps
1. Add `maplibre-gl`. Add schema `lat`/`lng` with a test, seed coordinates, and the fields on `WarehouseSummary`.
2. Trace the three seed routes once with OSRM and save simplified coordinates in `routes.ts`. Add `routeBetween` with unit tests (known pair, reversed pair, unknown pair falls back to a straight line).
3. `WarehouseMap`: MapLibre with the positron style, initial fit to the warehouses, building/label markers as buttons, controls (zoom, fit all, compass, tilt/rotate), and the "no location" notice.
4. Truck markers: animate along the route with heading rotation, play once, reduced-motion fallback.
5. `LocationPicker` and its field in the Warehouses & bins form.
6. Lazy-load the map in `WarehouseHandling`; update CLAUDE.md.
7. Tests (mocked maplibre): one marker per placed warehouse; low-stock state; select by click and Enter; the unplaced-warehouse notice; a truck for a recent inter-warehouse transfer; fit all calls `fitBounds`; a picker click sets lat/lng. Existing handling tests still pass.
8. Run `pnpm lint`, `pnpm format:check`, `pnpm typecheck`, `pnpm test`, `pnpm build`. Check by hand in a browser at 1280px and 375px: drag, zoom, tilt, select, truck drive, reduced motion.

## Tests and acceptance criteria
- The tests in step 7 pass, and all existing tests still pass.
- Manual: real Davao streets on a light basemap; drag, zoom, tilt and rotate work with mouse and touch; markers stay readable; trucks follow the road; the map fills the content area; no page-level horizontal scroll at 375px.

## Risks and rollback
- Tile service availability: OpenFreeMap is free and best-effort. If tiles fail, the markers still render over a blank map, and the style URL is one constant to swap.
- Bundle size: maplibre-gl is large, so it is lazy-loaded.
- Seed coordinates and traced routes are approximate: correct the coordinates in setup, and re-trace the routes if warehouses move.
- Rollback: git revert; the schema fields are optional.

## Open questions
- (none)

## Progress
- [x] Interview complete (2 rounds, then the change to a real map, 2026-11-22)
- [x] GO received
- [x] Steps 1–8 (maplibre-gl pinned 6.17.0, the newest release at least two weeks old; routes traced 2026-11-22; `pointAlong` route helper added to `routes.ts` with tests; maplibre test double in `map/maplibre.mock.ts`)
- [x] Acceptance checks pass (lint, format:check, typecheck, test, build). Headless browser check: markers, cards, controls and fit-to-view render and the 375px page fits; street tiles don't draw in headless Edge (no GPU), so the user still needs to check tiles, drag, tilt and the truck drive in a real browser.
