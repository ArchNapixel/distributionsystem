# Distribution Business System Roadmap
Client: Davao Trading Rice Hub

Legend: [ ] todo, [~] in progress, [x] done. Timeline assumes 1-2 developers.

## Phase 0: Discovery and Design (Weeks 1-2)
- [ ] Interview owner, warehouse staff, dispatcher, drivers; shadow one delivery day
- [ ] Lock business rules: units (sack/kg), lots, negative stock, credit, pricing, shrinkage tolerance
- [ ] Wireframes of key screens
- [x] Confirm stack (see CLAUDE.md Stack; plans/001). Hosting provider still open.
- [ ] Schema design, ADRs, ledger prototype
- [ ] CI skeleton and dev/staging/prod environments
Exit: signed-off MVP scope

## Phase 1: Foundation and Warehouse Inventory (Weeks 3-8)
- [ ] Auth (Supabase Auth JWT validated in API, device sessions), RBAC scoped per warehouse, Row-Level Security
- [ ] Products/SKUs (variety, brand, sack size), warehouses, bins
- [ ] Lots (supplier, milling date, moisture, grade)
- [ ] Stock ledger: locations, append-only movements, balances projection, row locking, negative-stock constraint
- [ ] Idempotency keys on all writes
- [ ] Receiving, adjustments, write-offs (reason + photo), inter-warehouse transfers
- [ ] Suppliers and purchase orders
- [ ] Cycle counts and variance reports
- [ ] Low-stock and aging alerts
- [ ] Audit log (partitioned)
- [ ] Opening stock import with dry-run
- [ ] Nightly ledger-vs-balance drift check
Exit: warehouse stock accurate in the system for 2 weeks

## Phase 2: Orders and Customers (Weeks 9-12)
- [ ] Customers, types, price tiers, address book with map pins
- [ ] Effective-dated price lists and pricing engine
- [ ] Order entry, state machine, status history, standing orders
- [ ] Stock reservations with TTL (available = on hand - reserved)
- [ ] Picking lists (FEFO)
- [ ] Delivery receipts and invoices (async PDF)
- [ ] Transactional outbox for domain events
Exit: orders, picking, and documents run entirely in the system

## Phase 3: Delivery and Vehicle Inventory, MVP Core (Weeks 13-20)
- [ ] Vehicles, drivers, capacity limits
- [ ] Trip planning: multi-stop sequence, load manifest
- [ ] Load-out with warehouse sign-off (bin -> vehicle, transactional)
- [ ] Vehicle as stock location with live balance
- [ ] Driver app (offline-first): stops, per-drop deduction, extra sales, returns, failed-delivery codes
- [ ] Proof of delivery: signature, photo, received-by (pre-signed uploads)
- [ ] Sync API: push (idempotent batches), pull (cursor), conflict review queue
- [ ] GPS ingestion: batched pings, day-partitioned table, latest position in Redis
- [ ] Geofence worker (arrival, idle, off-route alerts)
- [ ] Dispatcher live map (WebSocket/SSE)
- [ ] End-of-trip reconciliation: loaded - delivered - returned = leftover; variance flags and manager approval
- [ ] Load tests: concurrent loads on one lot, offline sync replay
Exit: pilot with 1-2 vehicles; warehouse + vehicle + delivered totals reconcile

## Phase 4: Money (Weeks 21-25)
- [ ] Credit limits, terms, auto-block on overdue
- [ ] Payments: cash, check/PDC, bank transfer, GCash; allocation to invoices
- [ ] Driver cash collection and end-of-day remittance reconciliation
- [ ] AR ledger and aging report
- [ ] Landed cost and margin per lot
- [ ] Customer SMS/Viber notifications with tracking link (retries, dead-letter queue)
- [ ] BIR-compliant invoice/receipt numbering
Exit: AR and daily cash reconciled in the system

## Phase 5: Fleet and Operations (Weeks 26-29)
- [ ] Maintenance schedules and history
- [ ] Fuel logs and cost per km
- [ ] Registration, insurance, license expiry alerts
- [ ] Trip costing and cost per sack
- [ ] Commissions and incentives engine
- [ ] Roll-out to all vehicles and warehouses

## Phase 6: Reporting and Analytics (Weeks 30-32)
- [ ] Owner dashboard
- [ ] Stock by warehouse, vehicle, variety
- [ ] Shrinkage by warehouse, vehicle, driver
- [ ] Delivery KPIs: on-time rate, drops per trip, failed deliveries
- [ ] Sales by customer, area, product
- [ ] Materialized views, async report jobs, scheduled exports (Excel/PDF)

## Phase 7: Smart Features (Week 33+)
- [ ] QR/barcode per sack or pallet
- [ ] Route optimization
- [ ] Demand forecasting and auto-reorder suggestions
- [ ] Customer and supplier portals
- [ ] Scale/weighbridge integration, accounting export
- [ ] Palay/milling module (if needed)
- [ ] Multi-branch / multi-company
- [ ] Public API and webhooks

## Continuous Tracks (every phase)
- Testing: unit (ledger, pricing), integration on real Postgres, concurrency tests, property test that stock changes only via receive, write-off, or sale
- CI/CD: lint, test, migrate, deploy; forward-only migrations
- Observability: structured logs with trace IDs, metrics (sync lag, ledger drift, queue depth), Sentry, uptime monitor
- Security: Argon2id where applicable, optional TOTP for admins, rate limiting, TLS, secrets in a vault
- Reliability: Supabase backups with point-in-time recovery enabled before go-live, monthly restore test
- Retention: raw GPS 90 days, then downsampled to trip polylines

## Milestones
- Usable warehouse inventory: end of Month 2
- Orders and invoicing: end of Month 3
- MVP (delivery + vehicle stock pilot): Month 5
- Financials: Month 6
- Fleet and full roll-out: Month 7
- Analytics: Month 8
- Smart features: Month 9+

## Key Risks
- Staff adoption: train per phase, run old and new processes in parallel 1-2 weeks
- Weak signal: test offline mode on real routes before the pilot
- Bad opening data: physical count before go-live
- Scope creep: out-of-phase requests go to the backlog
- GPS hardware: decide phone vs dedicated tracker by Phase 3
- Supabase limits: check connection, Realtime, and PITR limits against expected fleet size
