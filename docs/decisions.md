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

## ADR-007: Local Standalone macOS Launcher and Bento Cockpit Dashboard
- **Date:** 2026-08-16
- **Context:** Contributors needed an instant way to launch VectorAutomator locally from their Mac Desktop/Dock as an isolated desktop-like window without terminal commands, alongside a centralized home Cockpit displaying real-time portfolio metrics, monthly production pace, quick launchpad, and 1-click keyword copy capabilities.
- **Decision:** 
  1. Build a native macOS launcher (`VectorAutomator.app`) using AppleScript compilation (`osacompile`) with dynamic Node PATH discovery (`/opt/homebrew/bin`, `~/.nvm`), background daemon management, port readiness polling, and custom icon branding via Cocoa `NSWorkspace.shared.setIcon`.
  2. Implement an aggregated `GET /api/dashboard` endpoint and Bento Cockpit UI on the root route (`/`) featuring 4 KPI cards, a monthly pace progress tracker (target: 50 vectors/mo), a 3-card Quick Action launchpad, recent vector uploads, and top performers with 1-click clipboard keyword copy.
## ADR-008: Multi-Reference Keyword Suggester, 5-Scope Search, and Pre-Save Validation Gate
- **Date:** 2026-08-18
- **Context:** Contributors needed to aggregate high-performing keywords from multiple reference portfolio vectors into active assets in `UploadPage` without displacing existing keywords, without duplicating identical words, and with the ability to curate from an expansive pool (>50 words) while preventing microstock rejection (>50 keywords or empty title) upon export.
- **Decision:**
  1. Build pure keyword analytics engine (`keywordAnalytics.ts`) providing `aggregateKeywordTokens` (frequency, total downloads/earnings, Top-5 Golden Star flags, ranking score) and `mergeKeywords` supporting non-destructive case-insensitive deduplicated appending up to a 100-word soft limit.
  2. Implement 5 search scopes (`all`, `title`, `keywords` [default], `code`, `ids`) on `/api/portfolio` and strictly exclude database internal CUID `id` from matching to prevent false positives.
  3. Enforce pre-save validation gates in `MetadataEditor`:
     - If keywords count exceeds 50, render a live red warning badge and red border, and disable the `Save Metadata` button with clear word-reduction feedback.
     - If title is empty on save attempt, focus the title textarea and highlight it with a red border (`border-destructive`) that clears automatically upon typing.
  4. Standardize action button sizing and spacing across `MetadataEditor` and `KeywordSuggester` for visual harmony.
- **Impact:** Eliminates metadata loss and keyword duplicates, allows extensive candidate accumulation with safety guards, and ensures 100% microstock compliance before file export.

## ADR-009: Batch Sales Operations, Dynamic Portfolio Metrics Bar, and High-Contrast Contrast Theme
- **Date:** 2026-08-20
- **Context:** Contributors required bulk management capabilities for sales records (multi-row delete and mass date corrections with duplicate conflict merging), dynamic portfolio summary counters across date ranges, and improved readability for revenue values across light/dark themes.
- **Decision:**
  1. **Batch Sales API (`/api/sales/batch`):** Implemented dedicated `DELETE` and `PATCH` endpoints. Bulk deletion atomically removes selected records and recalculates parent image rollup metrics (`totalDownloads`, `ssDownloads`, `asDownloads`). Bulk date update shifts records to a target UTC midnight date with collision-safe merging (accumulating downloads/earnings and removing source records to prevent unique key collisions).
  2. **Portfolio Summary Metrics Bar:** Extended `GET /api/portfolio` to compute aggregate totals (`totalImages`, `totalDownloads`, `totalEarnings`) across matching records, rendered in a sticky responsive bar on `/portfolio` with dynamic date range text.
  3. **High-Contrast Theme Standards:** Replaced low-contrast `text-emerald-500` revenue text with `text-foreground font-bold` (black in light mode, white in dark mode) and standardized download icons with `text-muted` and numbers with `text-foreground font-medium`.
- **Impact:** Enables fast multi-record sales cleanup, provides clear date-filtered portfolio metrics, and delivers optimal readability and accessibility across all screen sizes and color themes.

## ADR-010: Core Architecture Redundancy Refactoring and Shared Utilities Infrastructure
- **Date:** 2026-08-20
- **Context:** The codebase accumulated duplicate Prisma client initializations across 6 API routes (risking SQLite connection leaks during Next.js HMR), redundant image rollup aggregation formulas in sales routes, duplicate `YYMM-Seq` regex parsing and next-sequence queries in upload/portfolio routes, and hardcoded platform lists/themes and inline formatters across UI components.
- **Decision:**
  1. **Prisma Singleton (`src/lib/prisma.ts`):** Centralized `PrismaClient` with `globalThis` caching to ensure a single connection instance across Next.js HMR cycles and prevent SQLite locks.
  2. **Unified Image Rollups (`syncImageRollup` in `src/lib/salesReconciler.ts`):** Exported a pure, transaction-safe helper that accepts either a direct `PrismaClient` or an interactive transaction client `tx`, removing redundant copies from `/api/sales`, `/api/sales/batch`, and `/api/sales/paste-sync`.
  3. **Image Code Parsing & Sequencing (`src/lib/imageCode.ts`):** Extracted `parseImageCode` and `getNextImageCode` into pure modules.
  4. **Platform Constants & Theme Tokens (`src/lib/platforms.ts`):** Centralized `SUPPORTED_PLATFORMS`, `SALES_FILTER_PLATFORMS`, and `PLATFORM_THEMES`.
  5. **Shared Formatters (`src/lib/formatters.ts`):** Built null-safe `formatCurrency`, `formatNumber`, `formatTableDate`, and `formatDisplayDate` helpers and replaced ad-hoc formatting across all components.
  6. **Test Coverage & Log Hygiene:** Added unit tests (`UT-SALES-ROLLUP-01`, `UT-CODE-SEQ-01`), Playwright scenario `E2E-SALES-04`, and eliminated React timer warning in `KeywordSuggester.test.tsx` (134/134 tests passing).
