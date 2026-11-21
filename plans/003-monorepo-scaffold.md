# Plan 003: Monorepo scaffold, tooling, CI skeleton
Status: Draft (ready for GO) · Date: 2026-11-21
Executor: Sonnet · Reviewer: Opus

## Goal and context
Set up the empty repo as a pnpm workspace with top-level `backend/`, `frontend/` and `shared/` folders, using the stack in CLAUDE.md "Stack" (plan 001). This covers roadmap Phase 0 "CI skeleton and dev/staging/prod environments" and is the base for every later plan. **No business logic, domain schema or ledger code.**

Machine state (2026-11-21): Windows 11 Home, Node v24.19.0, npm 11. **pnpm, Docker and the Supabase CLI are not installed.** The git remote is `github.com/ArchNapixel/distributionsystem`, and there are no commits yet.

## Decisions (from the planning interview)
- **Layout:**
  ```
  backend/            NestJS API (+ workers later), supabase/ config + migrations, drizzle config
  frontend/admin/     Vite + React + TS admin web
  frontend/driver/    NOT now. Expo app gets its own plan in Phase 3
  shared/             zod schemas + types imported by backend and frontend
  plans/ CLAUDE.md ROADMAP.md
  ```
  Package names: `@drh/backend`, `@drh/admin`, `@drh/shared`.
- **Local DB:** Supabase CLI local stack (needs Docker). The user installs Docker Desktop (WSL2) as a prerequisite. The Supabase CLI is a **dev dependency of backend** (`supabase` npm package, run via `pnpm --filter @drh/backend exec supabase`), so no global install is needed.
- **Migrations:** the Supabase CLI applies them from `backend/supabase/migrations/*.sql`. drizzle-kit generates into that same folder with `migrations.prefix: "supabase"`, so there is one migration system and one folder.
- **Cloud environments:** the existing Supabase project "DTRH" (Free, Nano, **Tokyo ap-northeast-1**, empty: no migrations or data) is **not used**. The region can't be changed after creation, so it will be replaced by a Singapore project. Dev = local stack. A new **Singapore** staging project gets created in the first deploy plan, and prod (with PITR) before the pilot. This plan touches no cloud.
- **CI:** GitHub Actions on push/PR runs install, lint, typecheck, unit tests, `supabase start`, and DB tests.
- **Tooling:** pnpm via corepack (`packageManager` field pinned). Node 24 pinned with `.nvmrc` and `engines`. TypeScript strict with a shared `tsconfig.base.json`. ESLint flat config + Prettier at the root. Vitest everywhere (backend uses `unplugin-swc` for Nest decorators).
- **Backend skeleton:** env validated with zod at boot (the app fails fast on a bad env). `nestjs-pino` structured logs. Global zod validation pipe (`nestjs-zod`). `GET /health` returns `{status, db}` where db = `select 1` through Drizzle (`postgres` driver).
- **Admin skeleton:** Vite React TS + Tailwind only, with one page titled "Davao Trading Rice Hub". TanStack, shadcn and MapLibre are added in the first UI plan that needs them (YAGNI).
- **No secrets committed:** `.env.example` only, `.env*` gitignored. The local Supabase keys come from `supabase status` output.
- Use the latest stable versions at execution time. Don't pin to versions from memory without checking.

## Prerequisites (user, before GO)
1. Install Docker Desktop for Windows (WSL2 backend), start it, and confirm `docker --version` works.
2. Run `corepack enable` (makes pnpm available).

## Files to create
- Root: `package.json` (workspace scripts: `lint`, `typecheck`, `test`, `test:db`, `format`), `pnpm-workspace.yaml` (`backend`, `frontend/*`, `shared`), `.nvmrc`, `.npmrc`, `.gitignore`, `.editorconfig`, `.prettierrc`, `eslint.config.js`, `tsconfig.base.json`
- `shared/`: `package.json`, `tsconfig.json`, `src/index.ts`, `src/health.ts` (zod `HealthResponse` schema), `src/health.test.ts`
- `backend/`: `package.json`, `tsconfig.json`, `vitest.config.ts`, `vitest.db.config.ts`, `drizzle.config.ts`, `.env.example`, `src/main.ts`, `src/app.module.ts`, `src/config/env.ts` (+ `env.test.ts`), `src/db/db.module.ts`, `src/health/health.controller.ts`, `test/health.db.test.ts`, `supabase/` (from `supabase init`), `supabase/migrations/<ts>_enable_postgis.sql`
- `frontend/admin/`: Vite React TS template files, Tailwind setup, `src/App.tsx`, `src/App.test.tsx`
- `.github/workflows/ci.yml`
- Update `CLAUDE.md`: "Repo" line → new layout; fill the "Commands" line.

## Steps
1. Verify the prerequisites (`docker --version`, `pnpm -v`). Stop and ask if either is missing.
2. Create the root workspace files and shared tsconfig/lint/format config.
3. Create `shared/` with the `HealthResponse` schema and its unit test.
4. Scaffold `backend/` (Nest CLI `--skip-git`, then strip Jest/sample files and switch to Vitest + SWC). Add env validation, pino and the zod pipe.
5. Run `supabase init` in `backend/`. Add the migration `create extension if not exists postgis with schema extensions;`.
6. Add the Drizzle DB module and `GET /health`, with its response typed from `@drh/shared`.
7. Scaffold `frontend/admin/` (Vite React TS + Tailwind). Add one page and one render test.
8. Add the CI workflow (`pnpm/action-setup`, `actions/setup-node` with `.nvmrc`, `supabase/setup-cli`, `supabase start`, run the tests).
9. Update the CLAUDE.md Repo and Commands lines.
10. Run everything locally (see acceptance). Tick progress.

## Tests and acceptance criteria
- `pnpm install` succeeds from a clean clone. `pnpm lint`, `pnpm typecheck` and `pnpm test` pass.
- Unit: the shared schema test passes. The backend env test passes, and booting with a missing `DATABASE_URL` fails.
- DB: with `supabase start` running, `pnpm test:db` passes. `/health` returns `{status:"ok", db:"ok"}`, and the test asserts the `postgis` extension exists.
- `pnpm --filter @drh/admin dev` serves a page showing "Davao Trading Rice Hub". Its render test passes.
- The CI workflow file is valid. It runs green once the user pushes (Claude never pushes).
- `git status` shows no `.env` or secrets.

## Risks and rollback
- Docker/WSL2 setup issues on Windows Home: the user resolves these before GO.
- Supabase CLI version drift between local and CI: pin the same version in backend devDeps and in the CI action.
- Rollback: delete the created files (no commits yet).

## Open questions
- (none; hosting provider and the Singapore staging project are deferred to the deploy plan)

## Progress
- [x] Interview complete
- [~] Prerequisites: pnpm 12.21.0 OK. Docker Desktop 4.99 + WSL2 installed 2026-11-21, but a reboot is pending. Step 1 must confirm `docker --version` and that `docker info` runs.
- [ ] Steps 2-9 done
- [ ] Acceptance checks pass
