# Plan 002: Model routing rules in CLAUDE.md
Status: Done · Date: 2026-11-21
Executor: Opus · Reviewer: none (docs only)

## Goal and context
Opus 5.5 writes all plans. Cheaper models (Sonnet 5.5) execute the plans that are lower-risk, to cut cost. Opus keeps the high-risk domains: ledger, sync, money and auth. A Sonnet session must stay strictly inside the plan it is given. These rules go into CLAUDE.md so that every session follows them.

## Decisions and constraints
- Every plan states an `Executor` (Opus / Sonnet / Haiku) and a `Reviewer` (Opus / none).
- **Opus executes** any plan that touches: stock movements, balances or locking; concurrency; offline sync and conflict handling; money, payments, AR, credit or invoice numbering; auth, RBAC or RLS.
- **Sonnet executes** everything else (scaffolding, CRUD, DTOs, admin UI, reports, tests from a spec), with Opus reviewing the diff (`/code-review`) before commit when the plan says `Reviewer: Opus`.
- **Haiku** only does mechanical tasks (renames, formatting, boilerplate), and only when the plan names it.
- **Scope lock for non-Opus executors:** work only on the assigned plan and the files it lists. No edits outside them. No refactors or extras. Don't change the plan's decisions and don't touch other plans. If something is missing or out of scope, stop, write it in the plan's "Open questions" section and ask the user.

- **Planning interview (Opus):** before a plan leaves Draft, Opus asks the user clarifying questions about business rules, edge cases, scope, UX and acceptance criteria (a few at a time, each with a recommended answer). It records the answers in the plan's "Decisions" section. A plan isn't ready for `GO` until open questions are answered or explicitly deferred. Skip only for trivial plans, or when the user says "skip questions".

## Files to change
- `CLAUDE.md`: add a "Rule 5: Model routing" section, and add `Executor / Reviewer` to the plan template.

## Steps
1. Add `Executor (Opus/Sonnet/Haiku), Reviewer (Opus/none)` as the second bullet of the plan template.
2. Add an "Open questions" bullet to the plan template.
3. Add a Rule 5 section after Rule 4 containing the decisions above.
4. In Rule 2, add the planning interview as a step between "create plan" and "wait for GO".

## Acceptance
- CLAUDE.md contains Rule 5 and the updated template. No other files change.

## Risks and rollback
- Docs only. Revert the CLAUDE.md edit.

## Progress
- [x] Template updated
- [x] Rule 5 added
- [x] Rule 2 planning interview added
