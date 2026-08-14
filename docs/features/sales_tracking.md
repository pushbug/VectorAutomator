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
- `Freepik`
- `Vecteezy`

## 4. UI Components
1. **Sales Dashboard (`/sales`):**
   - KPI Cards: Total Earnings ($ USD), Total Downloads, Top Platform, Total Active Images.
   - Sales Entry Drawer: Search & select image by Code/Title with thumbnail preview, pick platform, date, downloads, and earnings.
   - Sales History Table: Paginated log with sorting and deletion.
2. **Portfolio Detail Integration (`/portfolio`):**
   - Read-only Platform Breakdown showing downloads and revenue per platform.
   - "+ Log Sale" button to immediately open the entry drawer prefilled for the selected image.
