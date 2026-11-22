# Plan 010: Isometric warehouse map redesign (design handoff)
Status: Done · Date: 2026-11-22
Executor: Sonnet (admin UI, no stock/money writes) · Reviewer: Opus

## Goal and context
Redesign **Inventory → Warehouse handling** (`/inventory/handling`) from the design handoff at
`C:\Users\Arch Coles\Desktop\claude projects\DTRH\Warehouse map visualization design\design_handoff_warehouse_map\`:
- `README.md`: the full spec (colors, sizes, camera values, timings). It is high fidelity, so its values are final. **Read it in full before starting.**
- `isometric.ts`: SVG geometry for the buildings, bins view and arcs, plus the status palette `PAL`. Lift it almost verbatim.
- `Warehouse Handling Map.dc.html`: an interactive prototype to open in a browser. It is a reference only, not code to copy.

Summary of the design:
- All warehouses are isometric SVG buildings on a softened, tilted positron basemap (pitch 45, bearing −12).
- Each marker shows how full the warehouse is.
- Transfers animate as two looping green dots per route (GeoJSON circle layers, `setData` every frame).
- Clicking a warehouse flies the camera in (zoom 15.6, pitch 58). The marker opens into a 3D bins view (`interior(bins)`), and a 340px glass detail panel slides in on the right with fill, bin cards and in-transit transfers.
- The **Fit all warehouses** button moves out of the map into the page title row.

Current code (plan 007), all under `frontend/web/src/features/inventory/handling/`:
- `map/WarehouseMap.tsx`:
  - `MapMarker` is a portal into `maplibregl.Marker`.
  - `Building` and `WarehouseMarker` draw the label card, pin and roof colours.
  - `TruckMarker` plays once per transfer from the last 24h, using `truckTrips`.
  - `addRoads` and `fitAll`.
- `map/map.css` styles the map; `map/layout.ts` holds `MAP_STYLE`, `DAVAO_CENTER` and `roofColours`.
- `map/routes.ts` holds `SAVED_ROUTES`, `routeBetween` and `pointAlong`.
- `map/maplibre.mock.ts` is the test double.
- `WarehouseHandling.tsx`: `onSelect` currently swaps the map for `WarehouseFloor` plus `BinPanel` (with the stock-ops actions).
- `WarehouseFloor.tsx` exports `binStatus`.
- `maplibre-gl` is pinned at **6.17.0**. The README's warning about `fitBounds` with pitch/bearing refers to 4.7. Use the README's `cameraForBounds` recipe anyway; it is safe on both.

Data: `WarehouseSummary` (`sacks`, `pctFull`, `low`, `lat`, `lng`) and `BinSummary` (`code`, `sacks`, `capacitySacks`, `pctFull`) from `useWarehouseOverview`. The panel's address comes from `refs.warehouses` (shared `Warehouse.address`), through `useRefs`.

## Decisions and constraints
- Interview (2026-11-22):
  - **Direction A · Gabled only.** Hard-code it, with no direction state and no B code (`glass` and `arc` are not lifted from `isometric.ts`). Transfers follow `routeBetween` (the saved roads), drawn as a casing plus a `#bbf7d0` route.
  - **Floor plan access:** clicking a bin card in the panel opens the existing `WarehouseFloor` + `BinPanel` view with that bin selected. The panel header also gets an "Open floor plan" button. The "All warehouses" button returns to the map.
  - **Recent transfers, not "in transit":** keep the `truckTrips` 24h window and loop the dots for those trips. The legend reads "Recent transfer" and the panel section reads "RECENT TRANSFERS" ("Out to {name}" / "In from {name}", "{n} sacks"). Revisit when Phase 3 trips give a real in-transit state.
  - **Low stock:** keep a small amber "Low stock" text line in the label card and the panel header, with no pulse. Include it in the marker's aria-label.
- Read-only UI. No stock or money writes. Stock actions stay in the existing `BinPanel`.
- Status rule: 0% = empty, ≥90% = near full, otherwise in use. Use the same thresholds as `binStatus`, and share one function rather than duplicating it.
- Keep the plan 007 behaviour:
  - the unplaced-warehouses notice
  - keyboard-operable markers with full `aria-label`s
  - the reduced-motion fallback (dots parked at the route midpoint)
  - the lazy-loaded map
  - the `NavigationControl`
- Drop `roofColours` and the pin. The building colour now shows fill status.
- External requests: OpenFreeMap as today. The Carto positron fallback is used only on style or source fetch errors (README). It is a new public tile host, so add it to the CLAUDE.md Stack line.
- No new dependencies.
- Tests mock maplibre (jsdom has no WebGL). Check the real map by hand.

