### Goal: Harden SQLite persistence layer to prevent data loss across backup/restore and close all write-path audit gaps.

### Status: COMPLETE

### Done:
- Upgraded SQLite pre-snapshot checkpoint from PASSIVE to TRUNCATE in `src/lib/dbBackup.ts`.
- Implemented forced process exit (`process.exit(0)`) post-restore in `src/lib/dbBackup.ts` to ensure clean reconnection.
- Made `isTestEnv()` a dynamic function in `src/lib/dbBackup.ts` to support safe isolated testing.
- Added `scheduleAutoBackup()` to `/api/settings` PATCH in `src/app/api/settings/route.ts`.
- Added unit test `UT-LIB-BACKUP-RESTORE-EXIT-01` in `src/__tests__/lib/dbBackup.test.ts` and registered in `docs/tests/CATALOG.md`.
- Extended `UT-API-SETTINGS-01` in `src/__tests__/api/settings.test.ts` with auto-backup assertion.
- Logged ADR-030 in `docs/decisions.md` and verified all 343 unit tests pass with 0 TypeScript errors.

### Next:
- 1. User may continue regular artwork uploads and sales tracking with full persistence durability.
- 2. Optionally test manual restore flows in `playground/` to observe clean auto-restart behavior.

### Decisions:
- Clean Process Exit on Restore: `restoreDbBackup` forces `process.exit(0)` in production so supervisor auto-restarts with fresh DB file handles, preventing stale Prisma connection data loss.
- Universal Auto-Backup Parity: All database mutation routes across the system now trigger `scheduleAutoBackup()` with 30s debounce.

### Skills:
- [`consult`](.agents/skills/consult/SKILL.md) — Comprehensive database write-path and persistence audit across 15+ API routes.
- [`plan`](.agents/skills/plan/SKILL.md) — TDD-Lite specification and plan formulation in `docs/current_plan.md`.
- [`coding`](.agents/skills/coding/SKILL.md) — Minimal, surgical implementation of TRUNCATE checkpoints, restore exits, and settings auto-backup.
- [`scrutinize`](.agents/skills/scrutinize/SKILL.md) — Gatekeeper validation, regression audit, and concurrency verification for web vs launch app.
- [`handoff`](.agents/skills/handoff/SKILL.md) — Session closure, ADR-030 documentation, plan eviction, and git sync.
