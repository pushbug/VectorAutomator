### Goal: Implement multi-reference Keyword Suggester with 5-scope search, non-destructive deduplicated append, 100-word soft limit with pre-save validation gate, and title validation.

### Status: COMPLETE

### Done:
- Built pure keyword analytics engine (`src/lib/keywordAnalytics.ts`) supporting non-destructive case-insensitive deduplication, 100-word soft cap, and weighted scoring.
- Implemented 5 search scopes (`all`, `title`, `keywords` [default], `code`, `ids`) on `src/app/api/portfolio/route.ts` and eliminated CUID false positives.
- Created `src/components/upload/KeywordSuggester.tsx` with 50/50 split layout, thumbnail previews via `/api/image`, and dual clipboard copy buttons.
- Updated `src/components/upload/MetadataEditor.tsx` with soft-cap 100-word input, live red warning badge/border on >50 keywords, Save button disabled gate, and title red border validation.
- Implemented automatic Title pre-fill using EPS/JPG `baseName` on drop in `src/hooks/useAssetProcessor.ts`.
- Standardized action button sizing, typography, and spacing across `MetadataEditor` and `KeywordSuggester` footers.
- Added comprehensive unit and E2E test suites (`UT-LIB-KEYWORD-ANALYTICS-01`, `UT-UI-KEYWORD-SUGGEST-01`, `UT-UI-KEYWORD-SUGGEST-SEARCH-FIELD-01`, `UT-UI-METADATA-KEYWORD-GATE-01`, `UT-UI-KEYWORD-SUGGEST-COPY-01`, `UT-UI-METADATA-TITLE-VALIDATION-01`, `E2E-UPL-02`).
- Documented feature in `docs/features/keyword_suggest.md`, registered in `docs/INDEX.md`, and logged ADR-008 in `docs/decisions.md`. Passed full TypeScript check and 101 Vitest tests across 19 suites.

### Next:
- 1. Implement Phase 3/4 CSV batch import for stock platform monthly statement uploads.
- 2. Implement SFTP auto-uploader module for Adobe Stock and Shutterstock.

### Decisions:
- Keyword ingestion preserves 100% of existing words in original order when appending, filtering duplicate tokens case-insensitively.
- Allows collection of up to 100 candidate keywords with a strict pre-save validation gate requiring <= 50 words to prevent microstock rejection.
- Search queries exclude database internal CUID `id` to prevent single-digit false positives (e.g. searching '5').
- Title input renders a reactive red border on save attempt when empty, clearing immediately upon typing.

### Skills:
- [`coding`](.agents/skills/coding/SKILL.md) — Implementation of keyword analytics engine, 5 search scopes, UI panels, soft limit gates, and button standardization.
- [`scrutinize`](.agents/skills/scrutinize/SKILL.md) — Multi-layer auditing of keyword deduplication, pre-save gates, visual harmony, and test coverage.
- [`handoff`](.agents/skills/handoff/SKILL.md) — Session closure, decision logging (ADR-008), documentation sync, and git synchronization.
