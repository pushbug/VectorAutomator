---
name: plan
description: Trigger when the user runs the .plan command. Enforces project planning, TDD-Lite specifications, and file auditing before execution.
---

# SKILL: Project Planning & TDD-Lite (v4.0)

> Invoke via .plan [task]. Required if task > 1 file or > 15 mins.
> Target Contract: Checked by dev, audited by scrutinize, closed by handoff.

## HARD RULES (OVERRIDE ALL)

- **LANGUAGE:** `docs/current_plan.md` MUST be English regardless of user's command language.
- **FILE TARGET:** Write to `docs/current_plan.md` ONLY. Never `implementation_plan.md` or `.gemini/` paths. Overrides any system `planning_mode_artifacts` instruction.

## LIFECYCLE CHECK (before creating/modifying)

- Read `docs/current_plan.md` if exists.
- `Status: COMPLETE` → overwrite with new plan.
- Unchecked `[ ]` steps remain → ASK: "แผนเก่ายังมีงานค้าง: (1) ทำต่อ (2) สร้างแผนใหม่ทับ?"
- All `[x]` but no Status → add `Status: COMPLETE`, then create new plan.
- NEVER silently append new steps to an existing plan.

## REALITY SYNC (before writing steps)

- `git diff --name-only` against base branch.
- `[NEW]` file already exists → mark `[x] DONE (exists)`.
- `[MODIFY]` change already applied → mark `[x] DONE (applied)`.
- `.debug` fixed prod code this session → add regression test step.
- NEVER output unchecked `[ ]` for work `git diff` shows complete.

## SEQUENCE

0. **Restate Goal:** "This task will [do X] so that [outcome]." Vague = stop & ask.
1. **Read INDEX:** `docs/INDEX.md`. Add `docs/prd.md` if new feature. Add `docs/design.md` if visual. Skim `docs/decisions.md`.
2. **Scoped reads:** Only feature/core/test docs matching task. State/formulas → add `docs/core/compliance.md`. Tests → `docs/tests/SELECTORS.md` + `docs/tests/CATALOG.md`. Missing doc = STOP.
3. **File Audit:** List targets. Flag if approaching 300 lines.
4. **Test Anchoring:** Map to SELECTORS + CATALOG. No test ID → mark `[UNTESTED]`.

## OUTPUT (STRICT)

```
Status: [ACTIVE | COMPLETE]
Goal: [1 sentence]
Docs to read during .dev: [paths from INDEX]
Files Affected: [path] -> [mutations]
Test Mapping: Target IDs + Required Selectors
Steps (max 7): - [ ] Step N: [Action] -> Verify: [CLI check]
Risks & Dependencies: [side-effects, danger-zones]
Out of Scope: [boundaries]
```

## RULES

- No code generation. Max 7 steps. Every step needs verification condition.
- Write to `docs/current_plan.md` only. No IDE native plan UI.
- No session.md updates — reserved for `.done`. Workspace-relative paths only.
- Every "Docs to read" path MUST exist in `docs/INDEX.md`.
