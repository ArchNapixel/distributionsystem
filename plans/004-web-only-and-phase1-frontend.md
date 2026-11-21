# Plan 004: Web-only system and Phase 1 frontend (mock data)
Status: In Progress (awaiting manual check and Opus review) · Date: 2026-11-22
Executor: Sonnet · Reviewer: Opus

## Goal and context
The user wants two things:
1. Start Phase 1 (Foundation and Warehouse Inventory, ROADMAP.md) by **seeing the website frontend first**.
2. **Run every module of the whole system in one website.** There will be no separate driver app: the Expo driver app from plan 001 / CLAUDE.md "Stack" is dropped, and the driver screens become a section of the website.

This plan builds a clickable frontend running on **mock data**. It has the navigation shell for every module of the system, and working screens for every Phase 1 module. The real backend (schema, stock ledger, auth, API) comes in later plans, which replace the mock layer screen by screen.

Current state (after plan 003):
- `frontend/admin` (`@drh/admin`) is a Vite 8 + React 19 + TS 6 + Tailwind 4 skeleton with one page and one render test.
- `shared/` (`@drh/shared`) has zod 4 schemas.
- The backend has only `/health`.
- The monorepo commands are in CLAUDE.md "Commands".

## Decisions (planning interview, 2026-11-22)
- **One website, role-based sections.**
  - Rename `frontend/admin` to `frontend/web` (`@drh/web`).
  - Office screens are desktop-first but usable down to 375px.
  - The driver section lives at `/driver` and is mobile-first, with large touch targets.
  - Phase 1 has no driver features, so `/driver` shows a mobile home page with "Coming in Phase 3" cards (My trip, Stops, Proof of delivery, Remittance).
  - The PWA manifest and service worker are added in Phase 3, when there are offline features (YAGNI).
- **Mock data first.**
  - Screens read and write through a typed `api` module, `src/api/`. In this plan it's backed by an in-memory mock store seeded with realistic Davao rice data.
  - Mock writes last for the browser session only and reset on reload.
  - Every page shows a "Demo data" badge in the top bar.
  - Function signatures and types match what the real API will expose, so swapping in the real API later only changes `src/api/`.
- **Mock store follows the domain invariants (CLAUDE.md), so the demo behaves like the real thing:**
  - Stock changes only by appending a movement `{from_location, to_location, product, lot, qty_sacks}`, and balances update together with it.
  - Stock can't go negative at real locations: the mock rejects the change with a clear error, which the form displays.
  - There is no edit or delete of movements. Corrections are reversing adjustments.
  - This is a UI simulation only. **The real enforcement is server-side, in the later ledger plan (Opus).**
- **Units:** stock is counted in whole sacks. Each product has a sack size in kg (for example 25 or 50). Screens show sacks with a total in kg beside them.
- **Language:** English only. UI strings are plain literals (no i18n library, YAGNI). Revisit if drivers need Cebuano.
- **Demo roles:**
  - The top bar has a role switcher with Owner, Warehouse manager, Warehouse staff, Dispatcher and Driver. The menu and routes follow the role matrix below.
  - The switcher is removed when Supabase Auth lands. Server-side RBAC remains the real control; this is UI-only.
- **Style:**
  - shadcn/ui components on Tailwind 4, neutral greys, one green accent, light and dark mode (following the system setting).
  - Office screens use dense tables. Driver screens use large touch targets.
- **Libraries (from the CLAUDE.md stack):** TanStack Router (file-based), TanStack Query, TanStack Table, shadcn/ui, react-hook-form + zod (`@hookform/resolvers`), lucide-react icons. MapLibre is not added until a screen needs a map (Phase 2 customer pins or Phase 3 live map).
- **Domain types:** zod schemas for the Phase 1 entities go in `shared/src/inventory.ts` and are marked as a **draft contract**. The ledger and schema plan may revise them.
- **GPS (recorded for Phase 3, nothing built now):** the browser sends GPS only while the trip screen is open, keeping the screen awake with the Wake Lock API. Gaps are shown on the map. If gaps hurt the pilot, revisit with dedicated hardware trackers.
- **Stack change, recorded in CLAUDE.md:**
  - The "Driver app" line becomes: driver screens in `frontend/web`, offline-first PWA in Phase 3, with a service worker, an IndexedDB outbox of idempotent commands (push) and cursor pull.
  - Background GPS is limited, as described above.
  - ROADMAP Phase 3 "Driver app (offline-first)" becomes "Driver web screens (PWA, offline-first)".

