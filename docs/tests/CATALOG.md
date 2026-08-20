# Test Catalog

## Unit Tests
| Test ID | Description | Target |
|---------|-------------|--------|
| `UT-HOOK-01` | Verify Asset Context updates correctly | `useAssetProcessor.test.ts` |
| `UT-API-01` | Verify EPS conversion responds with valid JPG mock | `api/convert.test.ts` |
| `UT-API-02` | Verify AI Metadata generation formats correctly | `api/metadata.test.ts` |
| `UT-API-PF` | Verify Portfolio API fetches sorted data and correctly updates downloads via PATCH | `src/__tests__/api/portfolio.test.ts` |
| `UT-API-CODE-01` | Verify upload API rejects duplicate image code with 409 and calculates sequence | `src/__tests__/api/upload.test.ts` |
| `UT-API-DEL-01` | Verify DELETE API permanently removes image and safe unlinks file | `src/__tests__/api/delete.test.ts` |
| `UT-API-SALES-01` | Verify Sales API logs transactions, performs date-normalized upsert, and recomputes image rollups | `src/__tests__/api/sales.test.ts` |
| `UT-API-ID-01` | Verify upload and patch APIs accept and persist platform asset IDs (ssId, asId, vzId) | `src/__tests__/api/upload.test.ts` |
| `UT-API-CAT-01` | Verify upload and patch APIs accept and persist category metadata | `src/__tests__/api/upload.test.ts` |
| `UT-UI-DATE-01` | Verify SingleDatePicker year/month grid navigation and quick jump to past years | `src/__tests__/components/SingleDatePicker.test.tsx` |
| `UT-UI-DATE-RANGE-01` | Verify DateRangePicker year/month grid navigation and quick jump to past years | `src/__tests__/components/DateRangePicker.test.tsx` |
| `UT-UI-DEL-01` | Verify DeleteConfirmDialog open state, escape keydown, confirm, and cancel handling | `src/__tests__/components/DeleteConfirmDialog.test.tsx` |
| `UT-UI-SALES-01` | Verify SalesSummaryCards KPI metrics and SalesTable filtering/empty states | `src/__tests__/components/SalesComponents.test.tsx` |
| `UT-API-PF-EDIT-01` | Verify portfolio PATCH API updates all metadata, preserves own code, and rejects cross-image duplicate codes with 409 | `src/__tests__/api/portfolio.test.ts` |
| `UT-KEEP-INGEST-01` | Verify Keep note text parsing, metadata extraction, and fallback keywords | `src/__tests__/import_keep.test.ts` |
| `UT-KEEP-DEDUP-02` | Verify chronological YYMM-XX code generation and duplicate-free sequencing | `src/__tests__/import_keep.test.ts` |
| `UT-KEEP-FILTER-03` | Verify strict Vector label whitelist and Knowledge/Pinterest/empty exclusions | `src/__tests__/import_keep.test.ts` |
| `UT-UI-PAGE-01` | Verify PortfolioGrid interactive page jump input, Enter commit, and boundary clamping | `src/__tests__/components/PortfolioGrid.test.tsx` |
| `UT-API-PF-SEARCH-01` | Verify Portfolio API universal search across title, keywords, tags, code, and platform asset IDs | `src/__tests__/api/portfolio.test.ts` |
| `UT-SALES-PASTE-01` | Verify multi-line clipboard text parsing with markdown links from Adobe Stock | `src/__tests__/api/sales_paste.test.ts` |
| `UT-SALES-PASTE-02` | Verify single-line TSV table rows parsing with downloads and currency | `src/__tests__/api/sales_paste.test.ts` |
| `UT-SALES-PASTE-03` | Verify /api/sales/paste-sync preview and atomic transaction bulk upsert with ID linking | `src/__tests__/api/sales_paste.test.ts` |
| `UT-SALES-PASTE-04` | Verify multi-line stream text parsing with download counts and plain decimal earnings | `src/__tests__/api/sales_paste.test.ts` |
| `UT-SALES-PASTE-05` | Verify /api/sales/paste-sync proximity matching within ±7 days and candidate disambiguation | `src/__tests__/api/sales_paste.test.ts` |
| `UT-IMPORT-QUEUE-01` | Verify AssetQueue selection toggling and batch importing to portfolio with queue clearing | `src/__tests__/useAssetProcessor.test.ts` |
| `UT-API-DASH-01` | Verify dashboard API aggregated metrics calculations, zero-data safety, and error handling | `src/__tests__/api/dashboard.test.ts` |
| `UT-UI-DASH-01` | Verify Dashboard HomePage KPI rendering, monthly goal pace, quick action routes, and copy trigger | `src/__tests__/components/Dashboard.test.tsx` |
| `UT-LIB-KEYWORD-ANALYTICS-01` | Verify keyword extraction, deduplication, accumulated downloads/earnings, and Top-5 primary flags | `src/__tests__/lib/keywordAnalytics.test.ts` |
| `UT-UI-KEYWORD-SUGGEST-01` | Verify KeywordSuggester portfolio search, sort toggle, image selection, tag badges, and injection | `src/__tests__/components/KeywordSuggester.test.tsx` |
| `UT-API-PF-SEARCH-FIELD-01` | Verify portfolio API searchField scoping (all, title_keywords, code_ids) and secondary tie-breaking | `src/__tests__/api/portfolio.test.ts` |
| `UT-UI-KEYWORD-SUGGEST-SEARCH-FIELD-01` | Verify KeywordSuggester searchField select dropdown and Top Earnings sorting | `src/__tests__/components/KeywordSuggester.test.tsx` |
| `UT-UI-METADATA-KEYWORD-GATE-01` | Verify MetadataEditor soft cap to 100 words, red warning on >50, and Save button disabled gate | `src/__tests__/components/MetadataEditor.test.tsx` |
| `UT-UI-KEYWORD-SUGGEST-COPY-01` | Verify KeywordSuggester copy selected tags to clipboard and deduplicated append merge | `src/__tests__/components/KeywordSuggester.test.tsx` |
| `UT-UI-METADATA-TITLE-VALIDATION-01` | Verify MetadataEditor title required validation on Save, focusing input and rendering red border/error | `src/__tests__/components/MetadataEditor.test.tsx` |
| `UT-SALES-DATE-01` | Verify SmartPasteModal statement date selection and date mode toggling | `src/__tests__/api/sales_paste.test.ts` |
| `UT-SALES-UNMATCHED-01` | Verify /api/sales/paste-sync persists unlinked platformStats with platformAssetId | `src/__tests__/api/sales_paste.test.ts` |
| `UT-SALES-RECONCILE-01` | Verify auto-reconciliation updates unlinked platformStats to imageId when platform asset IDs match | `src/__tests__/lib/salesReconciler.test.ts` |
| `UT-SALES-PASTE-DL-01` | Verify fallback download count to 1 when earnings > 0 and downloads column is omitted | `src/__tests__/api/sales_paste.test.ts` |
| `UT-UI-SALES-DATE-FILTER-01` | Verify SalesTable DateRangePicker selection and date filtering integration | `src/__tests__/components/SalesComponents.test.tsx` |
| `UT-UI-SALES-IMAGE-DRAWER-01` | Verify clicking artwork in SalesTable triggers onSelectImage callback | `src/__tests__/components/SalesComponents.test.tsx` |
| `UT-UI-SALES-SORT-01` | Verify clicking SalesTable column headers triggers sortBy and sortOrder callbacks | `src/__tests__/components/SalesComponents.test.tsx` |
| `UT-UI-SALES-HOVER-PREVIEW-01` | Verify hovering over artwork thumbnail in SalesTable renders enlarged preview popover | `src/__tests__/components/SalesComponents.test.tsx` |
| `UT-UI-SALES-ACTION-MENU-01` | Verify 3-dots action menu in SalesTable opens and executes Preview and Delete actions | `src/__tests__/components/SalesComponents.test.tsx` |
| `UT-UI-SALES-UNLINKED-FILTER-01` | Verify selecting Unlinked filter button triggers onPlatformFilterChange with unlinked and filters imageId=null | `src/__tests__/components/SalesComponents.test.tsx` |
| `UT-UI-SALES-SMART-PASTE-LIVE-STATS-01` | Verify real-time detected items count and estimated total revenue on paste in SmartPasteModal | `src/__tests__/components/SalesComponents.test.tsx` |
| `UT-UI-PORTFOLIO-DETAIL-EARNINGS-01` | Verify total revenue and per-platform breakdown rendering in PortfolioDetail | `src/__tests__/components/PortfolioGrid.test.tsx` |
| `UT-API-PF-SUMMARY-01` | Verify Portfolio API computes and returns totalImages, totalDownloads, and totalEarnings in summary | `src/__tests__/api/portfolio.test.ts` |
| `UT-UI-PORTFOLIO-SUMMARY-01` | Verify PortfolioPage renders summary bar with artworks count, downloads, and revenue | `src/__tests__/components/PortfolioGrid.test.tsx` |
| `UT-API-SALES-BATCH-01` | Verify batch delete API permanently deletes selected platformStats and syncs image rollups | `src/__tests__/api/sales_batch.test.ts` |
| `UT-API-SALES-BATCH-DATE-01` | Verify batch update date API performs collision-safe merging and re-syncs rollups | `src/__tests__/api/sales_batch.test.ts` |
| `UT-UI-SALES-BULK-01` | Verify row multi-selection, select-all on page, floating action bar, and bulk action triggers | `src/__tests__/components/SalesComponents.test.tsx` |
| `UT-SALES-ROLLUP-01` | Verify syncImageRollup calculates and updates totals by platform | `src/__tests__/lib/salesReconciler.test.ts` |
| `UT-CODE-SEQ-01` | Verify getNextImageCode computes next monthly sequence | `src/__tests__/lib/formatters.test.ts` |