- **Impact:** Drastically improves maintainability, eliminates duplicate logic, guarantees connection safety, and maintains 100% test passing rate.

## ADR-011: Keyword Intelligence Analytics Engine, Velocity Filtering, and Shared UI Refactor
- **Date:** 2026-08-21
- **Context:** Contributors needed data-driven keyword performance analytics (earnings velocity across 30d/90d/1y/all, high-ROI niche detection `Draw More`, winning co-occurring tag recipes, and microstock Top 5 SEO placement indicators) to inform production strategy, alongside eliminating duplicated clipboard copying and pagination boilerplate across Portfolio, Sales, and Keywords.
- **Decision:**
  1. **Analytics Engine (`keywordAnalytics.ts` & `/api/keywords`):** Implemented pure token aggregation computing RPI ($/image), RPD ($/download), composite scoring, Top-5 primary frequency, and dynamic performance tiers (`draw_more`, `star`, `workhorse`, `dormant`, `untested`).
  2. **Time Range Velocity:** Added 30d/90d/1y/all time filtering with date-scoped transaction aggregations to detect fast-growing vs stale keywords.
  3. **Winning Tag Combinations:** Added co-occurring keyword discovery in `KeywordDetailDrawer` with 1-click recipe copy to clipboard.
  4. **Guidelines Modal (`KeywordGuideModal`):** Built interactive reference modal explaining tier criteria, velocity, RPI/RPD formulas, and Top-5 microstock SEO strategy.
  5. **Shared DRY Utilities:** Extracted `copyToClipboard` (`src/lib/clipboard.ts`) with modern Navigator and fallback DOM execution, and `PaginationCapsule` (`src/components/common/PaginationCapsule.tsx`) with boundary clamping and direct numeric page jump input across all tables.
  6. **Test Coverage:** Added 34 new unit tests (168/168 passing) and comprehensive Playwright E2E suite `e2e/keywords.spec.ts` (9/9 suites passing).
- **Impact:** Delivers actionable keyword intelligence for stock production, eliminates duplicate code, and maintains 100% test coverage and type safety.

## ADR-012: Artwork Collections Theme Tracking, View Mode Toggle, and Keyword Intelligence
- **Date:** 2026-08-22
- **Context:** Microstock contributors needed a way to cluster portfolio artworks into theme collections or visual experiments, calculate aggregated financial metrics (Downloads, Revenue, RPI) in real-time, view Top Shared Keyword intersections with adaptive sorting and drill-down filtering, toggle between visual Grid Cards and analytical Sortable Tables, and edit collection metadata in-place without losing database referential integrity.
- **Decision:**
  1. **Relational Join Architecture:** Implemented `Collection` and `CollectionItem` models in Prisma with cascade deletion on join records, guaranteeing that deleting a collection never affects the underlying portfolio image assets.
  2. **Multi-Select Portfolio Clustering:** Added persistent multi-selection checkboxes across pagination in `/portfolio` with a floating action toolbar for 1-click collection creation and addition.
  3. **Dual View Modes (Grid vs Table):** Built `CollectionCard` (visual artwork preview and KPI summary) and `CollectionTable` (responsive tabular list with interactive sortable column headers and isolated action clicks) with `localStorage` view mode persistence.
  4. **Shared Keyword Intelligence & Tag Drill-Down:** Enhanced `/api/collections/[id]` and `TopSharedKeywordsBar` with segmented view modes (`Frequency`, `Downloads`, `Revenue`), dynamic Top-15 slicing, and click-to-filter artwork grid drill-down with clearable filter badges.
  5. **In-place Metadata & Cover Image Management:** Implemented `EditCollectionModal` with pencil edit triggers and 1-click `Set Cover` action on artwork cards in Collection Detail.
  6. **Unified Pagination & DRY Types:** Integrated `PaginationCapsule` with automatic Page 1 reset guards on filter/sort changes, and unified shared `CollectionSummary` types across components.
  7. **Comprehensive Test Suite:** Added unit tests (`UT-UI-COLLECTION-TABLE-01`, `UT-UI-COLLECTIONS-PAGE-01`, `UT-UI-COLLECTION-DETAIL-01`) and Playwright E2E specs (`E2E-COL-01`, `E2E-COL-02`), achieving 185/185 unit tests passing.
- **Impact:** Provides a complete end-to-end theme management and financial analysis solution for stock creators while maintaining strict type safety, zero regressions, and full test automation.

