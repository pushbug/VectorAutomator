### Goal: Image Caching & Dynamic ETag Revalidation, Universal Image URL & File Storage Refactoring, and Action-Oriented Portfolio Filters.

### Status: COMPLETE

### Done:
- Implemented dynamic ETag and HTTP 304 conditional revalidation with `Cache-Control: no-cache, must-revalidate` in `/api/image`.
- Streamlined Portfolio ID Filter down to 5 action-oriented options (`all`, `missing_asId`, `missing_ssId`, `missing_all_ids`, `missing_image_file`).
- Consolidated `getImageUrl()` and `getTodayDateString()` into `src/lib/formatters.ts`, updating 12 UI components to eliminate manual `/api/image` concatenations.
- Centralized image saving and unlinking into `src/lib/fileStorage.ts` (`saveImageFile`, `deleteOldImageFile`, `inferImageExtension`), refactoring `/api/upload` and `/api/portfolio`.
- Added unit test suites `UT-API-IMG-CACHE-01`, `UT-LIB-FORMATTERS-02`, and `UT-LIB-STORAGE-01` (304/304 tests passing across 48 test files with 0 type errors).
- Documented ADR-020 in `docs/decisions.md` and registered tests in `docs/tests/CATALOG.md`.

### Next:
- 1. Monitor live image replacement workflow and file upload stability in daily operations.
- 2. Expand keyword performance analytics and cross-platform sync capabilities.

### Decisions:
- Centralized Image URL: Always use `getImageUrl(filePath, updatedAt)` from `@/lib/formatters` for automatic URI encoding and versioned cache-busting.
- Shared Storage Logic: Always use `saveImageFile` and `deleteOldImageFile` from `@/lib/fileStorage` for disk mutations.
- ETag Revalidation: Images are served with dynamic ETags derived from file size and mtimeMs, enabling instant browser refresh on overwrite without sacrificing bandwidth.

### Skills:
- [`plan`](.agents/skills/plan/SKILL.md) — Architectural planning and TDD-Lite specification.
- [`coding`](.agents/skills/coding/SKILL.md) — File storage consolidation, image URL formatting, and route refactoring.
- [`scrutinize`](.agents/skills/scrutinize/SKILL.md) — System-wide verification, zero-regression audit, and test coverage validation.
- [`handoff`](.agents/skills/handoff/SKILL.md) — Documentation synchronization, ADR logging, session wrap-up, and git push.