### Role matrix (demo)
| Area | Owner | WH manager | WH staff | Dispatcher | Driver |
|---|---|---|---|---|---|
| Dashboard | ✓ | ✓ | ✓ | ✓ | |
| Inventory: stock, movements, lots, alerts | ✓ | ✓ | ✓ | view | |
| Receiving, transfers, cycle counts | ✓ | ✓ | ✓ | | |
| Adjustments / write-offs | ✓ | ✓ | | | |
| Products, warehouses & bins | ✓ | ✓ | view | view | |
| Suppliers, purchase orders | ✓ | ✓ | | | |
| Audit log | ✓ | ✓ | | | |
| Later-phase modules (coming soon) | ✓ | ✓ | | ✓ | |
| `/driver` section | | | | | ✓ |

### Navigation (whole system)
- **Dashboard**
- **Inventory:** Stock on hand · Movements · Receiving · Transfers · Adjustments & write-offs · Cycle counts · Lots · Alerts
- **Purchasing:** Suppliers · Purchase orders
- **Setup:** Products · Warehouses & bins
- **Sales** (Phase 2, coming soon): Customers · Price lists · Orders · Picking · Invoices
- **Delivery** (Phase 3, coming soon): Trips · Vehicles · Drivers · Live map · Reconciliation
- **Money** (Phase 4, coming soon): Payments · AR aging · Remittances · Credit
- **Fleet** (Phase 5, coming soon): Maintenance · Fuel · Documents & expiry
- **Reports** (Phase 6, coming soon)
- **Admin:** Audit log · Users & roles (coming soon) · Opening stock import (coming soon: needs the real ledger for its dry-run)

"Coming soon" pages are one shared component showing the module name, its roadmap phase and a short description. There are no fake screens for later phases.

## Phase 1 screens (mock data)
1. **Dashboard:** KPI tiles (sacks and kg per warehouse, low-stock count, lots older than 90 days), recent movements.
2. **Stock on hand:** a table by warehouse, bin, product and lot, with sacks, kg and a low-stock badge. Filters for warehouse, product and search.
3. **Movements:** a read-only ledger table (time, type, from, to, product, lot, sacks, user, reference). Filter by product and warehouse.
4. **Receiving:** a form (supplier, optional PO, warehouse, bin, product, new or existing lot, sacks). It creates a supplier-to-bin movement. Fields are validated with zod.
5. **Transfers:** from warehouse and bin to warehouse and bin, product, lot, sacks. It's blocked if the source doesn't have enough stock.
6. **Adjustments & write-offs:**
   - Fields: location, product, lot, sacks (plus or minus), reason code (damaged, spoiled/moisture, pest, count correction, other) and a note.
   - The photo is required for write-offs. In the mock it's an image picker with a preview and no upload.
   - A write-off moves stock to the virtual "loss" location.
