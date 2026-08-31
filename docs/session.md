### Goal: MetadataEditor Drag-and-Drop Keyword Reordering in Original Mode, E2E Stability, and Selector Parity.

### Status: COMPLETE

### Done:
- Implemented native HTML5 Drag-and-Drop keyword reordering with vertical grip handles in `src/components/upload/MetadataEditor.tsx` when `sortBy === 'original'`.
- Guaranteed direct state mutation of `activeAsset.keywords` on drop for 1:1 preservation in ExifTool EPS embeddings and `/api/upload` batch imports.
- Suppressed drag reordering when dynamic analytics sorting (`Downloads`, `Earnings`, `Alphabetical`) is active.
- Registered selectors and test cases in `docs/tests/SELECTORS.md`, `docs/tests/CATALOG.md`, and documented feature in `docs/features/keyword_suggest.md`.
- Added unit test suite `UT-UI-METADATA-KEYWORD-REORDER-01` in `src/__tests__/components/MetadataEditor.test.tsx` and updated E2E test suites `e2e/upload.spec.ts` and `e2e/serp.spec.ts`.
- Verified all 53 test suites (350 unit tests) pass with 0 TypeScript errors.

### Next:
- 1. Explore nominee collection segmentation and 1-click clipboard export for Adobe Free Collection nominations.
- 2. Implement bulk batch tag editing across multiple selected assets in `/upload` queue.

### Decisions:
- Native Drag-and-Drop Isolation: Drag reordering is restricted strictly to `Original` sort mode, maintaining state consistency without conflicting with computed metric rankings.
- Zero External Bundle Overhead: Native HTML5 drag events (`dragStart`, `dragOver`, `drop`, `dragEnd`) eliminate the need for heavy third-party DND dependencies.

### Skills:
- [`plan`](.agents/skills/plan/SKILL.md) — Architectural specification, selector mapping, and risk mitigation.
- [`coding`](.agents/skills/coding/SKILL.md) — Surgical implementation of drag-and-drop handles, splice reordering, and unit tests.
- [`scrutinize`](.agents/skills/scrutinize/SKILL.md) — E2E gatekeeping, canonical class audit, and full regression verification.
- [`handoff`](.agents/skills/handoff/SKILL.md) — Session closure, ADR-027 logging, and git synchronization.
