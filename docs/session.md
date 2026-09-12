### Goal: Implement 1-click on-demand manual database backup button in the sidebar with real-time feedback and upgrade backup engine to force synchronous Prisma WAL consolidation.

### Status: COMPLETE

### Done:
- Added `force?: boolean` option to `createDbBackup()` in `src/lib/dbBackup.ts` to bypass SHA-256 duplicate suppression on manual request.
- Implemented `POST /api/system/backup` in `src/app/api/system/backup/route.ts` with synchronous Prisma TRUNCATE checkpoint and formatted JSON response.
- Integrated `sidebar-backup-btn` in `src/components/Sidebar.tsx` with loading spinner and 3.5-second transient checkmark/error tooltips.
- Added unit tests for `UT-API-SYSTEM-BACKUP-01` in `src/__tests__/api/system_backup.test.ts`.
- Added unit tests for `UT-UI-SIDEBAR-BACKUP-01` and `UT-UI-SIDEBAR-BACKUP-02` in `src/__tests__/components/Sidebar.test.tsx`.
- Registered selector in `docs/tests/SELECTORS.md` and test IDs in `docs/tests/CATALOG.md`.
- Documented ADR-033 in `docs/decisions.md` and updated `docs/systemdesign.md`.

### Next:
- 1. Launch desktop app or open browser to test clicking "Backup Now" in the Sidebar.
- 2. Inspect `backups/` directory to verify new timestamped `.db.gz` file generation.

### Decisions:
- Synchronous Prisma WAL Flush: Executing `PRAGMA wal_checkpoint(TRUNCATE)` directly through the shared Prisma client guarantees active WAL frames are committed to `dev.db` before snapshotting.
- Forced Snapshot Creation: Explicit user clicks bypass SHA-256 deduplication to guarantee an archived snapshot is always produced.

### Skills:
- [`plan`](.agents/skills/plan/SKILL.md) — Formulated TDD-Lite specification and registered selectors for on-demand backup.
- [`coding`](.agents/skills/coding/SKILL.md) — Implemented Prisma checkpoint route, forced backup logic, sidebar button, and unit tests.
- [`scrutinize`](.agents/skills/scrutinize/SKILL.md) — Audited diff classifications, verified database safety isolation rules, and validated 100% test pass.
- [`handoff`](.agents/skills/handoff/SKILL.md) — Documented ADR-033, updated session.md, evicted plan cache, and performed git push.