## ADR-013: Core Redundancy Elimination, Dynamic Sorting & Test Suite Hardening, and Unified Navigation Hierarchy
- **Date:** 2026-08-23
- **Context:** Following the implementation of Keyword Intelligence and Artwork Collections, several redundant calculations (such as manual platform revenue rollups in portfolio and sales APIs), duplicate modal implementations (`CreateCollectionModal` vs `EditCollectionModal`), raw clipboard calls without fallback, orphaned test routes (`/add-image`), and inconsistent menu/header naming were identified and refactored. Additionally, edge-case unit tests and Playwright E2E suites required expansion for keyword sorting and metric accuracy.
- **Decision:**
  1. **Platform Stats Aggregation Utility:** Centralized `calculatePlatformBreakdown` in `src/lib/formatters.ts` returning `{ totalEarnings, totalDownloads, platformBreakdown }` in a single pass across `/api/portfolio`, `/api/sales`, and `PortfolioDetail.tsx`.
  2. **Consolidated Collection Modal:** Unified `CollectionModal.tsx` handling create/edit modes with dynamic `data-testid` prefixing and delegating wrappers for 100% backward compatibility.
  3. **Fallback Clipboard & Formatting Standardization:** Unified clipboard copy triggers with `copyToClipboard` and replaced inline `toLocaleString()` with `formatNumber` and `formatCurrency`.
  4. **Orphaned Route Deletion:** Deleted unused `/add-image` route.
  5. **Edge-Case & E2E Test Hardening:** Added `UT-LIB-STATS-BREAKDOWN-01` and `UT-UI-METADATA-EDITOR-TIE-01` (tie-breaking, missing metrics, bidirectional sorting), and updated Playwright E2E (`E2E-UPL-02`).
  6. **Unified Navigation & Header Hierarchy:** Synchronized Sidebar menu items (`Dashboard`, `Upload & Keywords`, `Portfolio`, `Collections`, `Keyword Insights`, `Sales & Earnings`) with all page `<h1>` headings and removed redundant subtitles.
- **Impact:** 197/197 unit tests passing across 32 files, zero TypeScript/lint errors, and completely aligned UI/UX hierarchy.

## ADR-014: Microstock Payouts & Currency Lifecycle Tracking, Bundled Withdrawals, and Multi-Platform Ingestion
- **Date:** 2026-08-23
- **Context:** Microstock contributors receive USD payments from multiple stock agencies (Adobe Stock, Shutterstock, Vecteezy, 123RF) into intermediate wallets (Payoneer / PayPal) and later bundle multiple earnings into a single consolidated withdrawal to Thai bank accounts (Bangkok Bank BBL). Contributors required complete tracking of fees, 2-way currency conversions, proportional THB distributions for bundled transfers, 1-click Google Sheet TSV Smart Paste, and tax-year aggregation.
- **Decision:**
  1. **Prisma Payout Schema (`PayoutTransaction`):** Implemented dedicated model supporting 3-stage lifecycle (`pending`, `in_platform`, `completed`), optional bank deposit fields, tax year indexing, and Prisma client HMR caching guards.
  2. **Proportional Bundled Withdrawal Engine (`calculateBundledSplit`):** Created pure algorithm calculating exact proportional THB distributions based on each stock's USD contribution to a bundled transfer, with zero rounding drift.
  3. **Robust TSV & Multi-Space Importer (`parseGoogleSheetPayoutsTSV`):** Tokenizer supporting both tab (`\t`) and multi-space (`\s{2,}`) delimiters, currency symbols, and date normalization.
  4. **Refined UI & 2K Responsive Hierarchy:** Implemented 4 KPI summary cards (Realized THB, Holding USD, Total Fees, Total Transactions count), 2-line stacked table headers with dark header surface (`bg-muted/10`), 3-dots action dropdown menus (`MoreVertical`), canonical `max-w-370` container scaling, and default `Bangkok Bank (BBL)`.
  5. **Centralized Constants & Helpers:** Exported `STOCK_AGENCIES`, `THAI_BANKS`, `PAYMENT_PLATFORMS`, and `getStockBadgeColor` from `payoutCalculations.ts` as single sources of truth.
  6. **Comprehensive Automated Verification:** Added 22 new unit tests (219/219 passing across 35 files) and Playwright E2E suite `e2e/payouts.spec.ts` (`E2E-PAYOUT-01`, `E2E-PAYOUT-02`), achieving 100% test passing rate with zero regressions.
- **Impact:** Delivers an enterprise-grade financial tracking and tax preparation module tailored specifically for microstock creators.

## ADR-015: 5-Scope Search Filtering for Portfolio Dashboard and False Positive Elimination
- **Date:** 2026-08-24
- **Context:** In the Portfolio Dashboard, the search bar defaulted to an unconstrained all-fields substring match across 9 fields including numeric microstock asset IDs (`asId`, `ssId`, `vzId`). Because stock asset IDs are 8–10 digit random numbers, searching for single-digit queries (such as "3") resulted in nearly 100% false-positive matches (2,414 artworks). When combined with "Newest First" sort order, results appeared identical to an unfiltered portfolio.
- **Decision:**
  1. **Portfolio Search Scope Selector:** Integrated a 5-scope selector (`All`, `Title`, `Keywords`, `Code`, `Asset IDs`) into `PortfolioFilter.tsx` with dynamic placeholder switching and semantic theme styling (`h-10.5`, `bg-background`, `border-border`).
  2. **Query Parameter Wiring:** Connected `searchField` state in `PortfolioPage` (`page.tsx`) to `GET /api/portfolio?searchField={scope}&search={query}`, scoping queries precisely to target database columns.
  3. **Summary Bar Scope Reflection:** Enhanced portfolio summary bar to dynamically indicate active search scope when scoped filtering is applied.
  4. **Automated Test Coverage:** Added unit test suite `PortfolioFilter.test.tsx` (`UT-UI-PORTFOLIO-SEARCH-FIELD-01`) and updated `e2e/portfolio.spec.ts`, bringing total test coverage to 223/223 unit tests passing across 36 files.
- **Impact:** Completely eliminates numeric ID false positives, provides precision searching across metadata, and guarantees accurate search result displays.
 
