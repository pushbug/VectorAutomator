# Architectural Decision Log

## ADR-001: Transaction-Based Sales Tracking and Automatic Image Rollups
- **Date:** 2026-08-14
- **Context:** Previously, image download counts were overwritten directly on the `Image` entity, losing temporal history, multi-platform revenue data, and platform granularity.
- **Decision:** Use `PlatformStats` as an append/upsert transaction entity keyed by `(imageId, platform, date)`. Whenever a sale record is added, updated, or removed, parent `Image` rollup metrics (`totalDownloads`, `ssDownloads`, `asDownloads`) and revenue calculations are computed dynamically.
- **Impact:** Clean multi-platform tracking, zero data corruption on concurrent statement inputs, and automated real-time aggregation across Portfolio and Sales Dashboards.

## ADR-002: Tailwind CSS v4 Canonical Class and Scale Enforcement
- **Date:** 2026-08-14
- **Context:** IDE LSP emitted warnings (`tailwindcss(suggestCanonicalClasses)`) when using legacy aliases (`flex-shrink-0`, `flex-grow`) or redundant arbitrary scale brackets (`min-w-[200px]`).
- **Decision:** Enforce 3-Layer Defense across Authoring Rules, Audit Skills, and System Design documentation requiring canonical utilities (`shrink-0`, `grow`, `min-w-50`, `w-25`).
- **Impact:** Clean IDE diagnostics (0 problems) and strict consistency with Tailwind CSS v4.

## ADR-003: Unified Add/Edit Image Form Drawer with Guarded Code Generation
- **Date:** 2026-08-14
- **Context:** Image creation and editing share identical metadata schemas and layout fields, but editing requires preserving existing image code, optional file replacement, and avoiding code collisions with self.
- **Decision:** Reuse `AddImageDrawer` in dual-mode (`editImage` prop) with guarded auto-code generation (`!editImage`), optional file validation, self-code collision exclusion (`where: { code, NOT: { id } }`), and direct `selectedImage` state synchronization.
- **Impact:** Zero component duplication, streamlined UX, and safe edit operations without regression risk.
