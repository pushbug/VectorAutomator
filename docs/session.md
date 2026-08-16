### Goal: Implement selective batch portfolio import with card checkboxes, automatic monthly sequence generation, and queue clearing.

### Status: COMPLETE

### Done:
- Added selection checkboxes to `AssetQueue` cards with active highlight and Select All header toggle (`src/components/upload/AssetQueue.tsx`).
- Added batch Import to Portfolio action button to `UploadPage` header with dynamic ready counter (`src/app/upload/page.tsx`).
- Implemented `toggleSelectForImport`, `selectAllForImport`, and `importSelectedToPortfolio` in `useAssetProcessor` (`src/hooks/useAssetProcessor.ts`).
- Updated `POST /api/upload` to automatically query and increment monthly sequence code (`YYMM-seq`) when code is omitted (`src/app/api/upload/route.ts`).
- Updated `GET /api/portfolio` `orderBy` to hierarchically sort by year, month, seqNumber, and createdAt (`src/app/api/portfolio/route.ts`).
- Registered test ID `UT-IMPORT-QUEUE-01` and selectors in `docs/tests/CATALOG.md` and `docs/tests/SELECTORS.md`.
- Passed full TypeScript check (`npx tsc --noEmit`) and all 67 Vitest tests across 14 suites (`src/__tests__/useAssetProcessor.test.ts`, `src/__tests__/api/upload.test.ts`, `src/__tests__/api/portfolio.test.ts`).

### Next:
- 1. Implement Phase 3/4 CSV batch import for stock platform monthly statement uploads.
- 2. Implement SFTP auto-uploader module for Adobe Stock and Shutterstock.

### Decisions:
- Selected items in Process & Upload queue are ingested sequentially into `/api/upload` and automatically removed on success (Queue Clearing) to prevent duplicate submissions.
- Portfolio items are sorted hierarchically by `[{ year }, { month }, { seqNumber }, { createdAt }]` to guarantee consistent numerical and chronological sequence ordering.

### Skills:
- [`coding`](.agents/skills/coding/SKILL.md) — Implementation of selection controls, batch upload, auto code generation, and multi-level ordering.
- [`scrutinize`](.agents/skills/scrutinize/SKILL.md) — Verification of state isolation, error bounds, and full test suite execution.
- [`handoff`](.agents/skills/handoff/SKILL.md) — Session wrap-up, decision logging (ADR-006), and git synchronization.