## ADR-016: Stock SERP Copier Chrome Extension, Anonymous Microstock SERP Clipboard Extraction, and Universal Rank Matching Engine
- **Date:** 2026-08-24
- **Context:** Microstock creators need to track their rank and market presence across search engine results pages (SERPs) for target keywords on Adobe Stock. Direct server scraping of Adobe Stock URLs is blocked by anti-bot/Datadome CDN (HTTP 403 Forbidden). Contributors needed an anonymous, standalone Chrome Extension that operates in 0.1s directly on active browser tabs without hardcoded credentials, copying clean rankings (Keyword, Page, Rank, Asset ID, Author, Title), and matching portfolio assets atomically into SQLite.
- **Decision:**
  1. **Standalone Chrome Extension (`extension/`):** Built as an unbranded Manifest V3 extension with an Arc/Linear-inspired dark glassmorphic design system (`#080c14`, frosted glass cards, segmented pills, micro-animations).
  2. **Instant DOM Scrape Mode (0.1s):** Made Instant mode the primary production workflow, scraping Rank 1–100 directly from rendered DOM in 0.1s with zero network requests or CAPTCHA risks.
  3. **Configurable Clean Column Export (URLs OFF by default):** Standardized default TSV/CSV format to `[Keyword, Page, Rank, Asset ID, Author, Title]` with an optional toggle `[ ] Include URLs (Thumbnail & Link)` persisted in `chrome.storage.local`.
  4. **Optional Native Virtual Navigator:** Implemented in-page keyboard `ArrowRight` dispatch, MutationObserver ready checks, and human jitter (500–1200ms) for exploratory author enrichment.
## ADR-017: Comprehensive SERP Ranking Intelligence Dashboard, Two-Way Portfolio Auto-Reconciliation, and Full Ranking Telemetry Modal
- **Date:** 2026-08-24
- **Context:** Following the launch of the Stock SERP Copier Chrome extension, VectorAutomator required an interactive analytics dashboard (`/serp`) to visualize ranking telemetry, track rank movements over time, inspect artwork keyword progression, and explore complete Top-100 ranking snapshots. Additionally, users required a bidirectional reconciliation pipeline ensuring that whether image IDs are assigned before or after SERP snapshots are crawled, assets are linked automatically without manual re-imports.
- **Decision:**
  1. **Full SERP Dashboard & KPI Cards (`/serp`):** Created 4 summary KPI cards (Total Tracked Keywords, Page 1 Dominance, Top 10 Dominance, Best Ranking with Keyword name), integrated date range filtering, and searchable keyword combobox dropdown.
  2. **Two-Way Database Auto-Reconciliation:** Implemented dual-direction ID cross-referencing across `asId`, `ssId`, and `vzId`. Embedded reconciliation hooks into `PATCH /api/portfolio`, `POST /api/upload`, `POST /api/serp/paste-sync`, and proactive raw SQL execution at the top of `GET /api/serp`.
  3. **Full Ranking Snapshot Modal (`FullSerpModal.tsx`):** Designed an unfragmented header toolbar with dedicated `✨ My Artwork` filter toggle, mutually exclusive `Unknown Author` calculation, and backdrop click-outside dismissal.
  4. **Unified Download Metrics Layout:** Standardized download counts across SERP Table and Artwork History Drawer using Lucide `<Download size={13} />` icon format, matching Sales and Portfolio views.
  5. **Playwright E2E & Integration Tests:** Added `e2e/serp.spec.ts` (`E2E-SERP-01`) and integration tests `UT-UI-FULL-SERP-MODAL-01`, `UT-SERP-RECONCILE-02`.
- **Impact:** Provides a unified search engine rank intelligence interface with 100% automated data reconciliation and responsive analytics.

## ADR-020: Centralized Image URL & File Storage Consolidation, Dynamic ETag Revalidation, and Action-Oriented Portfolio Filters
- **Date:** 2026-08-25
- **Context:** (1) Replacing/overwriting vector preview images on disk was prevented from reflecting in the browser due to `Cache-Control: immutable` on `/api/image` and lack of URI encoding/cache-busting query strings. (2) File writing, directory creation, and old file unlinking were duplicated across `/api/upload` and `/api/portfolio`. (3) Portfolio ID filtering had redundant options that cluttered contributor daily tasks.
- **Decision:**
  1. **Dynamic ETag & 304 Revalidation (`/api/image`):** Implemented dynamic ETag calculation (`${stat.size}-${stat.mtimeMs}`) and conditional HTTP 304 (Not Modified) responses with `Cache-Control: no-cache, must-revalidate` in `src/app/api/image/route.ts`.
  2. **Unified Image URL Generator (`getImageUrl`):** Created `getImageUrl(filePath, updatedAt)` in `src/lib/formatters.ts` to handle path encoding and version cache-busting. Refactored all 12 UI components to consume this single helper.
  3. **Centralized Backend File Storage (`src/lib/fileStorage.ts`):** Extracted `saveImageFile`, `deleteOldImageFile`, and `inferImageExtension` into a dedicated storage module used across `/api/upload` and `/api/portfolio`.
  4. **Action-Oriented Portfolio Filtering:** Streamlined portfolio ID filters to 5 essential daily actions (`All Assets`, `Missing Adobe ID`, `Missing Shutterstock ID`, `No Platform IDs`, `Missing Image File`).
  5. **Automated Verification:** Added unit tests `UT-API-IMG-CACHE-01`, `UT-LIB-FORMATTERS-02`, and `UT-LIB-STORAGE-01`. All 48 test suites and 304 tests pass.
- **Impact:** Eliminates stale browser image caching, secures file storage operations, removes redundant code across routes, and streamlines creator portfolio workflow.

