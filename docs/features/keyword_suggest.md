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

## Key Components & Files
- Engine: `src/lib/keywordAnalytics.ts`
- Panel: `src/components/upload/KeywordSuggester.tsx`
- Editor: `src/components/upload/MetadataEditor.tsx`
- Page: `src/app/upload/page.tsx`
- API Route: `src/app/api/portfolio/route.ts`
