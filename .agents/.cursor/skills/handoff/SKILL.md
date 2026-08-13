---
name: handoff
description: Trigger when the user runs the .done command. Enforces session wrap-up, scoped documentation updates, and git safety.
---

# SKILL: Task Delivery Handoff (v3.0)

> Scope: Session closure & persistent state transfer via `docs/session.md`.

## Workflow

1. Read `docs/INDEX.md`, `docs/session.md`, and `docs/current_plan.md`. Verify all tasks in `current_plan.md` are checked `[x]`.
2. Overwrite `docs/session.md` entirely with schema below.
3. Git sync: follow branch logic.

## Guard

- BLOCKED if: the last `.scrutinize` verdict was not `Ship`, the test suite is currently failing, or any task in `docs/current_plan.md` is incomplete.
- **VERIFICATION GATE:** Confirm `.scrutinize` actually ran against the current changes. If the flow skipped it (e.g. `.dev` → `.done` directly), WARN the user and recommend running `.scrutinize` first. Never close silently claiming a pass that was never verified.
- **DOC UPDATE CHECKLIST:** Evaluate which scoped docs changed during work. Update ONLY affected files:
  - Feature behavior/exports → matching `docs/features/*.md`
  - State/formulas/lifecycle → matching `docs/core/*.md`
  - New test IDs → `docs/tests/CATALOG.md` + `docs/tests/SELECTORS.md` if new selectors
  - Do NOT rewrite unrelated feature docs. Do NOT read legacy redirect stubs for content.
- **NEW / SPLIT DOC:** If a new feature has no matching doc → create a new scoped file and add its row to `docs/INDEX.md`. If a doc passed ~300 lines → propose a split to the user with a reason; split only after approval, then update `docs/INDEX.md` rows + any skill that references the old path. Registration is mandatory after an approved split so later sessions route to it.
- Record function names, prop types, role in system — no raw code paste (see INDEX doc update protocol).
- **DECISION LOG:** Append any new architectural/design decision to `docs/decisions.md` (append-only, never rewrite past entries). `session.md` Decisions = this session's snapshot; `decisions.md` = durable rationale for all future sessions.
- **CHANGELOG GATE:** Before closing, evaluate whether this session shipped **user-facing** changes (UX, behavior, bugfix users notice, legal/privacy). If yes → propose 0–N Keep a Changelog bullets under the current `APP_VERSION` (or `## [Unreleased]` if not cutting a release) and **await user yes / no / edit** before writing `CHANGELOG.md`. If no user-facing ship → skip (do not ask). Never dump refactors, tests-only, or docs-only into the changelog. Do not bump `APP_VERSION` unless the user explicitly requests a version cut.
- **SKILL SYNC CHECK:** If any skill or rule file was modified this session (`.cursor/skills/`, `.cursor/rules/`, `.agents/skills/`, `.agents/AGENTS.md`) → **WARN the user:** "อย่าลืม mirror การเปลี่ยนแปลงนี้ไปยัง [.agents/ | .cursor/] ด้วย ก่อนปิด session"

## Output Schema (Strict — English only)

### Goal: [1 sentence]

### Status: [COMPLETE | IN PROGRESS | BLOCKED — state blocker if blocked]

### Done:

- [Max 7 bullets. Ref paths/URLs only.]

### Next:

- [1. Immediate action first]
- [2. Subsequent steps]

### Decisions:

- [Constraints and key design choices only.]

### Skills:

- [`skill-name`](.cursor/skills/) — [one-line reason]

## Prohibitions

- No conversation history, failed attempts, or chatter.
- Redact all PII/keys/passwords.
- Output MUST be a single code block for `docs/session.md` only.
- NO absolute paths. Workspace-relative paths only.
- **State Cache Eviction:** Delete `docs/current_plan.md` during this phase.
