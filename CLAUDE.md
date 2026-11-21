# Distribution Business System

Business: Davao Trading Rice Hub. Multi-warehouse rice distribution business system: warehouse inventory, vehicle (in-transit) inventory, multi-stop delivery tracking, orders, credit/collections, fleet, reporting.

## Stack
Decided in `plans/001-hook-fix-and-tech-stack.md`.
- Repo: pnpm workspaces monorepo: `backend/` (`@drh/backend`, NestJS API + `supabase/` config and migrations), `frontend/web/` (`@drh/web`, one website for office and driver screens; no separate driver app), `shared/` (`@drh/shared`, zod schemas). TypeScript everywhere. Pinned: NestJS 11 (nestjs-zod peer), TypeScript 6.0 (typescript-eslint peer), Node 24.
- Database/Auth/Storage: Supabase (PostgreSQL + PostGIS, Auth, Storage, Row-Level Security), Singapore region
- DB access: Drizzle ORM + drizzle-kit SQL migrations. API uses the Supavisor transaction pooler; migrations use the direct/session connection. No session-level advisory locks.
- IDs: UUIDv7 generated in app code (`uuidv7` package), stored as `uuid`
- Backend API: NestJS on Node 24 LTS, zod validation (`nestjs-zod`), `nestjs-pino`, Sentry. Supabase JWT verified via JWKS; roles and warehouse scope in our own tables.
- Hosting: one Docker image in a Singapore region (Render or Railway, TBD), run as API and worker processes
- Jobs/live data: Redis (fixed-price managed, same region) + BullMQ; NestJS socket.io gateway (Redis adapter) for live GPS, latest position in Redis
- Admin web: Vite + React SPA, TanStack Router/Query/Table, Tailwind + shadcn/ui, react-hook-form + zod, MapLibre GL
- Driver screens: section `/driver` of `frontend/web` (mobile-first, no separate app). Phase 3: PWA with service worker, IndexedDB outbox of idempotent commands (push) + cursor pull; no row-sync engines. GPS only while the trip screen is open (Wake Lock); gaps shown on the map; revisit hardware trackers if the pilot needs it. Until the real API exists, `frontend/web/src/api/` is an in-memory mock (plan 004).
- Documents: `@react-pdf/renderer` in a BullMQ worker, files in Supabase Storage. SMS: Semaphore via queue with retries + DLQ.
- Testing: Vitest; integration/concurrency tests on the Supabase CLI local stack. CI: GitHub Actions.
- Commands (repo root): `pnpm install`, `pnpm lint`, `pnpm format`, `pnpm typecheck`, `pnpm test` (unit), `pnpm test:db` (needs the local stack running). Local stack: `pnpm --filter @drh/backend exec supabase start` / `stop` / `status`. Apply migrations locally: `pnpm --filter @drh/backend exec supabase db reset`. Run the API: `pnpm --filter @drh/backend dev` (copy `backend/.env.example` to `.env` first). Run web: `pnpm --filter @drh/web dev`.

## Core Domain Invariants (never violate)
- Every sack is in exactly one place: warehouse bin, vehicle, customer, or a virtual location (supplier, loss).
- Stock changes ONLY through append-only `stock_movements` (from_location, to_location). Never edit or delete movements; correct with reversing entries.
- `stock_balances` is a projection updated in the same transaction as the movement.
- Stock cannot go negative at real locations.
- All write endpoints accept idempotency keys. The server ledger wins sync conflicts.
- Money is `numeric(14,2)`, never float. Timestamps are `timestamptz` in UTC. IDs are UUIDv7.
- Clients never write stock or money tables directly through the Supabase client; all such writes go through the API. Keep RLS enabled as a second layer.

