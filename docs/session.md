### Goal: Proactive Sales Auto-Reconciliation, 100% ADR-020 Universal Image URLs, Modular SERP Reconciler, and LCP Grid Optimization.

### Status: COMPLETE

### Done:
- Implemented proactive automatic sales reconciliation (`reconcileAllUnlinkedSales` in `src/lib/salesReconciler.ts`) integrated into `GET /api/sales` to automatically bind unlinked `PlatformStats` to matching artworks.
- Achieved 100% ADR-020 compliance across Dashboard (`ActivitySplitGrid`) and SERP (`ArtworkSerpDrawer`, `FullSerpModal`) by wrapping all thumbnail paths with `getImageUrl()` and `unoptimized`.
- Modularized SERP auto-reconciliation into `src/lib/serpReconciler.ts` (`reconcileImageSerp`, `autoReconcileSerpItems`), decoupling raw SQL from `/api/serp/route.ts`.
- Optimized Next.js Largest Contentful Paint (LCP) across all grid views (`PortfolioGrid`, `CollectionCard`, Collection Detail) with `priority={index < 4}` on above-the-fold image cards.
- Added and registered unit tests `UT-UI-PF-LCP-01`, `UT-SALES-RECONCILE-03`, and `UT-SERP-RECONCILE-03` (316/316 tests passing across 50 test files with 0 TypeScript errors).
- Documented ADR-021 in `docs/decisions.md` and updated scoped feature docs.

### Next:
- 1. Monitor live microstock sales statements and SERP crawler imports in daily contributor operations.
- 2. Expand keyword performance intelligence and cross-platform sync capabilities.

### Decisions:
- Proactive Sales Reconciler: Always run `reconcileAllUnlinkedSales(prisma)` on `GET /api/sales` to ensure zero orphaned sales records when matching artworks exist.
- 100% Universal Image URL: Never pass raw `filePath` to `src` — always use `getImageUrl(filePath, updatedAt)` from `@/lib/formatters`.
- Modular Reconcilers: All database cross-referencing and rollup syncing live in pure library modules under `src/lib/`.
- Safe Test Mocking: Automated tests mock Prisma delegates in memory and never touch `dev.db`.

### Skills:
- [`plan`](.agents/skills/plan/SKILL.md) — Architectural planning and TDD-Lite specification.
- [`coding`](.agents/skills/coding/SKILL.md) — Reconciler implementation, image URL standardization, and LCP optimization.
- [`scrutinize`](.agents/skills/scrutinize/SKILL.md) — Full diff audits, persistence safety checks, and zero-regression testing.
- [`handoff`](.agents/skills/handoff/SKILL.md) — Documentation synchronization, ADR logging, session wrap-up, and git push.
