---
name: debug
description: Trigger when the user runs the .debug command, or when a runtime error or test failure occurs. Enforces strict root-cause analysis before coding.
---

# SKILL: Debugging (v3.0)

> `.debug [symptom]` | Target: Runtime/UI/Test/State bugs.
> **No code before root cause is confirmed.**
> Typos/syntax/imports → fix directly. Auto-trigger is `.dev` self-heal only.

## OUTPUT

- **Layer 1 (ไทย):** symptom + root cause plain language (1–3 sentences). Unproven = say so, stop.
- **Layer 2 [for AI]:** `file:line`, trace path, fix scope. Only after `[ยืนยันแล้ว]`.

## GUARDRAILS

- **Localize first:** Read `docs/core/data-flow.md`, `dependencies.md`, `danger-zones.md` to pinpoint files. Open ≤3 files.
- Escalate to `.plan` only if FIX needs >3 files (investigation alone is not a reason).
- **REPEAT-BUG:** Same symptom after prior fix → STOP. `rg` every occurrence of the symbol repo-wide. Repeat bugs = duplicate source, not the line you keep editing.
- **VISUAL BUGS:** Trace DOM nesting + Tailwind of parent AND child. `tsc` can't prove visual fixes.
- **STATE MACHINE GUARD:** If the bug involves a state machine with ≥3 boolean flags (e.g., transport hook), MUST read the state table doc (e.g., `docs/core/transport-states.md`) before proposing fixes. Map the broken scenario to a truth table row. If no state table doc exists, create one FIRST (report to user) before writing any fix code.

## WORKFLOW

### 1. Symptom
"When [action], [observed] instead of [expected]." Can't complete → gather info.

### 2. Reproduce
Exact trigger, frequency, environment. **No code changes until confirmed.**

### 3. Trace
Entry → State → Branches → Output. Check: Props, API shape, async timing, Tailwind conflict.

### 4. Root Cause
"Root cause: [line] causes [effect] because [reason]." Tag `[ยืนยันแล้ว]` only when traced.
Vague ("something in state") → Step 3. Hypothesis only → `[เดา]`, Layer 1 only, **STOP. NO CODE.**

### 5. Fix & Verify
Minimal change. `npx tsc --noEmit` + affected tests only. **No full E2E** (reserved for `.scrutinize`).
User-invoked → recommend `.scrutinize` before `.done`. Self-heal → stay in `.dev` scope.

### 6. Test Recommendation
After fix passes:
- **Logic bug** (calc/state/condition) → recommend unit test.
- **UI bug** (layout/selector/display) → recommend E2E test.
- **Config bug** (import/path) → no test needed.
- Simple (1 file) → "สั่ง .dev เขียน test ได้เลย"
- Complex (multi-file) → "ควร .plan ก่อน"
- **Do not write tests in debug phase.** Recommend only.
