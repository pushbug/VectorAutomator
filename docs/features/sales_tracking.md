# Sales & Earnings Tracking Feature

## 1. Overview
The Sales & Earnings Tracking module provides a transaction-based recording system for individual image performance across multiple microstock platforms (e.g. Shutterstock, Adobe Stock, Freepik, Vecteezy).

## 2. Core Concepts
- **Transaction-based Records (`PlatformStats`):** Sales are logged with a target Image reference, platform name, date, downloads, and earnings in USD.
- **Date Normalization & Upsert:** The date is normalized to UTC midnight (`YYYY-MM-DDT00:00:00.000Z`). When logging a sale for the same `(imageId, platform, date)`, values are accumulated (downloads + newDownloads, earnings + newEarnings).
- **Automated Rollups:** Whenever a sale is created, updated, or removed, the parent `Image` record recomputes rollups via shared `syncImageRollup(prismaOrTx, imageId)`:
  - `totalDownloads` = $\sum \text{downloads across all platforms}$
  - `ssDownloads` = $\sum \text{downloads for Shutterstock}$
  - `asDownloads` = $\sum \text{downloads for Adobe Stock}$
  - Total revenue is dynamically calculated and exposed to the frontend.

## 3. Supported Platforms
- `Shutterstock`
- `Adobe Stock`
- `Vecteezy`

## 4. UI Components
1. **Sales Dashboard (`/sales`):**
   - KPI Cards: Total Earnings ($ USD), Total Downloads, Top Platform, Total Active Images.
   - Sales Entry Drawer: Search & select image by Code/Title with thumbnail preview, pick platform, date, downloads, and earnings.
   - Sales History Table: Paginated log with sorting and deletion.
   - Smart Paste Modal: Zero-risk clipboard importer for Adobe Stock / Shutterstock / Vecteezy tabular statements with multi-tier matching and interactive disambiguation.
2. **Portfolio Detail Integration (`/portfolio`):**
   - Read-only Platform Breakdown showing downloads and revenue per platform.
   - "+ Log Sale" button to immediately open the entry drawer prefilled for the selected image.

## 5. Smart Paste Tokenizer & Matching Pipeline
- **Multi-Format Ingestion:** Extracts Asset IDs, upload dates, downloads count, and USD earnings from raw clipboard copies (TSV rows, newline token blocks, markdown links `[1929092005](url)`, commas, and currency signs).
- **Multi-Tier Resolution Engine (`/api/sales/paste-sync`):**
  - **Tier 1 (Exact Platform ID):** Matches existing `asId` / `ssId` / `vzId` records directly.
  - **Tier 2 (Exact Creation Date):** Matches single artwork created on the exact UTC date.
  - **Tier 3 (Proximity Window ±7 Days):** Provides artwork candidate list for approval date drift.
  - **Tier 4 (Interactive Disambiguation):** Dropdown selector allowing manual artwork mapping for ambiguous dates.
- **Batch Atomic Upsert:** Automatically binds platform IDs to `Image`, upserts `PlatformStats` on `(imageId, platform, date)`, and updates rollup counters in a single Prisma transaction.

## 6. Batch Sales Operations (`/api/sales/batch`)
- **Multi-Row Selection:** Checkboxes in `SalesTable` header and rows support selective batch actions or "Select All" on current page with automatic state reset on filter/page changes.
- **Bulk Delete:** Atomic deletion of selected `PlatformStats` IDs with safe re-synchronization of `totalDownloads`, `ssDownloads`, and `asDownloads` rollups on all affected parent images.
- **Collision-Safe Bulk Date Update:** Shifts dates for selected records to a target UTC midnight date (`YYYY-MM-DDT00:00:00.000Z`). If a record already exists on the target date for `(imageId, platform, targetDate)`, values (`downloads`, `earnings`) are accumulated into the target record and the source duplicate is removed without unique constraint violations. Unlinked records (`imageId = null`) are handled safely without throwing null errors.

## 7. Proactive Automatic Reconciliation (`src/lib/salesReconciler.ts`)
- **Unlinked Sales Scan (`reconcileAllUnlinkedSales`):** Queries unlinked `PlatformStats` (`imageId: null`) on `GET /api/sales` and automatically correlates `platformAssetId` with `Image` records matching `asId`, `ssId`, or `vzId`.
- **Collision-Safe Binding:** Binds `imageId` and updates rollup counters on parent artworks, ensuring that sales logged prior to artwork entry or ID synchronization automatically display their thumbnails and metadata without manual intervention.
 
+## 8. Dedicated Adobe Stock Sales Extractor & Smart Paste Automation (`extension/extension-sales/`)
+- **Standalone Extension:** Fully decoupled Manifest V3 Chrome extension under `extension/extension-sales/` for Adobe Stock Contributor Statistics (`data-t="insights-my-statistics-page"`).
+- **Passive In-Page Extractor:** Safely extracts period dates, Top Sellers table rows (`insights-top-sellers-table-row`), asset IDs, categories, and earnings into clipboard TSV format with metadata headers (`Date: YYYY-MM-DD`). 100% passive client DOM scraping with zero bot detection footprint.
+- **Single Page App (SPA) Synchronization:** Listens to Adobe's `Display statistics` CTA button (`insights-sidebar-cta`) and polls completion of spinner wrapper (`content-spinner-wrapper`) before updating the in-page floating copy button (`#va-sales-copy-btn`) with glowing pulse animation.
+- **Dynamic Tab Script Injection:** Extension popup utilizes `chrome.scripting.executeScript` fallback to seamlessly inject content script into existing tabs without forcing full-page reloads.
+- **Dual-Layer Date Defense:**
+  - **Frontend:** `SmartPasteModal` auto-detects date headers from pasted text using `extractStatementDate` and automatically syncs `statementDate` state with visual feedback.
+  - **Backend:** `POST /api/sales/paste-sync` unconditionally prioritizes date headers extracted from `rawText` over client datepicker values, eliminating temporal drift from stale UI sessions.
+- **Duplicate Sales Warning Alert:** Preview mode queries `PlatformStats` on target date and returns `existingSalesWarning`, rendering an amber warning banner if records exist for that platform and date.
+- **In-Payload Asset Deduplication & Clean Paste UX:** `parseStockPaste` enforces Set-based `assetId` deduplication across Strategy 1 (single-line) and Strategy 2 (stream tokens), preventing double-pasted text from inflating earnings or counts. Textarea auto-replaces on statement paste and includes a 1-click `Clear` button (`smart-paste-clear-btn`).

