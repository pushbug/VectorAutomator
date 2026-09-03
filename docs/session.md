### Goal: Multi-Window Concurrency, Tab-Agnostic Watchdog Auto-Shutdown, and Staged Modal Exit Loss Guards.

### Status: COMPLETE

### Done:
- Added multi-window desktop trigger (`sidebar-new-window-btn`) and `Cmd+Shift+N` global keydown listener in `src/components/Sidebar.tsx`.
- Implemented client heartbeat telemetry (`src/components/common/ServerHeartbeat.tsx`) and global mount in `src/app/layout.tsx`.
- Created server watchdog (`src/lib/serverWatchdog.ts`) with 60s boot grace period and 25s idle threshold, auto-closing server and checkpointing SQLite WAL to free port 3000.
- Implemented explicit exit (`sidebar-quit-app-btn` & `/api/system/quit`) and safe terminal wrappers (`scripts/dev.sh`, `scripts/stop.sh`, `npm run app:stop`).
- Added staged exit loss confirmation dialogs and pulsing banners in `SmartIdPasteModal.tsx` and `SmartPasteModal.tsx`.
- Registered ADR-029 in `docs/decisions.md` and updated `docs/systemdesign.md`, `docs/tests/CATALOG.md`, and `docs/tests/SELECTORS.md`.
- Verified all 58 test files (376 unit tests) pass with 0 TypeScript errors.

### Next:
- 1. User may import or paste 2021 historical statements and Adobe Image IDs into the reinforced staged modals.
- 2. Explore bulk batch tag editing across multiple selected assets in `/upload` queue.

### Decisions:
- Tab-Agnostic Heartbeat Watchdog: Server tracks active tabs via 5s pings; stays alive while ANY tab or window is open, and auto-shuts down cleanly after 25s of zero active tabs.
- Multi-Window Concurrency: Enabled via `window.open` on the single port 3000 instance to prevent port drift, session fragmentation, and terminal EADDRINUSE collisions.

### Skills:
- [`debug`](.agents/skills/debug/SKILL.md) — Root cause analysis of EADDRINUSE port collision and daemon process lingering.
- [`consult`](.agents/skills/consult/SKILL.md) — Database audit and clarification of staged preview vs. uncommitted data loss.
- [`plan`](.agents/skills/plan/SKILL.md) — Multi-window and watchdog auto-shutdown architecture planning.
- [`coding`](.agents/skills/coding/SKILL.md) — Implementation of ServerHeartbeat, serverWatchdog, Sidebar triggers, and modal exit guards.
- [`scrutinize`](.agents/skills/scrutinize/SKILL.md) — Gatekeeper audit, WAL persistence reassurance, and test hardening.
- [`handoff`](.agents/skills/handoff/SKILL.md) — Session closure, ADR-029 documentation, and git synchronization.