## ADR-021: System-Wide Automatic Sales Reconciliation, 100% ADR-020 Image URL Standardization, and Modular SERP Reconciler Infrastructure
- **Date:** 2026-08-26
- **Context:** (1) Sales records logged before an artwork was created or before IDs were assigned remained unlinked with `N/A` thumbnails in `/sales` even when a matching artwork existed in `/portfolio`. (2) 4 legacy call sites in Dashboard (`ActivitySplitGrid`) and SERP (`ArtworkSerpDrawer`, `FullSerpModal`) passed raw `filePath` strings into `src` instead of using `getImageUrl()`. (3) SERP reconciliation logic was tightly coupled as inline raw SQL inside `/api/serp/route.ts`. (4) Next.js LCP warnings were emitted on grid views.
- **Decision:**
  1. **Proactive Sales Auto-Reconciliation (`src/lib/salesReconciler.ts`):** Implemented `reconcileAllUnlinkedSales(prismaClient)` which scans unlinked `PlatformStats` (`imageId: null`) and automatically binds them to matching `Image` records (`asId`, `ssId`, `vzId`), integrated directly into `GET /api/sales`.
  2. **100% Universal ADR-020 Image URLs:** Refactored `ActivitySplitGrid.tsx`, `ArtworkSerpDrawer.tsx`, and `FullSerpModal.tsx` to uniformly invoke `getImageUrl()` and use Next.js `unoptimized` flag.
  3. **Modular SERP Reconciler (`src/lib/serpReconciler.ts`):** Extracted `reconcileImageSerp` and `autoReconcileSerpItems` into a standalone, testable library module with safe fallback handling.
  4. **LCP Image Eager Loading:** Added `priority={index < 4}` to top 4 cards across `PortfolioGrid`, `CollectionCard`, and `/collections/[id]` views.
  5. **Automated Verification:** Added unit test suites `UT-UI-PF-LCP-01`, `UT-SALES-RECONCILE-03`, and `UT-SERP-RECONCILE-03` (316/316 tests pass across 50 test files with 0 TypeScript errors).
- **Impact:** Guarantees zero unlinked sales records when matching artworks exist, achieves 100% universal image URL handling across the entire application, eliminates Next.js LCP warnings, and modularizes background reconciliation pipelines.

## ADR-023: Database Query Performance Refactoring, N+1 Subquery Elimination, and Read-Path Mutation Decoupling
- **Date:** 2026-08-28
- **Context:** (1) `GET /api/sales` executed a heavy multi-step mutation reconciliation loop (`reconcileAllUnlinkedSales`) on every read/page switch, introducing SQLite table lock contention and latency. (2) `GET /api/serp` suffered from an N+1 subquery storm where each ranking row triggered individual `findFirst` queries for historical snapshots and `findMany` for direct stats (200+ SQL roundtrips per page). (3) `GET /api/portfolio` loaded full entity graphs including serialized keyword tokens across all matching records for summary KPI calculations. (4) Missing indexes on `PlatformStats.date`, `PlatformStats.imageId`, and `Image.createdAt` caused table scans.
- **Decision:**
  1. **Read-Path Mutation Decoupling:** Removed `reconcileAllUnlinkedSales` from `GET /api/sales`. Reconciliation is strictly preserved in ingestion and mutation endpoints (`POST /api/sales/paste-sync`, `POST /api/portfolio/paste-sync`, `PATCH /api/portfolio`).
  2. **Batch Query for SERP Delta & Direct Stats:** Replaced inner N+1 subquery loops in `GET /api/serp` with single parallel batch queries (`allPrevItems`, `directStatsMap`) keyed by `assetId`, reducing roundtrips from 200+ to 2.
  3. **Streamlined Summary Aggregation:** Optimized `allMatchingImages` projection in `GET /api/portfolio` to select only `totalDownloads` and `stats.earnings` (omitting bulky keyword strings unless `exactKeyword` search is active).
  4. **Database Schema Indexing:** Added `@@index([date])` and `@@index([imageId])` to `PlatformStats`; added `@@index([createdAt])` and `@@index([totalDownloads])` to `Image`.
## ADR-024: SERP Table Multi-Column Sorting, 100-Item Pagination, Form Lifecycle Reset, and Extension Silent Clipboard Fallback
- **Date:** 2026-08-28
- **Context:** (1) The Ranking dashboard (`/serp`) lacked multi-column sorting and pagination controls, and long keywords caused table header text wrapping while the ACTION header was clipped. (2) `SmartSerpPasteModal` retained previous pasted text upon modal submission or close, requiring manual back-navigation and text deletion for subsequent imports. (3) Matched items in `SmartSerpPasteModal` were missing thumbnail and image code badges because the transaction return query omitted the relation. (4) Chrome's extension manager emitted yellow `DOMException` warnings in `chrome://extensions` when the sales extractor auto-copy timer completed after transient user activation expired.
- **Decision:**
  1. **SERP Multi-Column Sorting & Pagination:** Extended `GET /api/serp` and `SerpTable` with `sortBy` (`date`, `keyword`, `rank`, `delta`, `downloads`, `revenue`) and `sortOrder` (`asc`, `desc`), visual column sort state indicators (`ArrowUpDown`, `ArrowUp`, `ArrowDown`), default limit of 100, and integrated `PaginationCapsule` with automatic selection reset on page/sort changes.
  2. **Table Header Layout & Wrap Prevention:** Adjusted column widths (`min-w-44` for keyword with `whitespace-nowrap`, `min-w-24` and `pr-6` for ACTION) preventing text clipping.
  3. **SmartSerpPasteModal Lifecycle Reset:** Implemented `handleReset` clearing `rawText`, `keywordInput`, `matchedItems`, and `totalCount`, bound to "Paste Another", "Done & View Dashboard", cancel, and backdrop dismissal.
  4. **Relation Mapping on Sync:** Updated `POST /api/serp/paste-sync` to include `matchedImage: { select: { id, code, title, filePath } }` and mapped `imageFilePath`, `imageCode`, and `imageTitle` in `myItems`.
  5. **Silent Extension Clipboard Fallback:** Refactored `copyToClipboardSafe` in `extension/extension-sales` to check `document.hasFocus()` and silently switch to `document.execCommand('copy')` on `DOMException` without emitting noisy `console.warn` logs.
  6. **Automated Verification:** Added test suites `UT-API-SERP-SORT-01` and `UT-UI-SERP-TABLE-SORT-01`. All 51 test suites and 329 tests pass with 0 TypeScript errors.
