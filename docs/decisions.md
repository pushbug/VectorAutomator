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

