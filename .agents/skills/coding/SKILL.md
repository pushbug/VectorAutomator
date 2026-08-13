---
name: coding
description: Trigger when the user runs the .dev command. Enforces minimal, surgical code generation and self-healing validation.
---

# SKILL: Coding & Self-Healing Loop (v3.0)

> Trigger: .dev [Task] | Boundary: Code Gen & Exec.

## STANCE

- Minimal but never fragile. Correct > fast > short.
- Match existing patterns 1:1. No clever tricks.
- Never remove interceptors/guards/cleanup (see `docs/core/compliance.md` + `docs/core/danger-zones.md`).

## INTENT

- Uncertainty = STOP & ASK. Multi-interpretation = present all options.
- Weak criteria ("make it work") = STOP & ASK.

## PLAN ANCHORING & STALENESS CHECK

- Read `docs/current_plan.md` + listed docs before coding.
- **Before each step:** verify target file/change doesn't already exist (`ls`/`grep`). Already done → mark `[x]`, skip. All `[x]` → set `Status: COMPLETE`, announce: "ทำเสร็จครบแล้วครับ แนะนำ .scrutinize ก่อน .done"
- With plan: align strictly. Without plan: max 1 file, confirm scope first.

## MINIMALISM

- Absolute minimum for spec. No speculative features. No single-use abstractions.
- Reduce >30% in line count if possible.

## SURGICAL MUTATION

- Mutate only exact lines. Zero reformatting. Match existing style 1:1.
- Auto-purge dead imports/vars from CURRENT change only.
- **DUPLICATE SCAN (mandatory):** `rg` symbol across repo before editing. If >1 render site/state copy → fix duplication, don't patch one copy.
- **REFACTOR HYGIENE:** When moving logic, DELETE old copy in same edit.
- **STATE TABLE CHECK (mandatory):** Before modifying any boolean condition in a state machine hook (e.g., `useStatsChartTransport`, `useReplayEngine`), read the matching state table doc (`docs/core/transport-states.md`). Verify the proposed change against ALL rows of the truth table, not just the reported scenario. Flag any row where behavior would change unintentionally.

## EXECUTION

- Read target file before writing. 300-line threshold = ask before split.
- Multi-step: one step → verify → proceed.
- **Testing:** `npx tsc --noEmit` + existing Vitest specs for touched feature. **No Playwright here** (reserved for `.scrutinize`).
- **Visual changes:** state explicitly what to eye-check. Never claim visual fix works from type-check alone.
- **Self-heal:** 1 auto `.debug` loop. Failure persists → STOP & ASK.
- **No session wrap-up.** No git push/PR/summary during `.dev`.

## PROGRESS TRACKING

- After each step: mark `[x]` in `docs/current_plan.md`.
- After ALL steps: `Status: ACTIVE` → `Status: COMPLETE`.
- **Never end silently.** Report: "ทำเสร็จ step X/Y" or "ครบทุก step แนะนำ .scrutinize"

## OUTPUT

- **Layer 1 (ไทย):** what changed + why (≤3 lines). End with "step X/Y" progress.
- **Layer 2 [for AI]:** English summary + surgical code block.
