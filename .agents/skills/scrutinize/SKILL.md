---
name: scrutinize
description: Trigger when the user runs the .scrutinize command. Acts as an E2E gatekeeper to review code or plans without writing code.
---

# SKILL: Scrutinize & E2E Gatekeeper (v3.0)

> Trigger: .scrutinize | review/audit/sanity-check requests.

## STANCE

- Zero bias. Question existence. No flattery/hedging/rubber-stamps.
- Separate "claims X" from "I traced X and it holds/fails." No unverified facts.
- Evidence required: cite file/line/path.

## WORKFLOW (Strict Sequential)

### 1. DIFF-FIRST SCAN (MANDATORY FIRST)

- `git diff --name-only` against base branch.
- Each changed `src/` file: list exposed `data-testid`s → verify matching E2E test exists → flag `[UNTESTED]` if missing.
- Each changed `tests/` file: verify selectors still exist in source → flag `[STALE SELECTOR]` if mismatch.

### 2. REGRESSION DIFF AUDIT (prevents "fix test, break prod")

- Classify each `src/` diff:
  - `[ADDITIVE]` new feature/guard → OK.
  - `[CORRECTIVE]` bug fix, tightened condition → OK.
  - `[REDUCTIVE]` removed guard/validation/condition → **INVESTIGATE.** If removed to make test pass → **BLOCKER.** If genuinely wrong → OK with justification.

### 3. INTENT & SIMPLICITY

- Core goal in 1 sentence. Lead with simpler alternative + rationale.

### 4. DESIGN SMELL CHECK

- Identify state/components shared across modes (single vs multi-round, WORD vs TIME).
- Verify each correctly filters by active context (round index, mode). Flag leakage risk.
- **Always trace data flow before advising "ไม่จำเป็นต้องแยก".**

### 5. TRACE & ASSUMPTIONS

- Path Trace: Entry → Calls → Branches → Mutation → Exit/Side-effect.
- Check: input shape, concurrency, untracked state.

### 6. E2E VERIFICATION

- **Scope:** Multi-feature → full suite. Single-feature → that spec only. Docs-only → skip + state why.
- **Root-cause tags:** `[ยืนยันแล้ว]` (traced) / `[เดา]` (unproven → no fix, use .debug) / `[ซ้ำ]` (repeat → .debug duplicate-scan).
- Never weaken assertions to pass.

### 6a. FAILURE TRACE (when test fails)

- Per failure: open BOTH test file AND component source.
  1. Read failing assertion + selector used.
  2. Verify selector exists in component DOM.
  3. Missing → `[ยืนยันแล้ว]` selector rot. Exists but wrong value → trace render path.
- **NEVER diagnose from Playwright error message alone.** Error = WHAT, not WHY. Must open both files.

### 6b. VISUAL & UX

- `tsc` doesn't catch visual regressions. Check: design tokens (`docs/design.md`), CLS=0, no overflow, `font-mono`+`tabular-nums` on metrics.
- Visual change → recommend screenshot check.

### 7. REPORT

**Layer 1 — สรุป (ไทย, HUMANS ONLY):**
- **ปัญหา:** [ภาษาคน ห้าม file:line ห้ามชื่อ function ห้าม code]
- **เพราะ:** [ภาษาคน]
- **ทางเลือก:** [ข้อ 1, 2, 3 + ข้อดี/ข้อเสีย]
- **แนะนำ:** [ทางที่ดีสุด + เหตุผล 1 ประโยค]
- **Verdict:** Ship / Fix-then-ship / Reject

**Layer 2 — [for AI] Technical:**
- Blocker → Major → Nit. Per finding: `file:line | Issue | Root cause [tag] | Impact | Fix`
- `[เดา]` → symptom + why unproven + .debug next. No Fix field.
- E2E: `ผ่าน: X | ล้มเหลว: Y | ข้าม: Z`

## PROHIBITIONS

- NEVER write code or fixes. Report only → user calls `.dev`/`.debug`.
- NEVER attach Fix to `[เดา]` finding.
- `.dev` modified `session.md` → Major violation → `Reject`.
