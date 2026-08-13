---
name: testing
description: Reference for test specification and E2E verification. Use during .plan and .scrutinize phases alongside the plan or scrutinize skill.
---

# SKILL: Test Execution Thought Process (v2.0)

## CONTEXT & ANCHORS

- **Trigger:** Loaded during `.plan` (spec generation) and `.scrutinize` (execution & verification).
- **Reference:** `docs/tests/SELECTORS.md`, `docs/tests/CATALOG.md`, `docs/tests/OVERVIEW.md`

## 1. TEST SPECIFICATION (.plan Phase)

- **Heuristic:** Define Expected State → Map DOM Anchors → Assert Observable Output.
- **Tiers:**
  - _Tier 1 (Happy Path):_ Mandatory MVP flows. Blocks `.done`.
  - _Tier 2 (Edge Case):_ Boundary conditions & error states.
  - _Tier 3 (Regression):_ Guardrails for fixed bugs.
- **Rule:** Test behaviors, not implementation details. Retain validity after internal refactors.
- **Naming & Location:** `tests/[feature].spec.ts` -> `should [expect] when [condition]`.

## 2. VERIFICATION & REPORTING (.scrutinize Phase)

- **Execution:** Run automated suite via `npm run test:e2e` or `npx playwright test`.
- **Report Format (Thai):**

```text
  ผ่าน: X | ล้มเหลว: Y | ข้าม: Z
  [หากล้มเหลว]
  - Target: [Test Name]
  - Symptom: When [action], observed [actual] instead of [expected]
  - Action: Trigger `.debug [symptom]` immediately.
```

## 3. GUARDRAILS

- No False Positives: Never skip, disable, or modify assertions to pass without root-cause resolution.
- Code vs Test: Fix production code under `.dev`, never weaken test criteria.
- Refactor Check: Ask — "If internals change but behavior stays the same, does this test still pass?" If no → rewrite the test.