- **Impact:** Delivers responsive 100-item SERP exploration with sorting and unclipped layouts, streamlines bulk ranking import workflows, and eliminates false-positive Chrome extension warnings.

## ADR-025: Dual-Tab Portfolio Analytics, Frameless Time-Series Trend Charts, and Persistent Global Benchmarks
- **Date:** 2026-08-29
- **Context:** Contributors needed to inspect historical sales performance, monthly trends, and performance benchmarks directly within the `PortfolioDetail` drawer without copying asset IDs and navigating away to the Sales table. Additionally, benchmark comparisons (Top 100 Best Sellers vs overall Portfolio Average) needed to remain persistent and accurate even when filtering or searching for individual assets in the Portfolio or Collection views.
- **Decision:**
  1. **Dual-Tab Architecture (`PortfolioDetail.tsx`):** Implemented tab switching (`Details & Info` vs `Sales & Analytics`) retaining user state and metadata editability while embedding `<PortfolioAnalyticsTab />`.
  2. **Frameless Responsive SVG Trend Chart:** Replaced nested bordered containers with a frameless, flat SVG line and gradient-area chart spanning 100% canvas height with equidistant X-axis date labels and a dynamic Y-axis ceiling.
  3. **Decoupled Global Portfolio Benchmarks:** Updated `GET /api/portfolio` to execute parallel global queries when search/filters are active, guaranteeing that `Top 100 Avg` and `Port Avg` reflect true portfolio baseline metrics and never collapse to 0.00.
  4. **Single-Line Benchmark Comparison Strip:** Designed a compact 3-card metric strip (`This Image`, `Top 100 Avg`, `Port Avg`) displaying download icons and dollar amounts on a single line with reactive metric unit toggling ($ / dl).
  5. **Collection Detail Integration:** Extended `GET /api/collections/[id]` to include artwork `stats` arrays and bound global benchmarks to `PortfolioDetail` in `CollectionDetailPage`.
  6. **Shared Date Formatter Centralization:** Moved `formatDateSafe` into `src/lib/formatters.ts`.
  7. **Automated Verification:** Added unit test suites `UT-UI-PF-TAB-01`, `UT-UI-PF-ANALYTICS-01`, `UT-API-PF-BENCHMARK-01`, `UT-API-PF-BENCHMARK-FILTER-01`, and `UT-UI-PF-BENCHMARK-01` (347/347 tests pass across 53 test files with 0 TypeScript errors).
- **Impact:** Delivers complete financial analytics directly in portfolio drawers, provides actionable benchmark context, and preserves 100% test integrity.

## ADR-026: Collection Detail Multi-Attribute Instant Search, Active Filter Indicators, and E2E Hardening
- **Date:** 2026-08-29
- **Context:** Contributors managing large artwork collections (such as Adobe Nominate segments with 500+ assets) needed to quickly search and filter artworks within a collection by title, internal vector code, platform asset IDs (Adobe Stock, Shutterstock, Vecteezy), database ID, or keyword tags. The search needed to operate in real time, integrate seamlessly with Top Shared Keyword filters, and provide clear active badges and empty state recovery controls.
- **Decision:**
  1. **Multi-Attribute In-Memory Search (`CollectionDetailPage` & `TopSharedKeywordsBar`):** Integrated a responsive search input with a clear button into the collection toolbar header. Implemented real-time case-insensitive filtering in `useMemo` matching across `title`, `code`, `asId`, `ssId`, `vzId`, `id`, and `keywords`.
  2. **Active Filter Badges & Universal Reset:** Designed an active filter strip displaying search query pills and tag filter pills with individual clear triggers and a unified `Clear All Filters` action.
  3. **App Router Test Setup Mocking:** Enhanced `src/__tests__/setup.ts` with global `next/navigation` mocks (`useRouter`, `usePathname`, `useSearchParams`) for Next.js App Router components.
  4. **Test Suite Hardening:** Added unit test suites `UT-UI-COLLECTION-DETAIL-03` and `UT-UI-COLLECTION-DETAIL-04` in `Collections.test.tsx` and expanded Playwright E2E suite `e2e/collections.spec.ts` (`E2E-COL-02`). All 53 test suites and 349 unit tests pass with 0 TypeScript errors.
- **Impact:** Enables instantaneous multi-attribute artwork search in collection detail views, preserves active view modes and tag filtering, and ensures 100% test automation coverage.

