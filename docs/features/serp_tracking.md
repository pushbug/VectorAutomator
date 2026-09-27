# Stock SERP Copier & Search Ranking Intelligence

## Overview
The Stock SERP Copier module enables microstock creators to capture, analyze, and track their search ranking positions across stock photography marketplaces (primarily Adobe Stock). It consists of a standalone, client-side Manifest V3 Chrome Extension and a server-side parsing and persistence engine within VectorAutomator.

## Architecture

### 1. Chrome Extension (`extension/extension-serp/`)
- **Manifest V3:** Completely client-side, runs in active user tabs without server-side headless browsers or external proxy dependencies.
- **Glassmorphic UI:** Modern dark Obsidian theme (`#080c14`), frosted glass cards (`backdrop-filter: blur(12px)`), segmented pill depth selector, and live tab connection indicator.
- **Instant Extraction Mode (0.1s):** Scrapes 100 search result grid cells (`.search-result-cell[data-content-id]`, titles, thumbnails, rank offsets) directly from the active tab's rendered DOM in zero network overhead.
- **Clean Column Export:**
  - **Default (URLs OFF):** `Keyword \t Page \t Rank \t Asset ID \t Author \t Title`
  - **Extended (URLs ON):** `Keyword \t Page \t Rank \t Asset ID \t Author \t Title \t Thumbnail \t Detail URL`
  - Setting persisted in `chrome.storage.local['serp_include_urls']`.
- **Optional Native In-Page Navigator:** Exploratory enrichment for Top 10/20 items using in-page keyboard `ArrowRight` dispatch and author DOM reading from `#details span[data-t="detail-panel-content-author-name"] a.js-contributor-link`.

### 2. Universal Clipboard Parser (`src/lib/serpPasteParser.ts`)
- Auto-detects and parses JSON, TSV, and CSV formats from clipboard pastes.
- Automatically handles multi-page rank calculations: `rank = (page - 1) * 100 + index`.
- Automatically distinguishes clean 6-column layout vs 8-column layout with URL strings.

### 3. Database Schema & Sync Engine
- **`SerpQuery`:** Tracks keyword, platform, search date, page number, and total items.
- **`SerpItem`:** Tracks rank, assetId, title, author, thumbnailUrl, detailUrl, `isMine` flag, and optional `matchedImageId` foreign key to `Image`.
- **`POST /api/serp/paste-sync`:** Atomically parses pasted SERP text, queries `Image.asId` in SQLite database, marks matching portfolio items with `isMine = true` and `matchedImageId`, and creates records within a database transaction. Replaces existing same-day queries scoped by `keyword`, `platform`, and `pageNumber` to preserve multi-page pastes.
- **`GET /api/serp`:** Paginated endpoint (default 100 items/page) supporting multi-column sorting (`sortBy`: date, keyword, rank, delta, downloads, revenue; `sortOrder`: asc, desc) with secondary `rank asc` tie-breaker on identical dates. Retains full multi-date timeline when keyword or search is active. Supports `quickFilter` (`all`, `top10`, `rising`, `dropping`, `dropped`), exact keyword filtering, and synthesizes `isDropped: true` items for artworks dropping off between adjacent snapshots ($T-1 \rightarrow T$).

### 4. Ranking Dashboard UI (`/serp`)
- **`SerpTable`:** Sortable column headers with visual sort state indicators (`ArrowUpDown`, `ArrowUp`, `ArrowDown`), `PaginationCapsule` page jump navigation, auto-cleared row selection across pagination/filter changes, and balanced column min-widths (`min-w-24`, `pr-6`) preventing ACTION header clipping.
- **Quick Filter Tabs:** Sleek sub-toolbar pill selector (`All`, `Top 10`, `Rising`, `Dropping`, `Dropped`) with active state highlight.
- **Universal Search Bar:** Omnibox searching across keywords, asset IDs, titles, and artwork codes.
- **`SmartSerpPasteModal`:** Live paste ingestion modal with auto-reset lifecycle upon "Paste Another", submission completion, or modal dismissal. Resolves thumbnails with `getImageUrl` and fallback to `thumbnailUrl`.
- **`ArtworkSerpDrawer`:** Slide-over drawer detailing historical rank progression across all tracked keywords and correlating with cumulative earnings.
- **`FullSerpModal`:** Full snapshot explorer for analyzing competitor positions and author concentration.

### 5. Modular SERP Reconciler (`src/lib/serpReconciler.ts`)
- **Single Artwork Reconciliation (`reconcileImageSerp`):** Updates `SerpItem` records when an artwork is uploaded or edited with `asId`, `ssId`, or `vzId`.
- **Proactive Batch Reconciliation (`autoReconcileSerpItems`):** Executes on `GET /api/serp` to ensure newly added artworks immediately match historical SERP snapshots.

### 6. SERP Enrichment & Dropout Engine (`src/lib/serp/serpEnrichment.ts`)
- **DRY Stats Rollup (`calculateSerpItemStats`):** Unifies downloads, asDownloads, and platform earnings rollups across both active and dropped items.
- **Concurrent Dropout Synthesis (`synthesizeAdjacentDropouts`):** Queries adjacent snapshot transitions ($T-1 \rightarrow T$) concurrently using `Promise.all` across target keywords, eliminating sequential N+1 database round-trips.

## Testing Strategy
- `UT-SERP-PARSE-01`: Universal TSV/CSV/JSON clipboard parser test suite.
- `UT-API-SERP-01`: SERP API routes and portfolio matching test suite.
- `UT-API-SERP-SORT-01`: Multi-column sorting on enriched SERP items.
- `UT-API-SERP-KEYWORD-SEARCH-01`: Universal keyword search and exact keyword match timeline retention.
- `UT-API-SERP-DROPPED-01`: Adjacent snapshot dropout synthesis and quickFilter evaluation.
- `UT-API-SERP-PASTE-PAGES-01`: Scoped same-day query replacement by pageNumber preserving multi-page syncs.
- `UT-API-SERP-ENRICH-01`: Parallelized adjacent dropout synthesis and DRY stats calculation across multiple keywords.
- `UT-UI-SERP-TABLE-01`: SERP rankings table rendering, keyword filter, delta badge colors, and drawer triggers.
- `UT-UI-SERP-QUICK-TABS-01`: Quick Filter tabs switching and DROPPED badge rendering.
- `UT-UI-SERP-TABLE-SORT-01`: Sortable header toggle clicks and pagination integration.
- `UT-UI-SERP-PASTE-MODAL-01`: SmartSerpPasteModal date selection, keyword auto-detection, live match preview, and form reset.
- `UT-SERP-RECONCILE-03`: Modular SERP reconciliation unit tests (`reconcileImageSerp`, `autoReconcileSerpItems`).
- `UT-EXT-DOM-PARSER-01`: DOM selector extraction and multi-page rank offset tests.
- `UT-EXT-AUTHOR-ENRICH-01`: Author detail extraction and jitter bounds tests.
- `UT-EXT-STEALTH-NAV-01`: Stealth sequence delay and smart linger tests.

