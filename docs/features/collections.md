# Artwork Collections & Theme Performance Tracking

## Overview
The **Artwork Collections** feature enables microstock vector contributors to cluster their portfolio artworks into themes, keyword experiments, or visual styles (e.g. "Thai Traditional Gold", "Cyberpunk Badges", "Retro Infographics"). It calculates aggregated earnings, download counts, and Revenue Per Image (RPI) rollups in real-time, surfaces Top-15 shared keyword intersections with 1-click clipboard export, and supports non-destructive cluster management.

---

## Data Model & Architecture
Implemented in `prisma/schema.prisma` via a relational many-to-many join architecture:

- `Collection`:
  - `id`: CUID primary key
  - `name`: Collection title string (required)
  - `description`: Optional theme or experiment notes
  - `coverId`: Optional custom cover image ID (falls back to first artwork)
  - `createdAt`, `updatedAt`: Timestamps
  - `items`: `CollectionItem[]` cascade relation

- `CollectionItem`:
  - `id`: CUID primary key
  - `collectionId`: Foreign key with `onDelete: Cascade`
  - `imageId`: Foreign key with `onDelete: Cascade`
  - `addedAt`: Timestamp
  - `@@unique([collectionId, imageId])`: Enforces membership uniqueness

> **Safety Contract:** Deleting a `Collection` record cascade-deletes join rows (`CollectionItem`) while keeping all associated `Image` records completely intact in the Portfolio.

---

## Key Features & Endpoints

### 1. Multi-Select & Selection Toolbar (`/portfolio`)
- Hover/active checkboxes on each portfolio grid item (`portfolio-checkbox-{id}`).
- Persistent selection across pagination transitions.
- Floating bottom toolbar (`portfolio-floating-toolbar`) offering:
  - Total selected artworks counter
  - `[New Collection]` (`portfolio-create-collection-btn`)
  - `[Add to...]` (`portfolio-add-to-collection-btn`)
  - `[Select/Deselect Page]`
  - `[Clear Selection]` (`portfolio-clear-selection-btn`)

### 2. Collections Overview Dashboard (`/collections`)
- KPI Summary Cards: Total Collections, Total Artworks, Group Downloads, Group Revenue.
- **View Mode Toggle (`viewMode`):**
  - Segmented control on toolbar: **Grid View** (`LayoutGrid`) vs **Table View** (`List`).
  - Automatically persists user preference in `localStorage` (`collections_view_mode`).
- **Grid Card View (`CollectionCard.tsx`):**
  - Artwork Cover Preview with layered count badge.
  - Title and 1-line description.
  - Metrics rollups: Downloads, Revenue ($), and Average RPI ($/image).
  - 3-dots action menu with Edit and Delete options.
- **Table List View (`CollectionTable.tsx`):**
  - Responsive tabular layout with cover thumbnails, titles, descriptions, and KPI metrics.
  - **Interactive Sortable Column Headers:** Click any column header (Name, Artworks, Downloads, Revenue, Avg RPI, Updated) to toggle sorting ascending/descending with arrow indicators.
  - Inline Edit (`Edit3`) and Delete (`Trash2`) buttons with `stopPropagation` action isolation.
- **Unified Pagination (`PaginationCapsule.tsx`):**
  - Displays at bottom center when `totalPages > 1` (12 collections/page in Grid mode, 20 in Table mode).
  - Automatically resets to Page 1 on search queries or sort changes.

### 3. Collection Detail & Shared Keywords (`/collections/[id]`)
- Metric Bar: Total Artworks, Total Downloads, Total Revenue, Avg RPI.
- **Batch Import by IDs Action (`ImportByIdsModal.tsx`):**
  - Dedicated `[+ Import by IDs]` header action button.
  - Universal Delimiter Parser: Tokenizes multiline text, comma-separated lists, tabbed Excel columns, or space-delimited IDs.
  - Multi-Identifier Resolution: Automatically matches across Adobe Asset IDs (`asId`), Internal Image Codes (`code`), Shutterstock IDs (`ssId`), and CUIDs (`id`).
  - Safe Batch Commit: Deduplicates inputs and skips assets already present in the collection, returning matched and added counts.
- Edit Header Action: In-place pencil button opening `EditCollectionModal` to update name and description.
- **Collection Search & Instant Filtering (`TopSharedKeywordsBar.tsx`):**
  - Integrated search input in the toolbar header for real-time client-side grid filtering.
  - Multi-attribute query resolution matching across Artwork Title, Image Code (`code`), Adobe Asset ID (`asId`), Shutterstock ID (`ssId`), Vecteezy ID (`vzId`), Database CUID (`id`), and Keywords.
  - Active search badge with clear button and unified "Clear All Filters" control when combined with tag filtering.
- **Top 15 Shared Keywords Bar (`TopSharedKeywordsBar.tsx`):**
  - Segmented View Mode Toggle: `Frequency` (occurrence count), `Downloads` (total volume), `Revenue` (accumulated dollars).
  - Dynamic in-memory re-ranking across all unique keywords in the collection.
  - Formatted chip badges displaying the active metric (`dl`, `$`, or count).
  - **Click-to-Filter Drill-Down:** Clicking any keyword chip filters the image grid below to show only assets containing that tag with an active filter badge and reset button.
  - Adaptive 1-click clipboard export (`Copy Top 15 Keywords`, `Copy Top 15 by Downloads`, `Copy Top 15 by Revenue`).
- **Artwork Inspection Drawer (`PortfolioDetail.tsx`):**
  - Clicking any artwork opens the right-hand `PortfolioDetail` drawer with full Dual-Tab functionality (`Details & Info` and `Sales & Analytics`).
  - Automatically loads and binds global portfolio benchmarks (`Top 100 Avg`, `Port Avg`) and chronological sales logs (`stats`).
- **Artwork Grid Actions:**
  - `⭐ Set Cover`: 1-click button on artwork card hover to set collection cover image.
  - `Cover` badge indicating the current primary cover asset.
  - `[X]` button to remove artwork item from the collection.


### 4. API Endpoints
- `GET /api/collections`: List collections with computed rollups and cover previews.
- `POST /api/collections`: Create new collection with optional initial `imageIds`.
- `GET /api/collections/[id]`: Retrieve single collection with image list, summary metrics, and full calculated keyword rollups.
- `PATCH /api/collections/[id]`: Update collection metadata (`name`, `description`, `coverId`).
- `DELETE /api/collections/[id]`: Cascade-delete collection.
- `POST /api/collections/[id]/items`: Universal batch add images to collection (accepts `tokens`, `asIds`, `codes`, `ssIds`, or `imageIds`).
- `DELETE /api/collections/[id]/items`: Remove single image from collection.