## Rule 1: Professional-grade quality is mandatory
Every feature and change must meet this floor. Do not trade it away for speed or tokens.
- Input validation at every boundary; typed DTOs/schemas
- Authorization checked server-side (RBAC + warehouse scope); never trust the client
- Transactions and correct locking for any stock or money change
- Idempotent writes, safe retries, no silent data loss
- Meaningful errors, structured logging, audit log entries for sensitive actions
- Forward-only, reversible-where-possible DB migrations (expand/contract)
- Tests: unit for business rules; integration on a real DB for ledger, orders, trips; concurrency tests for stock
- No secrets in code; parameterized queries only; least-privilege access
- Follow existing conventions; small, readable, reviewable changes; no dead code

## Rule 2: Plan first, wait for approval, then edit
1. When I give a prompt, FIRST create a plan file in `plans/` (see template). Do this immediately.
2. Filename: `plans/NNN-short-slug.md` (NNN = next number, zero-padded). All plans live here.
2a. Planning interview: before a plan leaves Draft, ask me clarifying questions (business rules, edge cases, scope, UX, acceptance criteria), a few at a time, each with a recommended answer. Record the answers in the plan's Decisions section. A plan is not ready for `GO` until its open questions are answered or explicitly deferred. Skip only for trivial plans or when I say "skip questions".
3. Do NOT edit, create, or delete any code, config, or migrations until I reply exactly `GO` (or `GO <plan number>`).
4. Creating or updating files inside `plans/` is always allowed.
5. Read-only exploration needed to write the plan is allowed.
6. If scope changes during work, update the plan file and ask for `GO` again.
7. Truly trivial asks (typo fix, answering a question) still get a one-line plan note and my `GO`, unless I say "skip plan".

### Plan template
- Title, status (Draft / Approved / In Progress / Done), date
- Executor (Opus / Sonnet / Haiku) and Reviewer (Opus / none), per Rule 5
- Goal and context (self-contained: a fresh session must be able to execute it without the chat)
- Decisions and constraints (including relevant invariants above)
- Files to create or change (paths)
- Steps (numbered, small, each verifiable)
- Tests and acceptance criteria
- Risks and rollback
- Open questions (unresolved items; the executor adds blockers here)
- Progress checklist (tick items as completed)

## Rule 3: Execute from the plan file, not the conversation
- When working an approved plan, read ONLY that plan file (plus the files it lists). Do not re-read or summarize earlier conversation.
- Keep the plan's status and progress checklist updated as you work.
- If the plan is missing information, ask me and update the plan, don't guess from chat history.
- Prefer a fresh/cleared session for execution; the plan file is the source of truth.

## Rule 4: Best result, fewest tokens (quality is the floor)
- Read only what's needed: targeted search/grep and line ranges, not whole files or directories.
- Don't re-read files already read this session; don't re-run commands without new information.
- Don't repeat code, plans, or diffs back to me. Summarize in a few lines.
- Make minimal, focused edits; no unrequested refactors or extras.
- Keep replies short and to the point. No preamble, no recap of steps.
- Ask one clear question when blocked instead of exploring broadly.
- Never skip tests, validation, or security to save tokens.

## Rule 5: Model routing
- Opus writes every plan, including the planning interview (Rule 2a).
- Opus executes any plan touching: stock movements, balances, or locking; concurrency; offline sync and conflict handling; money, payments, AR, credit, or invoice numbering; auth, RBAC, or RLS.
- Sonnet executes all other plans (scaffolding, CRUD, DTOs, admin UI, reports, tests from a spec). If the plan says `Reviewer: Opus`, Opus reviews the diff (`/code-review`) before commit.
- Haiku only does mechanical tasks (renames, formatting, boilerplate), and only when the plan names it.
- Scope lock for non-Opus executors: work ONLY on the assigned plan and the files it lists. No edits outside them, no refactors or extras, no changes to the plan's decisions, no touching other plans. If something is missing or out of scope, stop, write it under the plan's Open questions, and ask me.

## Conventions
- Roadmap: `ROADMAP.md`. Plans: `plans/`.
- Customer-facing output (invoices, delivery receipts, notifications) uses the business name: Davao Trading Rice Hub.
- Update this file when stack, commands, or conventions are decided.
