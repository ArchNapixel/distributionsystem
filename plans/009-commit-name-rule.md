# 009 Commit name rule

- Status: Done
- Date: 2026-11-22
- Executor: Haiku (one-line doc edit). Reviewer: none.

## Goal and context
Add a rule to `CLAUDE.md`: when a task is done and ready to commit, Claude gives the user a suggested commit name. The user commits and pushes themselves.

## Decisions and constraints
- Add to `## Conventions` in `CLAUDE.md`: "When a task is done and ready for commit, give me a suggested commit name (short, imperative, plan number in parentheses, e.g. `Add root dev script (plan 008)`)."
- Suggestion only; do not run `git commit` unless asked (global rule: never push).

## Files to change
- `CLAUDE.md`

## Steps
1. Add the line under Conventions.

## Tests and acceptance criteria
- The line appears in `CLAUDE.md` Conventions.

## Risks and rollback
- None; revert the edit.

## Open questions
- None.

## Progress checklist
- [x] CLAUDE.md updated
