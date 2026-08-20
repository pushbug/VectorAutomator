# Sales & Earnings Tracking Feature

## 1. Overview
The Sales & Earnings Tracking module provides a transaction-based recording system for individual image performance across multiple microstock platforms (e.g. Shutterstock, Adobe Stock, Freepik, Vecteezy).

## 2. Core Concepts
- **Transaction-based Records (`PlatformStats`):** Sales are logged with a target Image reference, platform name, date, downloads, and earnings in USD.
- **Date Normalization & Upsert:** The date is normalized to UTC midnight (`YYYY-MM-DDT00:00:00.000Z`). When logging a sale for the same `(imageId, platform, date)`, values are accumulated (downloads + newDownloads, earnings + newEarnings).
- **Automated Rollups:** Whenever a sale is created, updated, or removed, the parent `Image` record recomputes:
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


