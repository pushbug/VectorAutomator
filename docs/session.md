### Goal: Deliver transaction-based Sales & Earnings Tracking module (/sales) integrated with Portfolio Dashboard, and eliminate LSP canonical class warnings.

### Status: COMPLETE

### Done:
- Built `/api/sales` backend route with date-normalized upsert and automatic parent `Image` rollup calculation in `src/app/api/sales/route.ts`.
- Created dedicated Sales & Earnings Manager page at `src/app/sales/page.tsx` with KPI summary cards and transaction log table.
- Implemented `SaleEntryDrawer.tsx` supporting image auto-suggest search and multi-platform statement entry.
- Updated `PortfolioDetail.tsx` and `src/app/portfolio/page.tsx` to display real-time platform breakdown and quick "+ Log Sale" trigger.
- Sanitized arbitrary pixel classes to canonical Tailwind v4 utilities (`min-w-50`, `w-25`) across components.
- Enforced 3-Layer canonical class defense in `.agents/AGENTS.md`, `.agents/.cursor/rules/typescript.mdc`, `docs/systemdesign.md`, and scrutinize skill.
- Added 7 Unit tests in `src/__tests__/api/sales.test.ts` and E2E specs in `e2e/sales.spec.ts` & `e2e/portfolio.spec.ts` (all 27 Unit + 4 E2E passed).

### Next:
- 1. Implement Phase 3/4 CSV batch import for stock platform monthly statement uploads.
- 2. Implement SFTP auto-uploader module for Adobe Stock and Shutterstock.

### Decisions:
- Transaction-based `PlatformStats` model with date normalization ensures temporal integrity and multi-platform scalability over raw download overwriting.
- 3-Layer defense rule against redundant arbitrary brackets (`[200px]` -> `50`) permanently eliminates IDE LSP warnings.

### Skills:
- [`coding`](.agents/skills/coding/SKILL.md) — Surgical code generation for sales module and portfolio integration.
- [`scrutinize`](.agents/skills/scrutinize/SKILL.md) — Multi-layer E2E gatekeeper audit and Tailwind canonical verification.
- [`handoff`](.agents/skills/handoff/SKILL.md) — Session closure, durable decision logging, and git synchronization.