## Files to create or change
- `map/isometric.ts` (new, from the handoff, with a unit test for `status` and the geometry output)
- `map/WarehouseMap.tsx`:
  - basemap softening on `style.load`, plus the fallback style
  - `ResizeObserver`
  - camera fit, select and back
  - new markers
  - flow and dot layers replacing `TruckMarker`
  - legend
- `map/WarehousePanel.tsx` (new): the detail panel
- `map/map.css`: restyle, removing dead truck, pin and roof classes
- `map/layout.ts`: initial view (pitch, bearing, zoom 10.4, center), fallback style; remove `roofColours`
- `WarehouseHandling.tsx`: Fit all button in the title row; selection state lifted here; open the floor view from the panel (bin card or button)
- `map/WarehouseMap.test.tsx`, `WarehouseHandling.test.tsx`: update for the new markers, panel and flows
- `CLAUDE.md`: Stack line (Carto fallback host)

## Steps
1. Add `isometric.ts` with tests. Share the status function with `binStatus`.
2. Update `layout.ts`: initial view and fallback style; remove `roofColours`.
3. Map init: softening pass, fallback on fetch errors, resize on `style.load` and from a `ResizeObserver`, restyled controls, compact attribution.
4. Camera: `fitAll` (the README recipe), select fly-in, back.
5. Markers: direction A (label card with a "Low stock" line when low, plus `gabled(pct)`; when selected, a dark pill plus `interior(bins)`), unselected and selected states, hover lift, dimming on the inner button, z-index for the selected marker. Re-render the portals; never recreate the `Marker` instances.
6. Flows: `wh-flow` and `wh-dots` sources and layers from `truckTrips` plus `routeBetween`. A single requestAnimationFrame loop calls `setData`; cancel it on unmount. Reduced motion parks the dots at the midpoint.
7. `WarehousePanel`: header, fill, bins grid, in transit; slide in and out, keeping the last selected warehouse's content mounted while it slides out. Close runs Back.
8. `WarehouseHandling.tsx`: Fit all button in the title row. A bin card click or the "Open floor plan" button opens `WarehouseFloor` + `BinPanel` (with the bin preselected when a card was clicked).
9. Legend, bottom-left.
10. Tests, then `pnpm lint`, `format:check`, `typecheck`, `test`, `build`. Then a check by hand in a real browser.

## Tests and acceptance criteria
- Unit tests:
  - `status` thresholds (0, 89, 90, 100)
  - `gabled` / `glass` / `interior` return SVG for 0% and 100% and for empty bins
  - the dot position math, including the reduced-motion midpoint
- Component tests (maplibre mocked):
  - one marker per placed warehouse, with the aria-label "{name}, {pct}% full"
  - selecting a warehouse calls `flyTo` with zoom 15.6 / pitch 58, opens the panel with the right sacks, capacity and bins, and dims the other markers
  - close calls Back (`fitAll` animated) and the panel slides out
  - the Fit all button in the title row calls the camera fit
  - flows: the sources are added for in-transit trips; nothing is added when there are no trips
  - the unplaced notice still shows
- The 375px page has no horizontal scroll; the panel is capped at `calc(100% - 24px)`.
- By hand (real browser): softened basemap, cities-only labels, the fly-in and back animations, looping dots, the panel slide.
- All checks pass: lint, format:check, typecheck, test, build.

## Risks and rollback
- Basemap layer ids differ between styles. Every softening change is wrapped in try/catch (README), so a missed layer only means less softening.
- Per-frame `setData` cost is small (≤ a few points). If it becomes an issue, lower the frame rate.
- Rollback: revert the commit. There are no data or schema changes.

## Open questions
- None. All four interview questions are answered; see Decisions.

## Progress checklist
- [x] Interview complete (2026-11-22)
- [x] GO received
- [x] Steps 1-10 (softening, `dotProgress` and the fetch-error check live in `map/layout.ts` rather than a new module; new `layout.test.ts`; `maplibre.mock.ts` extended; `interior()` escapes bin codes and wraps to a new row every 3 bins; the camera is refit once on the first style load, after the canvas has its real size)
- [x] Acceptance checks pass (lint, format:check, typecheck, test, build). Headless Edge check: markers, label cards, gauges, legend, restyled controls and the title-row button render; basemap tiles do not draw without a GPU, as in plan 007.
- [ ] By hand in a real browser: softened basemap and cities-only labels, fly-in and back, looping dots, panel slide, and how the three Davao label cards sit at the fit-all zoom (Calinan and Toril are close and overlap in the headless shot)
- [ ] Opus review