## ADR-027: MetadataEditor Drag-and-Drop Keyword Reordering in Original Mode
- **Date:** 2026-08-31
- **Context:** Contributors preparing microstock vector assets need full control over the exact sequence of keywords before embedding into EPS files or importing to Portfolio, especially to prioritize the Top 5 to Top 10 crucial keywords for microstock search algorithms (e.g. Adobe Stock, Shutterstock). While dynamic metric sorting (Downloads, Earnings, A-Z) provides analytical insights, users required a friction-free way to manually reorder their keywords in Original sort mode.
- **Decision:**
  1. **Native HTML5 Drag-and-Drop (`MetadataEditor.tsx`):** Implemented lightweight native HTML5 drag-and-drop on numbered keyword rows when `sortBy === 'original'`, avoiding external bundle bloat (`dnd-kit` / `react-beautiful-dnd`).
  2. **Direct State Mutation & EXIF / Import Preservation:** On drop, the reordered array splices elements into place and updates `activeAsset.keywords` directly, ensuring exact preservation when embedding ExifTool metadata or executing batch import to portfolio (`/api/upload`).
  3. **Conditional Drag Suppression:** Suppressed drag handles and events in metric sorting modes (`Downloads`, `Earnings`, `Alphabetical`) to prevent conflicts with computed metric order.
  4. **Automated Verification:** Added unit test suite `UT-UI-METADATA-KEYWORD-REORDER-01` in `MetadataEditor.test.tsx` and updated E2E test suites `e2e/upload.spec.ts` and `e2e/serp.spec.ts`. All 53 test suites (350 unit tests) pass with 0 TypeScript errors.
- **Impact:** Provides microstock contributors with intuitive drag-and-drop keyword prioritization, maintaining 100% data fidelity across EXIF embedding and portfolio imports.

## ADR-028: Dynamic Monthly Production Goal Configuration and Database Persistence
- **Date:** 2026-09-03
- **Context:** The Overview Dashboard previously hardcoded the monthly vector production target to `50 vectors / month` in `GET /api/dashboard`, preventing contributors with varying production capacities or aggressive monthly targets from tracking accurate pace metrics.
- **Decision:**
  1. **Generic Key-Value Setting Entity (`schema.prisma`):** Created a lightweight `Setting` model (`key @id, value, createdAt, updatedAt`) in SQLite to store system preferences and user configurations, initialized with `monthly_vector_goal` and protected by automated SQLite backups before schema deployment.
  2. **Dedicated Settings API (`/api/settings`):** Implemented `GET` and `PATCH` endpoints validating positive integer bounds (1 to 100,000) with safe fallback to `50`.
  3. **Concurrent Dashboard Integration (`/api/dashboard`):** Added dynamic setting query into `Promise.all` alongside existing count/stats queries, calculating production pace and percentages in real time without increasing response latency.
  4. **Interactive Dashboard Modal Dialog (`MonthlyGoalCard.tsx`):** Designed an inline pencil trigger that opens an accessible modal dialog featuring 4 quick presets (30, 50, 100, 200 vectors/mo), custom integer input, keyboard Enter submission, and optimistic UI updates with background re-fetch.
  5. **Automated Verification:** Added unit test suite `UT-API-SETTINGS-01` in `src/__tests__/api/settings.test.ts` and updated `UT-API-DASH-01` and `UT-UI-DASH-01`. All 54 test files (366 unit tests) pass with 0 TypeScript errors.
- **Impact:** Enables contributors to dynamically customize, persist, and track their microstock vector production targets from the home dashboard with zero downtime and resilient fallbacks.

## ADR-029: Multi-Window Concurrency, Tab-Agnostic Watchdog Auto-Shutdown, and Staged Modal Exit Loss Guards
- **Date:** 2026-09-03
- **Context:** Contributors using `VectorAutomator.app` (macOS launcher) needed concurrent multi-window capability to view distinct screens side-by-side (e.g. Portfolio on one window, Sales on another). Chrome's isolated `--app` mode lacks native tabs and new window shortcuts, forcing users into terminal `npm run dev` where port 3000 collisions (`EADDRINUSE`) and session fragmentation occurred. Furthermore, background Next.js daemons remained active indefinitely in RAM after closing the desktop window, blocking port 3000 from other projects. Additionally, staged clipboard modals risked silent data discard if closed before explicit commit.
- **Decision:**
  1. **Multi-Window Desktop Trigger & Global Shortcut (`Sidebar.tsx`):** Added a "New Window" action button (`sidebar-new-window-btn`) and a global `Cmd+Shift+N` keydown listener dispatching `window.open(pathname, '_blank')`, spawning independent desktop windows connected to the single port 3000 server and shared SQLite database.
  2. **Non-Intrusive macOS Launcher (`scripts/launch.sh`):** Updated readiness detection to spawn sibling Chrome app windows when invoked while the server is already active, eliminating duplicate background daemons.
  3. **Terminal Collision Guard (`scripts/dev.sh` & `scripts/stop.sh`):** Wrapped `npm run dev` with collision detection displaying Thai/English guidance rather than raw crashes, and added `npm run app:stop` issuing graceful `SIGTERM` with `wal_checkpoint(TRUNCATE)`.
  4. **Tab-Agnostic Client Heartbeat & Server Watchdog (`ServerHeartbeat.tsx` & `serverWatchdog.ts`):** Implemented client pings every 5s across all open tabs/windows with disconnect beacons. The server watchdog maintains a 60s boot grace period and a 25s inactivity threshold; when all tabs/windows are closed, the watchdog checkpoints SQLite WAL and shuts down the process, freeing port 3000 automatically.
  5. **Explicit UI Exit (`Sidebar.tsx`):** Added a "Quit App" button with confirmation modal calling `/api/system/quit` for instant 1-click shutdown and port release.
  6. **Staged Modal Exit Loss Guards (`SmartIdPasteModal.tsx` & `SmartPasteModal.tsx`):** Added uncommitted item counter banners, pulsing CTAs, and discard confirmation modals with "Save & Close" and "Discard & Exit" buttons.
  7. **Comprehensive Automated Verification:** Added 10 new unit tests (`UT-UI-SIDEBAR-NEW-WINDOW-01`, `UT-UI-SIDEBAR-SHORTCUT-01`, `UT-UI-SIDEBAR-QUIT-01`, `UT-API-SYSTEM-HEARTBEAT-01`, `UT-API-SYSTEM-WATCHDOG-01`, `UT-UI-HEARTBEAT-BEACON-01`, `UT-UI-SMART-ID-UNSAVED-01`, `UT-UI-SMART-ID-UNSAVED-SAVE-01`, `UT-UI-SMART-SALES-UNSAVED-01`, `UT-UI-SMART-SALES-UNSAVED-SAVE-01`). All 58 test files and 376 unit tests pass with 0 TypeScript errors.
