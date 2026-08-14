# Project Rules & Customizations

- **Planning & Execution Workflow:** Use `docs/current_plan.md` as the single source of truth for planning. Do not create `implementation_plan.md` artifacts. Wait for user approval on the plan before executing changes.
- **Tone & Style:** Comply with the global rules (Output Thai for explanations, English for code, Zero fluff).

# Agent Instructions

Phased co-pilot workflow. Skills: `.agents/skills/` · Docs hub: `docs/INDEX.md`

Commands: `.think` `.consult` `.plan` `.dev` `.debug` `.scrutinize` `.done`

---

# Co-Pilot Core (v4)

## Command gate

Prefixes: `.think` `.consult` `.plan` `.dev` `.scrutinize` `.debug` `.done`

No prefix → ask for command only. No reads, code, tests, or edits.
Auto-trigger exception: `.debug` may be spawned internally by the `.dev` self-heal loop only. A user message describing a bug WITHOUT a `.debug` prefix still hits this gate — ask for the command.

Flow: `.think` → [`.consult`]_ → `.plan` → `.dev` → [`.debug`]_ → `.scrutinize` → `.done`

## Communication

- Chat replies to the user: Thai, concise, easy to follow. Explain just enough.
- All written artifacts (docs, plans, code, comments, commit msgs): English only — token efficiency. Write for the AI to re-read, not for the user.
- **Two-layer output** (scrutinize, debug, coding, and any phase that reports findings to the user):
  - **Layer 1 — สรุป (ไทย):** 1–2 sentences in plain language + options if applicable. No deep jargon. For the human.
  - **Layer 2 — [for AI] Technical:** Compact block with `file:line`, root cause, fix path. For the next AI turn to act precisely. Always after Layer 1.

## Global

- No browser_subagent unless requested.
- `.dev` must not edit `docs/session.md` or delete `docs/current_plan.md`.
- Code or doc file nearing 300 lines → review trigger only, NOT an auto-split rule. Evaluate, then ASK the user before splitting. Split only if responsibilities are genuinely mixed/coupled; keep it if a split would worsen maintainability.
- **SKILL SYNC:** If any file under `.agents/skills/` or `.agents/AGENTS.md` is modified, remind the user to mirror the change in `.cursor/skills/` or `.cursor/rules/` — and vice versa. Both tool configs must stay in logical parity. (Paths that intentionally differ: internal cross-refs only.)
- **TEST FILES & SCRATCHPAD:** Do NOT create temporary test scripts, scratchpads, or logs in the root directory. Always reuse, modify, or create files within the `playground/` directory for API experiments and isolated testing.

## Session anchor

On the first phase command of a new session (once only): read `docs/INDEX.md` + `docs/session.md`, confirm status. Missing session → notify, await `.plan`.
`.think` is read-free — never reads files (see think skill); session anchor does not apply to it.
`.consult` is read-only — reads files to answer questions but never writes. Session anchor applies.

## Phase routing

Read skills at `.agents/skills/{name}/SKILL.md`, then docs per skill. Never read legacy monoliths (`project_map.md`, `ARCHITECTURE.md`, `TESTS.md`) — use INDEX routing only.

| Phase         | Skills              | Docs                                                                                                                                                      |
| ------------- | ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `.think`      | think               | —                                                                                                                                                         |
| `.consult`    | consult             | INDEX, session; then any docs/source files needed to answer                                                                                               |
| `.plan`       | plan, testing       | INDEX, prd, design, decisions; feature + test docs per plan skill                                                                                         |
| `.dev`        | coding              | current_plan; compliance (safety contract — always); core/feature docs listed in plan; +transport-states if touching stats/replay                         |
| `.debug`      | debug               | data-flow, dependencies; +danger-zones if state/timer bug; +transport-states if state machine bug                                                         |
| `.scrutinize` | scrutinize, testing | current_plan (test IDs first); tests/OVERVIEW; tests/CATALOG only if IDs missing or cross-feature; feature/core docs of changed files; tests/SCENARIOS.md |
| `.done`       | handoff             | INDEX, session; append new decisions to decisions.md; update affected feature/core/test docs                                                              |

---

# Documentation Standards

- English only. Workspace-relative paths only — no absolute paths.
- Hub: `docs/INDEX.md`. Feature/core/test content lives in subfolders — update scoped files only.
- Concise bullets; no chat history in `session.md`. Describe current state, not change history (history lives in git).
- `docs/current_plan.md` owned by `.plan`; deleted by `.done`.

## Doc lifecycle (create / split / register)

- New feature or core area with NO matching doc → create a new scoped file under `docs/features/` or `docs/core/`. Do not cram it into an unrelated doc.
- Any doc created, split, or renamed MUST be registered in `docs/INDEX.md` (add a routing-table row with a "when to read" note). Also update any skill that hardcodes the path.
- Doc nearing 300 lines → review and propose a split to the user with a reason; do not split automatically. Split only if topics are genuinely separable; if a split would scatter related context, keep it. After an approved split, update `docs/INDEX.md` rows.

---

# TypeScript / React

- Read target file before write. Touch only scoped files; no drive-by refactors.
- Match existing imports, naming, hooks, and component patterns 1:1.
- Minimum code for spec; no speculative abstractions or single-use helpers.
- Comments: only for non-obvious intent, trade-offs, or safety guards. Never narrate what the code does. No emoji in comments. English only.
- Run `npx tsc --noEmit` after edits. Local Vitest only during `.dev` — no full E2E here.
- **UI Components & Icons:** Always prioritize `shadcn/ui`. Only build custom UI if shadcn cannot be adapted. All custom UI MUST use semantic theme variables (e.g. `bg-background`) for automatic dark/light mode support. Strictly use `lucide-react` for all icons.
- **Responsive Design:** All UI components MUST be fully responsive by default. Always apply a Mobile-first approach using Tailwind breakpoints (`sm:`, `md:`, `lg:`, `xl:`).
- **Zustand Stores:** Always use `useShallow` (from `zustand/react/shallow`) when selecting from any store. Never use dynamic `import()` inside `useEffect` for server actions — use static imports only.
- **Event Listeners:** Never bind `window.addEventListener` inside Zustand stores or generic utility files. Always bind global event listeners inside a React `useEffect` with a proper `removeEventListener` cleanup function to prevent Next.js HMR memory leaks.
- **Tailwind CSS v4 Canonical Classes:** Always use modern canonical classes (e.g. `shrink-0` instead of `flex-shrink-0`, `grow` instead of `flex-grow`, `shrink` instead of `flex-shrink`). Never use deprecated/legacy utility aliases or redundant arbitrary pixel brackets (e.g. use `min-w-50` instead of `min-w-[200px]`, `w-25` instead of `w-[100px]`, `h-4` instead of `h-[16px]`) that trigger `suggestCanonicalClasses` LSP diagnostics.

---

# E2E Tests

- Selectors: `data-testid` from `docs/tests/SELECTORS.md` — no brittle CSS-only anchors.
- Test IDs: register in `docs/tests/CATALOG.md` before `.plan` closes.
- Test observable behavior, not implementation details.
- Fix production code under `.dev`; never weaken assertions to pass.
