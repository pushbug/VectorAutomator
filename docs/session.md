### Goal: Implement direct single-item and multi-select bulk status management with SQLite transaction safety and auto-backup in Payouts & Withdrawals.

### Status: COMPLETE

### Done:
- Added batch `update_status` action in `src/app/api/payouts/batch/route.ts` with `scheduleAutoBackup()`.
- Implemented single-item status override support in `src/app/api/payouts/[id]/route.ts`.
- Integrated 1-click status toggles (`Mark Completed` / `Mark Holding`) in `src/components/payouts/PayoutTable.tsx` 3-dots action menu.
- Added multi-select `Mark Completed` bulk action button to `PayoutTable` floating toolbar.
- Integrated `Status Override` select dropdown in `src/components/payouts/PayoutEntryModal.tsx`.
- Added unit test `UT-API-PAYOUT-BATCH-02` in `src/__tests__/api/payouts.test.ts` and extended `UT-UI-PAYOUT-01` in `src/__tests__/components/Payouts.test.tsx`.
- Updated `docs/features/payout_tracking.md` and documented ADR-032 in `docs/decisions.md`.

### Next:
- 1. View `/payouts` in browser and use the multi-select checkboxes or 3-dots menu to transition historical transactions from holding to completed.
- 2. Inspect aggregate KPI summary cards to observe instant real-time holding USD deduction and realized net income updates.

### Decisions:
- Zero Dummy Data Requirement: Users can mark transactions completed without entering fictitious bank names, dates, or rates.
- Transactional Batch Mutation: Batch status changes run atomically in SQLite transactions and trigger automatic WAL backups.

### Skills:
- [`plan`](.agents/skills/plan/SKILL.md) — Formulated TDD-Lite specification and registered selectors for status management.
- [`coding`](.agents/skills/coding/SKILL.md) — Implemented batch status endpoint, table toggles, bulk action button, and modal override.
- [`scrutinize`](.agents/skills/scrutinize/SKILL.md) — Audited code complexity, file length, verified test selectors, and evaluated refactoring needs.
- [`handoff`](.agents/skills/handoff/SKILL.md) — Documented ADR-032, updated feature doc, updated session.md, evicted plan cache, and executed git sync.