## E2E Tests
| Test ID | Description | Target |
|---------|-------------|--------|
| `E2E-UPL-01` | Happy path: Upload, auto-pair, gen metadata, save EXIF | `e2e/upload.spec.ts` |
| `E2E-UPL-02` | Keyword Suggestion: Portfolio reference search, scoping, tag selection, copy, and non-destructive injection | `e2e/upload.spec.ts` |
| `E2E-PF-01` | Happy path: Portfolio rendering, filtering, sorting, pagination, and download update | `e2e/portfolio.spec.ts` |
| `E2E-PF-02` | Verify Image Code auto-suggest, duplicate validation, and image deletion with confirm modal | `e2e/portfolio.spec.ts` |
| `E2E-SALES-01` | Verify logging sales transactions, summary KPI metrics, and portfolio breakdown reflections | `e2e/sales.spec.ts` |
| `E2E-SALES-02` | Verify opening Smart Paste modal, real-time live stats, preview header, and submission | `e2e/sales.spec.ts` |
| `E2E-SALES-03` | Verify Unlinked artwork filter button and sales table pagination controls | `e2e/sales.spec.ts` |
| `E2E-SALES-04` | Verify multi-row selection, select-all checkbox, floating action bar, and BulkDateModal | `e2e/sales.spec.ts` |
