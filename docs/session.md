### Goal: Microstock Payouts & Withdrawals Management Module, Proportional Bundled Withdrawals, Google Sheet TSV Smart Paste, and Responsive 2K Table Refinements.

### Status: COMPLETE

### Done:
- Implemented `PayoutTransaction` entity in `prisma/schema.prisma` with 3-stage lifecycle (`pending`, `in_platform`, `completed`), fees, exchange rates, and tax year tracking.
- Built pure calculation engine in `src/lib/payoutCalculations.ts` for auto-fees, 2-way currency conversions, proportional bundled THB split, and TSV/multi-space tokenizers.
- Implemented CRUD and batch API endpoints at `src/app/api/payouts/`, `src/app/api/payouts/[id]`, and `src/app/api/payouts/batch`.
- Created interactive `/payouts` page with 4 KPI summary cards (Realized THB, Holding USD, Total Fees, Total Transactions count), 2-line stacked headers (`bg-muted/10`), 3-dots action menus (`MoreVertical`), and Bangkok Bank default.
- Implemented `PayoutEntryModal`, `PayoutPasteModal` (Google Sheet Smart Paste), and `PayoutBatchModal` (bundled transfer).
- Centralized constants and helpers, eliminated dead states, and applied Tailwind v4 canonical `max-w-370` container scaling.
- Verified 100% test coverage with 219/219 unit tests passing across 35 files and 2/2 Playwright E2E tests passing.

### Next:
- 1. Monitor production payout logs and contributor statement imports.
- 2. Explore automated monthly CSV statement parsers for stock earnings.

### Decisions:
- Single Source of Truth: `STOCK_AGENCIES`, `THAI_BANKS`, and `getStockBadgeColor` centralized in `src/lib/payoutCalculations.ts`.
- Proportional THB split algorithm distributes net income according to each stock's USD contribution without rounding drift.
- Replaced Avg Exchange Rate card with Total Transactions count for actionable creator metrics.
- Applied canonical `max-w-370` layout container across all app pages.

### Skills:
- [`plan`](.agents/skills/plan/SKILL.md) — Architectural planning for Payouts & Withdrawals lifecycle.
- [`coding`](.agents/skills/coding/SKILL.md) — Implementation of Prisma schema, API routes, calculation engines, UI components, and table refactoring.
- [`debug`](.agents/skills/debug/SKILL.md) — Prisma HMR caching guard and Tailwind v4 canonical class corrections.
- [`scrutinize`](.agents/skills/scrutinize/SKILL.md) — Full automated regression auditing, E2E test verification, and dead-code detection.
- [`handoff`](.agents/skills/handoff/SKILL.md) — Session closure, documentation updates, ADR-014 registration, and git delivery.
