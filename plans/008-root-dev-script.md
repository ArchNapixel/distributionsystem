# 008 Root dev script

- Status: Done
- Date: 2026-11-22
- Executor: Haiku (mechanical, one line). Reviewer: none.

## Goal and context
`npm run dev` / `pnpm dev` at repo root fails: root `package.json` has no `dev` script. Add one so `pnpm dev` starts the web app. The repo stays pnpm-only (`workspace:*` deps, `pnpm-workspace.yaml`); npm is not supported.

## Decisions and constraints
- Script: `"dev": "pnpm --filter @drh/web dev"` (web only; API needs `.env` and the local Supabase stack, so it stays a separate command).
- No new dependencies.

## Files to change
- `package.json` (root): add the `dev` script.
- `CLAUDE.md`: add `pnpm dev` to the Commands line.

## Steps
1. Add the script to root `package.json`.
2. Update the Commands line in `CLAUDE.md`.
3. Run `pnpm dev` and confirm Vite starts.

## Tests and acceptance criteria
- `pnpm dev` from the repo root starts Vite for `@drh/web`.

## Risks and rollback
- None; revert the two edits.

## Open questions
- None.

## Progress checklist
- [x] Root script added
- [x] CLAUDE.md updated
- [x] Verified
