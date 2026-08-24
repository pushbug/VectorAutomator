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
- **`POST /api/serp/paste-sync`:** Atomically parses pasted SERP text, queries `Image.asId` in SQLite database, marks matching portfolio items with `isMine = true` and `matchedImageId`, and creates records within a database transaction.
- **`GET /api/serp`:** Paginated endpoint returning historical queries with matching image counts and rank highlights.

## Testing Strategy
- `UT-SERP-PARSE-01`: Universal TSV/CSV/JSON clipboard parser test suite.
- `UT-API-SERP-01`: SERP API routes and portfolio matching test suite.
- `UT-EXT-DOM-PARSER-01`: DOM selector extraction and multi-page rank offset tests.
- `UT-EXT-AUTHOR-ENRICH-01`: Author detail extraction and jitter bounds tests.
- `UT-EXT-STEALTH-NAV-01`: Stealth sequence delay and smart linger tests.
