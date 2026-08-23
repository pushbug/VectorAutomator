# Keyword Suggestion & Metadata Ingestion Specification

## Overview
The **Upload & Keyword Suggestion** workflow (`/upload`) provides paired vector EPS/JPG processing, automated EXIF injection, and an interactive Keyword Suggestion engine referencing existing portfolio vectors.

## Core Features & Mechanics

### 1. 5-Scope Portfolio Reference Search
- Dedicated search bar querying `/api/portfolio` with 300ms debounce.
- 5 discrete search scopes:
  - `all`: Search across title, keywords, internal code, and platform IDs.
  - `title`: Search vector title only.
  - `keywords` *(default)*: Search individual keyword tokens.
  - `code`: Search internal vector code (e.g. `2608-01`).
  - `ids`: Search stock platform IDs (Shutterstock, Adobe Stock, Vecteezy).
- Database CUID `id` is strictly excluded from query matching to eliminate single-digit false positives.
- Secondary tie-breaker sort `createdAt: desc` ensures newest vectors appear first on zero or tied metrics.

### 2. Multi-Reference Aggregation & Scoring
- Users can select multiple reference vector cards from the image grid.
- Keywords from all selected vectors are aggregated with:
  - `frequency`: Total number of selected vectors containing the keyword.
  - `totalDownloads`: Accumulated downloads across selected vectors.
  - `totalEarnings`: Accumulated earnings ($) across selected vectors.
  - `isTopFive`: Primary star badge applied to top 5 ranked keywords.
  - `score`: Weighted ranking based on earnings, downloads, and frequency.

### 3. Non-Destructive Deduplicated Ingestion & Soft Cap
- **Append Mode**: When applying keywords (`mergeKeywords`), 100% of existing keywords in the active asset are preserved in their original order.
- **Strict Deduplication**: Incoming keywords are filtered case-insensitively (`vector` vs `Vector`).
- **Soft Limit (100 words)**: Allows users to collect an expansive candidate pool (up to 100 words) from multiple references before manual pruning.
- **Pre-Save Microstock Validation Gate**:
  - If keywords count exceeds 50, a red warning badge (`metadata-keyword-limit-warning`) and red border highlight are rendered.
  - `Save Metadata` button is disabled with prompt `Exceeds 50 Keywords (Remove X to Save)`.
  - Saving is unlocked only when keywords count is between 1 and 50.

### 4. Title Required Validation Gate
- Clicking `Save Metadata` with an empty title immediately focuses the title textarea and applies a red border (`border-destructive ring-1 ring-destructive/30 bg-destructive/5`).
- The red border clears reactively as soon as the user types into the title.

### 5. Clipboard Integration
- Dual Copy buttons in KeywordSuggester (`keyword-suggest-copy-tags-btn` in footer and `keyword-suggest-header-copy-btn` in header) copy selected tags to system clipboard with `Copied!` feedback.

### 6. Dual-Action Tag Pills & Concurrent Metric Badges
- **Concurrent Metrics Display**: Each keyword tag pill displays both download count (with `<Download />` icon) and dollar earnings (`$X.XX`) with fixed tabular numbers (`tabular-nums`). Falls back to frequency badge (`xN`) when both are zero.
- **Dual-Action Interaction**:
  - **Left Checkbox Button** (`keyword-suggest-tag-checkbox-{keyword}`): Toggles inclusion in the batch selection set (`selectedTagNames`) with `e.stopPropagation()` for footer batch Copy and Apply actions.
  - **Right Pill Body Button** (`keyword-suggest-tag-{keyword}`): Instant 1-click cart toggle directly into `activeKeywords`. Clicking when absent appends the keyword to the active asset; clicking when already in asset (`(in asset)` status) removes the keyword with real-time feedback toast.

### 7. Suggested Keywords Segmented Sort Controls
- **Interactive Header Sort Toggle**: Users can dynamically rank keyword suggestions by 4 discrete criteria:
  - `Score` (`keyword-suggest-sort-score-btn`): Multi-metric composite score factoring frequency, downloads, earnings, and Top 5 status.
  - `Downloads` (`keyword-suggest-sort-downloads-btn`): Total downloads descending across selected reference artworks.
  - `Earnings` (`keyword-suggest-sort-earnings-btn`): Total accumulated revenue ($) descending across selected reference artworks.
  - `A-Z` (`keyword-suggest-sort-alpha-btn`): Pure alphabetical ascending order.
- **Selection State Persistence**: Switching sort modes only re-orders the visible keyword tokens without resetting manual checkbox selections (`selectedTagNames`).

### 8. Metadata Editor Keywords Row List View, Metrics & Sorting
- **Real-Time Metric Badges**: Keywords in the active asset display performance history (`totalDownloads` with `<Download />` icon and `totalEarnings` in `$X.XX`) with `tabular-nums` formatting.
- **Numbered Row List Layout**: Clean vertical numbered list (`#1 - #50`) with metric columns and single-click remove buttons (`metadata-keyword-row-{keyword}`).
- **True Global Portfolio Metrics Lookup**:
  - Automatically queries `/api/keywords?mode=lookup` to resolve all-time total portfolio downloads and total earnings across the entire catalog for any typed or pasted keywords in real time.
- **Bidirectional Dynamic Sorting**:
  - `Orig` (`metadata-keywords-sort-orig-btn`): Preserves exact stored insertion sequence.
  - `DL` (`metadata-keywords-sort-dl-btn`): Sorts by total portfolio downloads (toggles High→Low ↓ vs Low→High ↑).
  - `$` (`metadata-keywords-sort-rev-btn`): Sorts by total accumulated revenue (toggles High→Low ↓ vs Low→High ↑).
  - `A-Z` (`metadata-keywords-sort-alpha-btn`): Sorts alphabetical (toggles A→Z vs Z→A).
- **CSV Output & EXIF Contract**: Copying to clipboard and saving metadata always joins keywords using standard comma separation (`, `) respecting the active sort order.

## Key Components & Files
- Engine: `src/lib/keywordAnalytics.ts`
- Panel: `src/components/upload/KeywordSuggester.tsx`
- Editor: `src/components/upload/MetadataEditor.tsx`
- Page: `src/app/upload/page.tsx`
- API Routes: `src/app/api/portfolio/route.ts`, `src/app/api/keywords/route.ts`
