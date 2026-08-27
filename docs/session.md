### Goal: Dedicated Adobe Stock Sales Extractor Chrome Extension, Dual-Layer Date Ingestion, Duplicate Sales Warning, and In-Payload Deduplication.

### Status: COMPLETE

### Done:
- Created dedicated Manifest V3 Chrome Extension (`extension/extension-sales/`) for 1-click passive sales extraction from Adobe Contributor Insights, decoupled from contributor/serp extensions.
- Hooked into Adobe's `Display statistics` button with async spinner polling and floating button pulse animation.
- Implemented Dual-Layer Statement Date Ingestion: client auto-detection in `SmartPasteModal` and server-side date prioritization in `POST /api/sales/paste-sync`.
- Added duplicate sales warning alert (`smart-paste-duplicate-warning`) in preview mode if existing records are detected on target date.
- Added in-payload `assetId` deduplication in `parseStockPaste` (Strategy 1 & 2) and auto-replacement on paste, eliminating duplicated items/earnings.
- Added 1-click `Clear` button (`smart-paste-clear-btn`) in `SmartPasteModal`.
- Added and registered unit tests `UT-SALES-PASTE-DATE-01`, `UT-SALES-PASTE-DUP-01`, `UT-SALES-DATE-02`, `UT-SALES-PASTE-DEDUP-01`, and `UT-UI-SMART-PASTE-AUTODATE-01` (321/321 tests passing across 50 test files with 0 TypeScript errors).
- Documented ADR-022 in `docs/decisions.md` and updated `docs/features/sales_tracking.md`.

### Next:
- 1. Monitor live microstock sales statements and daily earnings ingestion in contributor workflows.
- 2. Explore multi-platform sales analytics expansions.

### Decisions:
- Standalone Sales Extension: Keep sales extractor 100% decoupled in `extension/extension-sales/` for zero bot detection and focused scope.
- Dual-Layer Date Defense: Always prioritize date headers extracted from raw paste text over client-sent date state.
- In-Payload Deduplication: Always deduplicate parsed rows by `assetId` to guarantee unique sales entries.
- Safe Test Mocking: Automated tests mock Prisma delegates in memory and never touch `dev.db`.

### Skills:
- [`plan`](.agents/skills/plan/SKILL.md) — Architectural planning and TDD-Lite specification.
- [`coding`](.agents/skills/coding/SKILL.md) — Extension implementation, parser upgrades, and UI modal enhancements.
- [`scrutinize`](.agents/skills/scrutinize/SKILL.md) — Diff audits, test coverage checks, and regression audits.
- [`handoff`](.agents/skills/handoff/SKILL.md) — Documentation synchronization, ADR logging, session wrap-up, and git push.