7. **Cycle counts:** start a count for a warehouse or bin, enter counted sacks per line, and review the variance (system vs counted, as sacks and %). Posting creates count-correction adjustments.
8. **Lots:** a list and a detail view (supplier, milling date, moisture %, grade, received date, current sacks by location).
9. **Alerts:** low stock (below the product's reorder point) and aging (received more than 90 days ago, based on the mock received date).
10. **Products:** list, create and edit (variety, brand, sack size kg, reorder point in sacks, active).
11. **Warehouses & bins:** list warehouses, then their bins. Create and edit both.
12. **Suppliers:** list, create and edit. **Purchase orders:** list, create (supplier, lines of product and sacks), and statuses Draft, Ordered, Partially received, Received, Cancelled. Receiving against a PO updates its received quantities.
13. **Audit log:** a read-only table of mock actions (who, when, action, entity).

## Files to create or change
- Move `frontend/admin/` to `frontend/web/`. Rename the package in `package.json` to `@drh/web`.
- `frontend/web/`:
  - `components.json` (shadcn)
  - `src/components/ui/*` (shadcn-generated)
  - `src/components/layout/*` (shell, sidebar, top bar, role switcher, demo badge, coming-soon page)
  - `src/routes/**` (TanStack file routes per screen above)
  - `src/features/<module>/*` (screen components and forms)
  - `src/api/index.ts` (typed API surface) and `src/api/mock/*` (seed data and in-memory store)
  - `src/lib/roles.ts` (role matrix and nav config)
  - `src/lib/format.ts` (sacks, kg and date formatting)
  - tests next to the code they cover
- `shared/src/inventory.ts` (draft zod schemas: Product, Warehouse, Bin, Lot, Supplier, PurchaseOrder, StockBalance, Movement, form inputs) and its export in `shared/src/index.ts`
- `CLAUDE.md`: the Stack "Driver app" line, the Repo line (`frontend/web`, no `frontend/driver`) and the Commands (`@drh/web`)
- `ROADMAP.md`: reword the Phase 3 driver item
- `pnpm-lock.yaml` (dependency changes)

## Steps
1. Rename `frontend/admin` to `frontend/web` and `@drh/admin` to `@drh/web`. Run `pnpm install`, then confirm typecheck and test still pass.
2. Add the dependencies (latest stable, checked at execution) and initialise shadcn/ui with the green accent theme and dark mode. Add only the components that are used.
3. Add the draft zod schemas in `shared/src/inventory.ts`, with unit tests for the key validation rules (sacks are a positive integer, write-offs need a reason and a photo).
4. Build the mock store and the `api` module:
   - seed data: 3 Davao warehouses with bins, about 12 rice products, lots, suppliers, POs and stock
   - an append-only movement log with the balance projection
   - rejection of negative stock
   - unit tests
5. Build the layout shell:
   - TanStack Router routes
   - sidebar and top bar
   - role switcher, with the role kept in `localStorage` wrapped in try/catch
   - the demo-data badge
   - nav filtered by role
   - route guard that redirects to an "Not available for your role" page
   - coming-soon pages
   - `/driver` mobile home
6. Build screens 1–3 (Dashboard, Stock on hand, Movements).
7. Build screens 4–7 (Receiving, Transfers, Adjustments, Cycle counts), with react-hook-form + zod. Errors show next to the fields, and the mock's insufficient-stock error shows on the form.
8. Build screens 8–13 (Lots, Alerts, Products, Warehouses & bins, Suppliers & POs, Audit log).
9. Check the responsive layout at 375px, 768px and 1280px. The sidebar collapses to a menu button on mobile, and wide tables scroll inside their own container, never the whole page.
10. Update CLAUDE.md and ROADMAP.md as listed above.
11. Run the full checks (acceptance below) and tick the progress items.

## Tests and acceptance criteria
- `pnpm lint`, `pnpm format:check`, `pnpm typecheck`, `pnpm test` and `pnpm build` pass.
- **Unit tests:**
  - mock store: receiving increases the bin balance; a transfer moves stock between locations with the total unchanged; a transfer or adjustment beyond the balance is rejected and nothing changes; a write-off moves stock to the loss location; posting a cycle count creates corrections equal to the variance
  - shared schemas: the rules listed in step 3
- **Component tests (Testing Library):**
  - each role sees exactly its menu items from the matrix
  - a forbidden route shows the "not available" page
  - the Receiving form shows field errors on invalid input and updates Stock on hand on valid submit
  - the Transfer form shows the insufficient-stock error
- **Manual check (the user):**
  - `pnpm --filter @drh/web dev` runs
  - every Phase 1 screen in the nav works with mock data
  - the Driver role lands on `/driver` with the mobile layout
  - no horizontal page scroll at 375px
  - "Demo data" is visible on every page
- No real stock or money writes, no backend calls, and no secrets.

## Risks and rollback
- **Rework when the real ledger lands:** keep the draft schemas and `src/api` signatures close to the planned API. The ledger plan may change them, and that cost is accepted.
- **Mock logic being mistaken for real enforcement:** it's labelled "Demo data" everywhere, and code comments say server-side enforcement comes in the ledger plan.
- **Web GPS and iOS offline limits** (Phase 3): recorded in CLAUDE.md, and the decision gets revisited at the pilot.
- **Plan size:** if it grows past one reviewable diff, split after step 6 (shell and read screens) into a follow-up plan for steps 7–8.
- Rollback: git revert. Nothing is deployed.

## Open questions
- (none; real auth, schema, ledger and API are separate later plans)

## Change request (2026-11-22, awaiting GO)
- Light theme only: drop the dark-mode variants (supersedes "light and dark mode" in Decisions).
- Centered layout with margins: content in a centered max-width container with side margins.
- Remove the scrollbar in the sidebar nav (hide it; the nav stays scrollable).
- Files: `src/components/ui.tsx`, `src/components/layout/Shell.tsx`, `src/index.css`, and `dark:` classes in `src/features/**`.

## Progress
- [x] Interview complete (2 rounds, 2026-11-22)
- [x] GO received
- [x] Steps 1–11 (deviations: hand-written shadcn-style primitives in `src/components/ui.tsx` instead of the shadcn CLI; code-based TanStack routes in `src/router.tsx` instead of file routes; plain tables instead of TanStack Table)
- [x] Acceptance checks pass (lint, format:check, typecheck, test, build). Manual browser check still with the user.
- [ ] Opus review
