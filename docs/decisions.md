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

## ADR-004: Zero-Risk Smart Paste Stock Importer & Multi-Tier Auto-Matcher
- **Date:** 2026-08-14
- **Context:** Contributors frequently copy tabular sales statements directly from Adobe Stock and Shutterstock dashboards containing diverse clipboard formats (TSV rows, newline stream blocks, markdown links `[ID](url)`, dollar signs, and commas) that need to be resolved against local artwork records without risky external web scraping.
- **Decision:** Implement a client-side clipboard parser pipeline (`stockPasteParser.ts`) paired with `/api/sales/paste-sync` multi-tier matching engine (Tier 1: Exact Asset ID -> Tier 2: Exact Creation Date -> Tier 3: ±7 Day Proximity Window -> Fallback: Interactive Thumbnail Selector). Sync operations execute atomic Prisma transactions to link platform IDs and upsert `PlatformStats` records with automatic rollup recomputations.
- **Impact:** 100% safe local parsing, zero account risk from web scrapers, automatic asset ID binding, and instantaneous batch sync for stock revenue.

## ADR-005: Shelving Daily Briefing & Scraping Modules Pending Portfolio Maturity
- **Date:** 2026-08-15
- **Context:** The Daily Briefing module and Adobe Stock scraper were reliant on unstable web scraping and premature AI suggestions before the contributor's full local portfolio dataset and historical sales trends were established.
- **Decision:** Remove the Daily Briefing UI (`/briefing`), AI briefing endpoint (`/api/ai/briefing`), and scraping endpoint (`/api/scraper`). Focus development on Portfolio, Metadata processing, and Sales ingestion first. Trend guidance can be reintroduced as an analytics feature once comprehensive historical sales data is populated.
- **Impact:** Streamlined sidebar navigation, zero external scraping failure vectors, and clean codebase hygiene.
## ADR-006: Selective Batch Portfolio Ingestion with Automatic Monthly Sequencing & Queue Clearing
- **Date:** 2026-08-16
- **Context:** Contributors needed a seamless way to import processed artwork directly from the Process & Upload screen into the Portfolio database without manual re-entry or double submissions, while ensuring chronological YYMM-seq numbering (e.g., `2608-16`) and proper sequential sorting in the Portfolio Grid.
- **Decision:** Implement per-card checkboxes in `AssetQueue` with Select All support and a top-right Batch Import trigger in `UploadPage`. Ingested items are sequentially posted to `/api/upload` (which auto-computes the next monthly sequence when `code` is omitted) and atomically removed from the local queue on HTTP 200/201 success. Update `GET /api/portfolio` to sort hierarchically by `[{ year: sortOrder }, { month: sortOrder }, { seqNumber: sortOrder }, { createdAt: sortOrder }]`.
- **Impact:** Eliminates redundant data entry, guarantees unique monthly sequence numbering, prevents accidental duplicate imports, and keeps the workspace clean via automatic queue clearing.
