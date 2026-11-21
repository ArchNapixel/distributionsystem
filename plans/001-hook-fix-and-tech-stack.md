# Plan 001: Fix hook error + decide tech stack
Status: In Progress · Date: 2026-11-21

## Context
Two things. First, every Write/Edit triggers a hook error from the design-drift plugin. Second, we need to settle the tech stack (CLAUDE.md still says "TBD: confirm") with a recommendation that fits the system: a ledger-based multi-warehouse rice distribution system with an offline-first driver app, live GPS and money/AR, built by 1-2 developers in Davao, PH.

## Part A: Fix the hook error
**Root cause:** `hooks/hooks.json` in the design-drift plugin
(`~/.claude/plugins/synced/670e…/6e34…/hooks/hooks.json`) runs
`python3 ${CLAUDE_PLUGIN_ROOT}/hooks/scripts/drift-scanner.py` without quotes. The plugin root contains `C:\Users\Arch Coles\…`, so the path is cut at the space and Python gets `C:\Users\Arch`.

**Fix:** change the command to `python3 "${CLAUDE_PLUGIN_ROOT}/hooks/scripts/drift-scanner.py"`.
- Caveat: this is a *synced* plugin, so a re-sync may overwrite the fix. If that happens, the fallback is to turn it off for this repo only with `.claude/settings.json` → `{"enabledPlugins": {"design-drift@synced": false}}`. It only acts when a `.design-lock` file exists, so this repo loses nothing for now. Also worth reporting upstream.
- Verify: make one harmless Write (the plan copy in Part C) and confirm no hook error.

## Part B: Recommended tech stack

| Layer | Recommendation | Why it fits this system |
|---|---|---|
| Repo | **pnpm workspaces monorepo** (`apps/api`, `apps/admin`, `apps/driver`, `packages/shared`), TypeScript everywhere | One language for 1-2 devs. Shared zod schemas and types for API, web and driver app. |
| Database | **Supabase Postgres + PostGIS, Singapore** (keep) | Lowest latency to PH. Gives Auth, Storage, RLS and PITR in one place. |
| DB access | **Drizzle ORM + drizzle-kit SQL migrations** (instead of Prisma) | Stays close to SQL: explicit transactions, `SELECT … FOR UPDATE`, raw SQL for ledger triggers, constraints and RLS policies. `numeric` comes back as a string (no float). Works with Supavisor's transaction pooler without Prisma's prepared-statement issues. Drizzle also runs on expo-sqlite, so the driver app uses the same tool. |
| Connections | API → Supavisor **transaction** pooler. Migrations → **direct/session** connection | Row locks inside a transaction work fine through the transaction pooler. Avoid session-level advisory locks. |
| IDs | UUIDv7 **generated in app code** (`uuidv7` package), with `uuid` columns | The driver app must create IDs offline, and this avoids depending on the Postgres version. |
| Backend | **NestJS on Node 24 LTS**, zod validation (`nestjs-zod`), `nestjs-pino` logs, Sentry | Modules map cleanly to domains (inventory, orders, trips, AR). Guards handle RBAC plus warehouse scope. |
| Auth | Supabase Auth. API verifies the JWT via **JWKS** (asymmetric keys). Roles and warehouse scope live in our own tables | Server-side authorization, as CLAUDE.md requires. |
| Hosting (API + workers) | **Docker container in a Singapore region** (Render or Railway), with API and worker as two processes from one image | WebSockets and BullMQ workers need long-running processes, so not serverless. Docker keeps us portable. |
| Jobs / cache | **Redis (fixed-price managed instance, same region) + BullMQ** | BullMQ polls Redis constantly, so per-command billing (e.g. Upstash) gets expensive. |
| Live map | NestJS WebSocket gateway (socket.io + Redis adapter). Latest position in Redis | Reuses API auth. Avoids Supabase Realtime quotas as the fleet grows. |
| Admin web | **Vite + React SPA**, TanStack Router/Query/Table, Tailwind + shadcn/ui, react-hook-form + zod, **MapLibre GL** maps (instead of Next.js) | It's an internal tool behind a login, and all data goes through NestJS. Next.js would add a second server layer with nothing to gain (no SEO, no public pages). MapLibre is free; Google Maps billing is not. |
| Driver app | **Expo (React Native), Android first**, expo-sqlite + Drizzle, expo-location + expo-task-manager for background GPS, EAS Build/Update | Drivers in PH are mostly on Android. EAS Update ships fixes without the Play Store. |
| Offline sync | **Custom command outbox**: the app queues idempotent *commands* ("deliver 20 sacks at stop 3") rather than row changes. Pull uses a cursor (instead of PowerSync/ElectricSQL) | Fits the invariants: the server ledger wins and validates every stock change. Row-sync tools would let devices write rows. |
| Documents | PDF generation in a BullMQ worker with `@react-pdf/renderer` (no headless Chrome). Files stored in Supabase Storage | Lightweight and async, as the roadmap specifies. |
| SMS | **Semaphore** (PH SMS gateway) through a queue with retries and a dead-letter queue. Viber later | Cheap, local, PH sender IDs. |
| Testing | Vitest. Integration and concurrency tests against the **Supabase CLI local stack** (real Postgres + RLS + Auth) in dev and in GitHub Actions | Real DB tests for the ledger, as CLAUDE.md requires. |
| CI/CD | GitHub Actions: lint, typecheck, test, migrate, deploy | — |

**Risks to raise now:**
- **BIR:** system-generated invoices and receipts in PH usually require a CAS/CRM registration or permit with BIR (and EIS for some taxpayers). Check this with the client's accountant in Phase 0, because it can change how invoice numbering and printing work.
- Supabase plan limits (connections, Storage egress for POD photos) need checking against the fleet size before the pilot.

## Part C: After approval
1. Apply the Part A fix and verify it.
2. Save this plan as `plans/001-hook-fix-and-tech-stack.md` (required by CLAUDE.md Rule 2).
3. Update the CLAUDE.md "Stack" section with the agreed choices (remove "TBD: confirm") and tick "Confirm stack" in ROADMAP.md.
4. No app code or scaffolding yet. That gets its own plan (002).

## Open decisions for the user
- Vite SPA vs Next.js for admin web (recommend Vite).
- Drizzle vs Prisma (recommend Drizzle).
- Host: Render vs Railway (either works, both have Singapore).

## Progress
- [~] A: hook quoting fix applied; verify after Claude Code restart (hooks load at session start)
- [x] C2: plan saved to plans/
- [x] C3: CLAUDE.md + ROADMAP.md updated
