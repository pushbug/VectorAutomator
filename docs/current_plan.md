Status: DRAFT
Goal: Refactor the monolithic upload page to improve maintainability, and establish a testing framework (Vitest & Playwright) for unit and E2E coverage.
Docs to read during .dev: docs/INDEX.md, docs/tests/OVERVIEW.md (to be created), docs/tests/CATALOG.md (to be created)

Files Affected: 
- src/app/upload/page.tsx -> [MODIFY] (Remove complex logic and UI elements)
- src/components/upload/Dropzone.tsx -> [NEW] (UI for dragging files)
- src/components/upload/AssetQueue.tsx -> [NEW] (UI for listing processed assets)
- src/components/upload/MetadataEditor.tsx -> [NEW] (UI for editing generated metadata)
- src/hooks/useAssetProcessor.ts -> [NEW] (Business logic for file processing and API fetching)
- package.json -> [MODIFY] (Add testing dependencies)
- playwright.config.ts -> [NEW] (Playwright setup)
- vitest.config.ts -> [NEW] (Vitest setup)
- docs/tests/OVERVIEW.md -> [NEW] (Testing strategy and rules)
- docs/tests/CATALOG.md -> [NEW] (Registry for test IDs)
- docs/tests/SELECTORS.md -> [NEW] (Registry for test selectors)
- e2e/upload.spec.ts -> [NEW] (E2E Test for critical path)
- src/__tests__/useAssetProcessor.test.ts -> [NEW] (Unit Test for business logic)
- src/__tests__/AssetContext.test.tsx -> [NEW] (Unit Test for context)
- src/__tests__/api/convert.test.ts -> [NEW] (Unit Test for EPS to JPG API)
- src/__tests__/api/metadata.test.ts -> [NEW] (Unit Test for AI metadata API)

Test Mapping: [NEW-TESTS]
- Unit tests: useAssetProcessor.test.ts, AssetContext.test.tsx, api/convert.test.ts, api/metadata.test.ts
- E2E tests: e2e/upload.spec.ts
- Selectors to register: `dropzone-input`, `asset-queue-item-{id}`, `metadata-title-input`, `metadata-keywords-input`, `save-metadata-btn`, `download-eps-btn`, `download-jpg-btn`

Steps: 
- [ ] Step 1 (Setup Testing): Install `vitest`, `@testing-library/react`, `@playwright/test` and their configurations.
- [ ] Step 2 (Documentation): Create the required testing docs (`OVERVIEW.md`, `CATALOG.md`, `SELECTORS.md` under `docs/tests/`) and register them in `docs/INDEX.md`.
- [ ] Step 3 (Refactor Logic): Create `src/hooks/useAssetProcessor.ts` by extracting all file handling, API calls, and context manipulation from `page.tsx`.
- [ ] Step 4 (Refactor UI): Create `Dropzone.tsx`, `AssetQueue.tsx`, and `MetadataEditor.tsx` in `src/components/upload/`. Add `data-testid` to interactive elements as defined in SELECTORS.md.
- [ ] Step 5 (Re-assemble): Update `src/app/upload/page.tsx` to import the new components and hook, keeping it clean and readable.
- [ ] Step 6 (Write Tests): Implement unit tests for the context, hook, and API route handlers (mocking fetch/AI responses). Implement E2E test for the upload workflow.

Risks & Dependencies: Refactoring could break existing state management for file queues. The hook must maintain the exact same state updates to Context as before.
Out of Scope: Modifying UI designs, adding new features, or changing the Next.js App Router configuration.
