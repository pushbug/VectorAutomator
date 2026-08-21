### Goal: Implement Artwork Collections & Theme Performance Tracking with multi-select clustering, real-time KPI rollups, dual View Modes (Grid vs Table), shared keyword intelligence, tag drill-down, and in-place metadata editing.

### Status: COMPLETE

### Done:
- Implemented relational data models (`Collection`, `CollectionItem`) in Prisma with cascade-safe join relations for non-destructive portfolio clustering.
- Added persistent multi-selection checkboxes across pagination in `/portfolio` with floating action toolbar for 1-click collection creation and addition.
- Built `/collections` dashboard with summary KPI cards, dual view mode toggle (`LayoutGrid` vs `List`), sortable `CollectionTable`, and unified `PaginationCapsule`.
- Built `/collections/[id]` detail view with `TopSharedKeywordsBar` supporting multi-metric view modes (Frequency, Downloads, Revenue), 1-click clipboard export, and click-to-filter artwork grid drill-down.
- Added in-place metadata editing via `EditCollectionModal` and 1-click `Set Cover` action on artwork cards.
- Added unit tests (`UT-UI-COLLECTION-TABLE-01`, `UT-UI-COLLECTIONS-PAGE-01`, `UT-UI-COLLECTION-DETAIL-01`) and Playwright E2E specs (`E2E-COL-01`, `E2E-COL-02`), passing 185/185 unit tests.
- Documented feature specification in `docs/features/collections.md`, updated `docs/tests/CATALOG.md` & `docs/tests/SELECTORS.md`, and appended ADR-012 to `docs/decisions.md`.

### Next:
- 1. Implement Phase 3/4 CSV batch import for stock platform monthly statement uploads.
- 2. Implement SFTP auto-uploader module for Adobe Stock and Shutterstock.

### Decisions:
- Deleting a `Collection` record cascade-deletes join rows (`CollectionItem`) while keeping all associated `Image` records completely intact in the Portfolio.
- View mode (`grid` | `table`) is persisted in `localStorage` (`collections_view_mode`) for seamless user experience across browser reloads.
- Collection keyword rollups are aggregated dynamically across all images in the collection, exposing full ranked arrays to client-side multi-metric toggles.
- Action buttons (Edit & Delete) in `CollectionTable` use `stopPropagation` to prevent triggering row-level navigation to collection detail.

### Skills:
- [`coding`](.agents/skills/coding/SKILL.md) — Built full-stack collections CRUD, database models, view mode toggles, table sorting, keyword drill-down, and modals.
- [`scrutinize`](.agents/skills/scrutinize/SKILL.md) — Rigorous DOM/API cross-validation, React hook safety auditing, and browser E2E verification.
- [`handoff`](.agents/skills/handoff/SKILL.md) — Session closure, decision logging (ADR-012), documentation sync, state cache eviction, and git delivery.
