### Goal: Deliver image editing functionality via unified AddImageDrawer, header Edit trigger in PortfolioDetail, and robust PATCH API with state synchronization.

### Status: COMPLETE

### Done:
- Removed redundant bottom 'Record New Sale for this Image' CTA button from `src/components/portfolio/PortfolioDetail.tsx`.
- Extended `src/app/api/portfolio/route.ts` `PATCH` endpoint to support full image metadata updates, optional file replacement, and duplicate code validation excluding current ID.
- Upgraded `src/components/portfolio/AddImageDrawer.tsx` with `editImage` dual-mode support, dynamic titles/buttons, guarded auto-code generation, and optional image replacement.
- Integrated header Edit button in `src/components/portfolio/PortfolioDetail.tsx` and wired edit drawer in `src/app/portfolio/page.tsx` with immediate state synchronization.
- Added unit tests in `src/__tests__/api/portfolio.test.ts` for full metadata updates and duplicate code conflicts.
- Registered test ID `UT-API-PF-EDIT-01` in `docs/tests/CATALOG.md` and selector `portfolio-detail-edit-btn` in `docs/tests/SELECTORS.md`.
- Executed and passed all 52 Unit tests across 10 test suites and all 4 Playwright E2E tests.

### Next:
- 1. Implement Phase 3/4 CSV batch import for stock platform monthly statement uploads.
- 2. Implement SFTP auto-uploader module for Adobe Stock and Shutterstock.

### Decisions:
- Reused `AddImageDrawer` in dual-mode rather than creating a separate edit component to avoid maintenance fragmentation.
- Guarded auto-code generation (`!editImage`) and applied `where: { code, NOT: { id } }` to prevent accidental overwrites and self-collision false positives.

### Skills:
- [`coding`](.agents/skills/coding/SKILL.md) — Surgical implementation of edit mode across drawer, panel, and API.
- [`scrutinize`](.agents/skills/scrutinize/SKILL.md) — Pre-flight risk analysis and post-implementation E2E/Unit verification.
- [`handoff`](.agents/skills/handoff/SKILL.md) — Session wrap-up, decision logging, and branch synchronization.
