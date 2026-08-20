### Goal: Refactor architectural redundancies (Prisma singleton, rollup synchronization, image code parsing, platform constants, and UI formatters) and expand test suite with batch sales E2E.

### Status: COMPLETE

### Done:
- Centralized `PrismaClient` initialization into a global singleton in `src/lib/prisma.ts` with `globalThis` connection caching to prevent Next.js HMR memory leaks and SQLite locks across all 6 API routes.
- Unified parent image rollup calculation into a transaction-safe pure function `syncImageRollup(prismaOrTx, imageId)` in `src/lib/salesReconciler.ts` supporting both standalone client and interactive transaction contexts.
- Extracted image code parsing (`parseImageCode`) and monthly sequence generation (`getNextImageCode`) into `src/lib/imageCode.ts` and integrated across `/api/upload` and `/api/portfolio`.
- Centralized microstock platform definitions in `src/lib/platforms.ts` and null-safe formatting helpers (`formatCurrency`, `formatNumber`, `formatTableDate`, `formatDisplayDate`) in `src/lib/formatters.ts`.
- Updated UI components (`PortfolioDetail`, `SalesTable`, `SmartPasteModal`, `SaleEntryDrawer`, `SalesSummaryCards`, `KpiCards`, and `/portfolio`) to use centralized platform themes and formatters.
- Added standalone unit tests (`UT-SALES-ROLLUP-01`, `UT-CODE-SEQ-01`), resolved React `act(...)` warning in `KeywordSuggester.test.tsx`, and added Playwright test scenario `E2E-SALES-04` for batch sales operations.
- Appended ADR-010 to `docs/decisions.md` and registered all test IDs in `docs/tests/CATALOG.md` (134/134 Vitest tests passing).

### Next:
- 1. Implement Phase 3/4 CSV batch import for stock platform monthly statement uploads.
- 2. Implement SFTP auto-uploader module for Adobe Stock and Shutterstock.

### Decisions:
- Centralized `PrismaClient` in `src/lib/prisma.ts` caches the instance on `globalThis` in development mode to prevent SQLite connection exhaustion during HMR reloads.
- `syncImageRollup` accepts either a standalone `PrismaClient` or an interactive transaction client (`tx`) to prevent SQLite concurrency deadlocks inside `$transaction` blocks.
- Formatters provide safe fallbacks (`$0.00` for currency, `0` for numbers, `-` for dates) to ensure zero UI runtime crashes on uninitialized metrics.

### Skills:
- [`coding`](.agents/skills/coding/SKILL.md) — Implemented database singleton, rollup reconciliation, code parsing, formatters, and UI integrations.
- [`scrutinize`](.agents/skills/scrutinize/SKILL.md) — Gatekeeper audits, regression checks, selector validation, and test suite verification across 134 tests.
- [`handoff`](.agents/skills/handoff/SKILL.md) — Session closure, decision logging (ADR-010), doc updates, and git synchronization.
