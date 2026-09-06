### Goal: Implement 100% ban-safe Shutterstock Contributor Catalog Extraction and Ingestion with dual-platform ID discrimination (asId vs ssId) and automated sales reconciliation.

### Status: COMPLETE

### Done:
- Upgraded `extension/extension-contributor` with `submit.shutterstock.com` dual-domain routing and un-truncated filename DOM scraper.
- Extended `src/lib/contributorParser.ts` with 3-tier platform auto-detection and Shutterstock TSV/HTML parser.
- Enhanced `src/app/api/portfolio/paste-sync/route.ts` to match artworks, update `Image.ssId`, and trigger `reconcileImageSales(prisma, { id, ssId })`.
- Upgraded `src/components/portfolio/SmartIdPasteModal.tsx` with segmented platform toggle (`smart-id-paste-platform-select`), paste auto-detection, and SS ID indicators.
- Added comprehensive unit tests in `src/__tests__/lib/contributorParser.test.ts`, `src/__tests__/api/portfolio_paste_sync.test.ts`, and `src/__tests__/components/SmartIdPasteModal.test.tsx`.
- Added Playwright browser E2E test `E2E-PF-04` in `e2e/portfolio.spec.ts` and registered in `docs/tests/CATALOG.md` and `docs/tests/SELECTORS.md`.
- Documented ADR-031 in `docs/decisions.md` and Section 9 in `docs/features/sales_tracking.md`.

### Next:
- 1. Reload Chrome extension from `extension/extension-contributor` to test live on submit.shutterstock.com.
- 2. Copy Shutterstock portfolio table and paste into Portfolio Smart ID Matcher to sync `ssId`s.

### Decisions:
- 100% Ban-Safe Zero-Network Scraping: Relies purely on passive client-side DOM extraction in the active browser, avoiding bot bans.
- 3-Tier Platform Discrimination: Signature TSV header auto-detection, UI segmented toggle, and backend route branch prevent cross-platform ID contamination.

### Skills:
- [`consult`](.agents/skills/consult/SKILL.md) — Analyzed Shutterstock Contributor DOM structure and safety boundaries.
- [`plan`](.agents/skills/plan/SKILL.md) — Formulated TDD-Lite specification and multi-tier platform discrimination plan.
- [`coding`](.agents/skills/coding/SKILL.md) — Implemented extension scraper, contributor parser, paste-sync API, and modal UI.
- [`scrutinize`](.agents/skills/scrutinize/SKILL.md) — Audited test coverage, verified backward compatibility, and recommended browser E2E test.
- [`handoff`](.agents/skills/handoff/SKILL.md) — Documented ADR-031, updated feature docs, evicted plan cache, and finalized git sync.
