### Goal: Redundancy Elimination, Dynamic Keyword Sorting & Test Suite Hardening, and Unified Navigation Hierarchy.

### Status: COMPLETE

### Done:
- Refactored redundant platform revenue aggregations into a single-pass helper `calculatePlatformBreakdown` in `src/lib/formatters.ts` and integrated across `/api/portfolio`, `/api/sales`, and `PortfolioDetail.tsx`.
- Consolidated `CollectionModal.tsx` handling create/edit modes with dynamic `data-testid` prefixing and lightweight delegating wrappers for `CreateCollectionModal.tsx` and `EditCollectionModal.tsx`.
- Unified fallback-safe clipboard copying (`copyToClipboard`) in `MetadataEditor.tsx` and `ActivitySplitGrid.tsx`.
- Standardized number and currency formatting with `formatNumber` and `formatCurrency` across all dashboard, table, and detail components.
- Deleted dead test route `src/app/add-image/`.
- Hardened unit and E2E test suites with `UT-LIB-STATS-BREAKDOWN-01` and `UT-UI-METADATA-EDITOR-TIE-01` (tie-breaking, missing metrics, and bidirectional sorting) and enhanced Playwright `E2E-UPL-02`.
- Synchronized Sidebar navigation menu items (`Dashboard`, `Upload & Keywords`, `Portfolio`, `Collections`, `Keyword Insights`, `Sales & Earnings`) with all page `<h1>` headings and removed redundant subtitles.
- Maintained 100% test pass rate with 197/197 unit tests passing across 32 test files.
- Appended ADR-013 to `docs/decisions.md` and updated test catalogs.

### Next:
- 1. Implement Phase 3/4 CSV batch import for stock platform monthly statement uploads.
- 2. Implement SFTP auto-uploader module for Adobe Stock and Shutterstock.

### Decisions:
- Centralized `calculatePlatformBreakdown` aggregates `totalEarnings`, `totalDownloads`, and `platformBreakdown` in a single pass.
- `CollectionModal` dynamically computes testid prefix (`create-collection-*` vs `edit-collection-*`) to preserve 100% test compatibility.
- Page headings and Sidebar navigation labels follow strict 1:1 symmetry across all views.

### Skills:
- [`coding`](.agents/skills/coding/SKILL.md) — Refactored redundant aggregations, unified modals, standardized formatters, and aligned navigation labels.
- [`scrutinize`](.agents/skills/scrutinize/SKILL.md) — Multi-tier regression diff auditing, tie-breaking test verification, and DOM selector checks.
- [`handoff`](.agents/skills/handoff/SKILL.md) — Session closure, decision logging (ADR-013), documentation sync, and git delivery.