- **Impact:** Delivers seamless multi-window side-by-side productivity, prevents port collisions and lingering daemon processes, guarantees zero accidental data loss, and maintains 100% database persistence.

## ADR-030: SQLite WAL Hardening, Full Mutation Coverage, and Post-Restore Process Reconnect
- **Date:** 2026-09-04
- **Context:** Recurring user reports indicated that data saved during app runtime occasionally disappeared after closing and reopening the app or performing backup/restore operations. An architectural audit revealed three primary persistence gaps: (1) `/api/settings` PATCH mutations omitted `scheduleAutoBackup()`; (2) `createDbBackup()` pre-snapshot checkpoint used `PASSIVE` mode which skipped busy/uncommitted WAL frames during concurrent activity; and (3) `restoreDbBackup()` replaced the active `dev.db` file on disk while the running Next.js process kept open file descriptors via `@prisma/adapter-better-sqlite3`, leading to stale cache writes and potential data loss upon subsequent writes.
- **Decision:**
  1. **Forced Process Reconnect on Restore (`src/lib/dbBackup.ts`):** Added `process.exit(0)` guarded by `!isTestEnv()` immediately following post-restore `TRUNCATE` checkpoint in `restoreDbBackup()`. This forces the server supervisor (`npm run dev` or launch script) to perform a clean restart, ensuring fresh Prisma connections and eliminating stale file descriptor writes to superseded inodes.
  2. **Truncate Pre-Snapshot Checkpoint (`src/lib/dbBackup.ts`):** Upgraded `createDbBackup()` pre-snapshot checkpoint from `PASSIVE` to `TRUNCATE`, guaranteeing that all WAL frames are completely consolidated into `dev.db` before taking native SQLite backup snapshots.
  3. **Universal Mutation Auto-Backup Parity (`src/app/api/settings/route.ts`):** Integrated `scheduleAutoBackup()` into `/api/settings` PATCH handler, bringing settings persistence into 1:1 parity with all other 15+ database mutation routes.
  4. **Dynamic Test Environment Detection (`src/lib/dbBackup.ts`):** Replaced static module-level `isTestEnv` constant with dynamic function `export function isTestEnv(): boolean`, enabling unit tests to verify production exit mechanics without prematurely terminating Vitest runner.
  5. **Automated Verification:** Added unit test `UT-LIB-BACKUP-RESTORE-EXIT-01` in `src/__tests__/lib/dbBackup.test.ts` and extended `UT-API-SETTINGS-01` in `src/__tests__/api/settings.test.ts`. All 343 unit and integration tests pass with 0 TypeScript errors.
- **Impact:** Eliminates data loss vulnerabilities across SQLite WAL lifecycle, guarantees 100% durability across all API write operations, and ensures complete database consistency after backups and restores.

## ADR-031: Client-Side Dual-Platform Contributor Catalog Extraction (Adobe Stock & Shutterstock)
- **Date:** 2026-09-06
- **Context:** Contributors uploading vectors across multiple stock agencies require their published Asset IDs (`asId` for Adobe Stock, `ssId` for Shutterstock) to be recorded in VectorAutomator to reconcile sales telemetry and map analytics. While Adobe Stock ID syncing was already supported, contributors needed a corresponding workflow for Shutterstock. Direct server-side scraping or automated HTTP requests against Shutterstock contributor endpoints risk instant account bans via Cloudflare/Akamai bot detection. Furthermore, pasted catalog data must strictly prevent cross-platform contamination (e.g. accidentally saving Shutterstock ID to `asId`).
- **Decision:**
  1. **100% Ban-Safe Air-Gapped Chrome Extension:** Extended `extension/extension-contributor` to support `submit.shutterstock.com/dashboard/catalog` via client-side DOM scraping (`[data-testid="asset-card"]`). Extracted un-truncated filenames from checkbox `aria-label="select asset <filename>"` (bypassing DOM ellipsis truncation) and extracted `ssId`, status, and thumbnails directly in the user's active browser.
  2. **3-Tier Platform Discrimination:**
     - Tier 1: TSV signature header auto-detection (`Shutterstock ID \t Title / Filename \t Status ...` vs `Asset ID \t ...`) in `contributorParser.ts`.
     - Tier 2: Segmented UI platform toggle (`smart-id-paste-platform-select`) with auto-switch on paste in `SmartIdPasteModal.tsx`.
     - Tier 3: Strict backend partitioning in `/api/portfolio/paste-sync` writing to `Image.ssId` when `body.platform === 'Shutterstock'` and triggering `reconcileImageSales(prisma, { id, ssId })`.
  3. **Backward Compatibility Preservation:** Preserved exact payload format for legacy Adobe Stock callers and existing tests.
  4. **Automated Verification:** Added unit tests `UT-PARSER-SHUTTERSTOCK-CATALOG-01`, `UT-API-PF-PASTE-SYNC-SSID-01`, `UT-UI-SMART-PASTE-PLATFORM-01`, and Playwright E2E test `E2E-PF-04`. All 60 test files (389 tests) and 4 Playwright E2E tests pass with 0 errors.
- **Impact:** Delivers ban-safe, 1-click clipboard extraction and ingestion for Shutterstock catalog items with zero risk of cross-platform ID contamination and automated sales link reconciliation.

