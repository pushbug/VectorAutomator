---
name: consult
description: Trigger when the user runs the .consult command. Senior-level project consultation — reads docs and code to answer questions without generating plans or code.
---

# Consult Phase

> Invoke: `.consult [question about the project]`

## Purpose

Act as a senior engineer who knows the entire project. Read whatever is needed — docs, source code, config — then answer the user's question directly. No plans. No code generation. No side-effects.

## HARD RULES

- **READ-ONLY.** Read any file needed to answer. Never create, modify, or delete files.
- **NO PLANS.** Never produce `current_plan.md`, `implementation_plan.md`, or step lists.
- **NO CODE GEN.** Never write production code, test code, or scripts.
- **NO SESSION EDITS.** Never touch `docs/session.md`.
- **ANSWER THE QUESTION.** The entire output is the answer — concise, structured, opinionated.
- **ESCALATE WHEN NEEDED.** If the question requires implementation steps or decisions with side-effects, answer at conceptual level only + append: _"ถ้าจะลงมือ → .plan"_

## SEQUENCE

1. **Session anchor** (first use per session): read `docs/INDEX.md` + `docs/session.md` to orient.
2. **Scope reads:** Use the routing table below to find relevant docs. Read source files directly when needed.
3. **Answer:** Respond using the Two-Layer format below.

## DOC ROUTING TABLE

| Question type                        | Read first                                         |
| ------------------------------------ | -------------------------------------------------- |
| Architecture / state management      | `docs/core/` relevant file via INDEX               |
| Feature behavior / component tree    | `docs/features/{feature}.md`                       |
| Feature requirements / product scope | `docs/prd.md`                                      |
| Tests / selectors / test IDs         | `docs/tests/CATALOG.md`, `docs/tests/SELECTORS.md` |
| Current work / in-progress           | `docs/session.md`, `docs/current_plan.md`          |
| Past decisions / why X was chosen    | `docs/decisions.md`                                |
| Cross-feature interaction            | `docs/features/` + `docs/core/` both               |
| Config / dependencies                | `package.json`, relevant config files directly     |

> Always start from `docs/INDEX.md` if the category is ambiguous.

## OUTPUT FORMAT

### Layer 1 — สรุป (ไทย)

- Direct answer in 1–5 sentences. Plain language, no jargon dump.
- Opinion when asked: state whether something is good/bad and WHY.
- Options when applicable: list choices with pros/cons as a table or bullets.
- Escalation (when triggered by HARD RULE): append as **final line** — _ถ้าจะลงมือ → .plan_

### Layer 2 — [for AI] Technical

Use this exact structure per claim:

```
Claim: [what is true]
Source: file:line
Trace: A → B → C (omit if trivial)
```

- One block per distinct claim. No narrative prose.
- Data flow or dependency chain when relevant.
- Compact — for the next AI turn to act on if the user decides to `.plan` or `.dev`.

## EXAMPLES OF GOOD USE

- "โค้ดตรง typing engine ทำงานยังไง?"
- "ระบบ state management มีอะไรบ้าง?"
- "โครงสร้าง component เป็นยังไง ดีหรือควรปรับ?" _(opinion question)_
- "hook ตัวนี้จำเป็นไหม หรือ redundant?"
- "ถ้าจะเพิ่ม feature X ควรแตะไฟล์ไหนบ้าง?" _(answer only, no plan)_
- "stats กับ replay ทำงานร่วมกันยังไง?" _(cross-feature interaction)_
- "ควรใช้ pattern A หรือ B สำหรับ X?" _(pattern comparison + opinion)_
