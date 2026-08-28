### Goal: Database Query Performance Refactoring, SERP N+1 Subquery Elimination, Missing Indexes, and Helper Deduplication.

### Status: COMPLETE

### Done:
- Added missing database indexes (`PlatformStats.date`, `PlatformStats.imageId`, `Image.createdAt`, `Image.totalDownloads`) in `prisma/schema.prisma` and regenerated Prisma client.
- Refactored `GET /api/sales` to remove heavy mutation reconciliation and stripped nested lifetime stats hydration from list items.
- Replaced SERP ranking N+1 subquery loop in `GET /api/serp` with parallel batch queries for historical snapshots and direct stats, reducing roundtrips from 200+ to 2.
- Optimized `GET /api/portfolio` summary aggregation projection to prevent loading large keyword tokens into memory for non-keyword searches.
- Removed duplicate local `formatDisplayDate` from `src/app/portfolio/page.tsx` (consuming centralized `@/lib/formatters`) and memoized page selection IDs with `React.useMemo`.
- Guarded `PortfolioDetail.tsx` to compute platform breakdowns synchronously when `image.stats` is already populated.
- Verified zero regressions across the entire test suite (51/51 test files passing, 326/326 tests) and zero TypeScript errors (`npx tsc --noEmit`).
- Documented ADR-023 in `docs/decisions.md` and updated `docs/features/sales_tracking.md`.

### Next:
- 1. Monitor live microstock portfolio browsing, sales dashboard filtering, and SERP queries.
- 2. Expand analytical insights or multi-platform automations as needed.

### Decisions:
- Read-Path Mutation Decoupling: Never execute multi-step database mutations inside HTTP `GET` handlers. Keep reconciliation bound to ingestion and mutation flows.
- Batch Queries over Loops: Replace per-row subqueries in API handlers with single batch `findMany` queries using `in` clauses and in-memory Map lookup.
- Safe Test Mocking: Automated tests mock Prisma delegates in memory and never touch or truncate `dev.db`.

### Skills:
- [`plan`](.agents/skills/plan/SKILL.md) — Architectural planning and performance bottleneck auditing.
- [`coding`](.agents/skills/coding/SKILL.md) — Query optimization, index creation, batch queries, and formatter deduplication.
- [`scrutinize`](.agents/skills/scrutinize/SKILL.md) — Line-by-line diff audit, data flow trace, and full regression verification.
- [`handoff`](.agents/skills/handoff/SKILL.md) — Session wrap-up, ADR documentation, and git synchronization.
