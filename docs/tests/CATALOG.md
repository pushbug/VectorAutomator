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
| `UT-UI-KEYWORD-SUGGEST-DUAL-01` | Verify KeywordSuggester concurrent download/earnings metrics, isolated checkbox selection, and 1-click cart toggle | `src/__tests__/components/KeywordSuggester.test.tsx` |
| `UT-UI-KEYWORD-SUGGEST-SORT-01` | Verify KeywordSuggester Segmented Sort Toggle switches dynamically between Score, Downloads, Earnings, and A-Z | `src/__tests__/components/KeywordSuggester.test.tsx` |
| `UT-UI-METADATA-TITLE-VALIDATION-01` | Verify MetadataEditor title required validation on Save, focusing input and rendering red border/error | `src/__tests__/components/MetadataEditor.test.tsx` |
| `UT-UI-METADATA-EDITOR-SORT-01` | Verify MetadataEditor dual view modes (chips vs rows), metric badges, and dynamic sorting (Original, Downloads, Earnings, A-Z) | `src/__tests__/components/MetadataEditor.test.tsx` |
| `UT-UI-METADATA-EDITOR-TIE-01` | Verify MetadataEditor tie-breaking fallback to alphabetical, zero/missing metrics handling, and ascending/descending toggles | `src/__tests__/components/MetadataEditor.test.tsx` |
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
| `UT-API-KW-01` | Verify /api/keywords token extraction, RPI/RPD calculations, sorting, and KPI summaries | `src/__tests__/api/keywords.test.ts` |
| `UT-API-KW-02` | Verify /api/keywords filters token earnings and downloads by timeRange (30d, 90d, 1y) | `src/__tests__/api/keywords.test.ts` |
| `UT-API-KW-03` | Verify /api/keywords returns key-value dictionary in mode=lookup for instant global keyword metrics | `src/__tests__/api/keywords.test.ts` |
| `UT-UI-KW-TABLE-01` | Verify KeywordTable sorting, search filtering, row selection, time range velocity, and bulk copy | `src/__tests__/components/KeywordTable.test.tsx` |
| `UT-UI-KW-DRAWER-01` | Verify KeywordDetailDrawer fetches linked artworks and renders thumbnails/stats | `src/__tests__/components/KeywordDetailDrawer.test.tsx` |
| `UT-UI-KW-RECIPE-01` | Verify Winning Tag Combinations recipe calculation and 1-click clipboard copy in drawer | `src/__tests__/components/KeywordDetailDrawer.test.tsx` |
| `UT-LIB-CLIPBOARD-01` | Verify copyToClipboard handles Navigator Clipboard, fallback DOM execCommand, and errors | `src/__tests__/lib/clipboard.test.ts` |
| `UT-UI-PAGINATION-CAPSULE-01` | Verify PaginationCapsule Prev/Next navigation, direct numeric input jump, and boundaries | `src/__tests__/components/PaginationCapsule.test.tsx` |
| `UT-API-COLLECTION-01` | Verify /api/collections GET list with rollups and POST create collection with images | `src/__tests__/api/collections.test.ts` |
| `UT-API-COLLECTION-DETAIL-02` | Verify /api/collections/[id] GET detail with Top 15 shared keywords, PATCH, and cascade DELETE | `src/__tests__/api/collections.test.ts` |
| `UT-API-COLLECTION-ITEMS-03` | Verify /api/collections/[id]/items POST batch add and DELETE remove artwork item | `src/__tests__/api/collections.test.ts` |
| `UT-UI-PORTFOLIO-MULTISELECT-01` | Verify PortfolioGrid multi-selection checkboxes, stopPropagation, and floating toolbar | `src/__tests__/components/PortfolioGrid.test.tsx` |
| `UT-UI-COLLECTION-CARDS-01` | Verify CollectionCard cover image, rollup KPIs, and edit/delete triggers | `src/__tests__/components/Collections.test.tsx` |
| `UT-UI-COLLECTION-TABLE-01` | Verify CollectionTable columns, sortable headers, thumbnails, and isolated action triggers | `src/__tests__/components/Collections.test.tsx` |
| `UT-UI-COLLECTIONS-PAGE-01` | Verify CollectionsPage view mode toggle (Grid/Table), search page reset, and pagination | `src/__tests__/components/Collections.test.tsx` |
| `UT-UI-COLLECTION-DETAIL-01` | Verify TopSharedKeywordsBar view modes (Freq/DL/Rev), badges, tag drill-down, and 1-click clipboard copy | `src/__tests__/components/Collections.test.tsx` |
| `UT-STAGING-QUEUE-PERSIST-01` | Verify staging queue IndexedDB persistence, auto-rehydration on mount, selective metadata update, and auto-cleanup | `src/__tests__/lib/stagingQueueStorage.test.ts`, `src/__tests__/useAssetProcessor.test.ts` |
| `UT-LIB-STATS-BREAKDOWN-01` | Verify calculatePlatformBreakdown aggregates totals and platform breakdowns | `src/__tests__/lib/formatters.test.ts` |
| `UT-LIB-PAYOUT-01` | Verify normalizeDateToUTC, calculatePayoutDerivedFields, bundled proportional split, and Google Sheet TSV parser | `src/__tests__/lib/payouts.test.ts` |
| `UT-API-PAYOUT-01` | Verify /api/payouts GET with rollups, POST create, PATCH update with recalculations, and DELETE | `src/__tests__/api/payouts.test.ts` |
| `UT-API-PAYOUT-BATCH-02` | Verify /api/payouts/batch create_many, delete, and bundle_withdraw operations | `src/__tests__/api/payouts.test.ts` |
| `UT-UI-PAYOUT-01` | Verify PayoutSummaryCards KPIs, PayoutTable filters/sorting/selection, PayoutEntryModal, and PayoutPasteModal | `src/__tests__/components/Payouts.test.tsx` |
| `UT-UI-PORTFOLIO-SEARCH-FIELD-01` | Verify PortfolioFilter searchField select dropdown, dynamic placeholder changes, and filter propagation | `src/__tests__/components/PortfolioFilter.test.tsx` |
| `UT-SERP-PARSE-01` | Verify universal TSV/CSV/JSON SERP clipboard parser with rank offset calculations | `src/__tests__/lib/serpPasteParser.test.ts` |
| `UT-API-SERP-01` | Verify /api/serp GET list and /api/serp/paste-sync portfolio asset matching and atomic SQLite persistence | `src/__tests__/api/serp.test.ts` |
| `UT-EXT-DOM-PARSER-01` | Verify Adobe Stock DOM selector extraction logic, lazy-load attributes, and multi-page global ranks on real HTML | `src/__tests__/extension/domParser.test.ts` |
| `UT-EXT-AUTHOR-ENRICH-01` | Verify Adobe Stock author detail regex extractor, human-mimicking jitter range bounds, and depth slices | `src/__tests__/extension/authorFetcher.test.ts` |
| `UT-EXT-STEALTH-NAV-01` | Verify stealth timing engine: watchdog constant, entry delay bounds, base jitter range, and smart linger detection | `src/__tests__/extension/stealthNavigator.test.ts` |
| `UT-SERP-DELTA-01` | Verify rank delta calculation against previous SerpQuery snapshots for same keyword & artwork | `src/__tests__/api/serp.test.ts` |
| `UT-API-SERP-ARTWORK-01` | Verify /api/serp/artwork/[id] returns chronological keyword ranks and correlated platform stats | `src/__tests__/api/serp.test.ts` |
| `UT-UI-SERP-TABLE-01` | Verify SerpTable rendering, keyword filter, delta badge colors, and drawer trigger | `src/__tests__/components/SerpComponents.test.tsx` |
| `UT-UI-SERP-PASTE-MODAL-01` | Verify SmartSerpPasteModal date selection, keyword auto-detect, and live matched preview | `src/__tests__/components/SerpComponents.test.tsx` |
| `UT-UI-SERP-ARTWORK-DRAWER-01` | Verify ArtworkSerpDrawer keyword pills, timeline points, backdrop dismissal, and snapshot delta table | `src/__tests__/components/SerpComponents.test.tsx` |
| `UT-UI-FULL-SERP-MODAL-01` | Verify FullSerpModal rendering, My Artwork filter toggle, accurate Unknown Author count, and backdrop click dismissal | `src/__tests__/components/SerpComponents.test.tsx` |
| `UT-SERP-RECONCILE-02` | Verify two-way auto-reconciliation across multi-platform asset IDs (asId, ssId, vzId) on paste-sync and proactive GET query triggers | `src/__tests__/api/serp.test.ts` |
| `UT-LIB-BACKUP-01` | Verify debounced auto-backup scheduler, dirty-flag state, timer coalescing, and clean cancellation | `src/__tests__/lib/dbBackup.test.ts` |
| `UT-EXT-CONTRIBUTOR-DOM-01` | Verify Adobe Contributor DOM parsing: extracting title, asId from thumbnail URL, and downloads count | `src/__tests__/extension/contributorDomParser.test.ts` |
| `UT-API-PORTFOLIO-SYNC-ID-01` | Verify /api/portfolio/paste-sync title matching (exact + normalized), asId assignment, downloads sync, and backup trigger | `src/__tests__/api/portfolio_paste_sync.test.ts` |
| `UT-API-PORTFOLIO-FUZZY-SYNC-01` | Verify /api/portfolio/paste-sync 3-tier matching: exact auto-match, fuzzy candidate suggestion (>= 70%), and manual link confirmation | `src/__tests__/api/portfolio_paste_sync.test.ts` |
| `UT-UI-PORTFOLIO-SYNC-MODAL-01` | Verify SmartIdPasteModal rendering, live clipboard parsing, match preview table, and bulk submission | `src/__tests__/components/PortfolioSyncModal.test.tsx` |
| `UT-UI-PORTFOLIO-MANUAL-LINK-01` | Verify SmartIdPasteModal review confirmation and manual DB artwork search and 1-click binding | `src/__tests__/components/PortfolioSyncModal.test.tsx` |
| `UT-API-PF-FILTER-ID-01` | Verify /api/portfolio idStatus query filtering for platform IDs (Adobe, Shutterstock, Vecteezy) and image file presence | `src/__tests__/api/portfolio.test.ts` |
| `UT-UI-PORTFOLIO-FILTER-ID-01` | Verify PortfolioFilter idStatus dropdown rendering, value selection, and filter change propagation | `src/__tests__/components/PortfolioFilter.test.tsx` |
| `UT-API-IMG-CACHE-01` | Verify /api/image dynamic ETag generation, conditional 304 Not Modified, and no-cache revalidation headers | `src/__tests__/api/image.test.ts` |
| `UT-LIB-FORMATTERS-02` | Verify getImageUrl URI encoding, fallback handling, timestamp cache-busting, and getTodayDateString | `src/__tests__/lib/formatters.test.ts` |
| `UT-LIB-STORAGE-01` | Verify inferImageExtension, saveImageFile sanitization/directory creation, and deleteOldImageFile safe unlinking | `src/__tests__/lib/fileStorage.test.ts` |





## E2E Tests
| Test ID | Description | Target |
|---------|-------------|--------|
| `E2E-UPL-01` | Happy path: Upload, auto-pair, gen metadata, save EXIF | `e2e/upload.spec.ts` |
| `E2E-UPL-02` | Keyword Suggestion: Portfolio reference search, scoping, tag selection, copy, and non-destructive injection | `e2e/upload.spec.ts` |
| `E2E-UPL-03` | Upload Queue Persistence: Verify dropped files and edited metadata persist across page reloads | `e2e/upload.spec.ts` |
| `E2E-PF-01` | Happy path: Portfolio rendering, filtering, sorting, pagination, and download update | `e2e/portfolio.spec.ts` |
| `E2E-PF-02` | Verify Image Code auto-suggest, duplicate validation, and image deletion with confirm modal | `e2e/portfolio.spec.ts` |
| `E2E-PF-03` | Verify Sync Adobe IDs button opens SmartIdPasteModal, accepts clipboard TSV, and validates modal controls | `e2e/portfolio.spec.ts` |
| `E2E-SALES-01` | Verify logging sales transactions, summary KPI metrics, and portfolio breakdown reflections | `e2e/sales.spec.ts` |
| `E2E-SALES-02` | Verify opening Smart Paste modal, real-time live stats, preview header, and submission | `e2e/sales.spec.ts` |
| `E2E-SALES-03` | Verify Unlinked artwork filter button and sales table pagination controls | `e2e/sales.spec.ts` |
| `E2E-SALES-04` | Verify multi-row selection, select-all checkbox, floating action bar, and BulkDateModal | `e2e/sales.spec.ts` |
| `E2E-KW-01` | Keyword Insights: Page navigation, KPI summary cards, table sorting, tier filtering, bulk copy, and artwork inspection drawer | `e2e/keywords.spec.ts` |
| `E2E-COL-01` | Artwork Collections: Create from portfolio multi-select, view card rollups, inspect Top-15 shared keywords, copy keywords, and delete collection | `e2e/collections.spec.ts` |
| `E2E-COL-02` | Collections Advanced Flow: Table/Grid view toggle, sort headers, detail view modes, tag drill-down filter & clear, and in-place pencil edit modal | `e2e/collections.spec.ts` |
| `E2E-PAYOUT-01` | Payouts & Withdrawals: Page navigation, summary KPI cards, table filters, open log payout modal, and Smart Paste importer | `e2e/payouts.spec.ts` |
| `E2E-PAYOUT-02` | Payout Creation & Table Reflection: Form input validation, create transaction, DB commit, and table row render | `e2e/payouts.spec.ts` |
| `E2E-SERP-01` | Asset Rankings & SERP Telemetry: Page navigation, summary KPI cards, searchable keyword combobox, FullSerpModal with My Artwork filter, and ArtworkSerpDrawer backdrop dismissal | `e2e/serp.spec.ts` |



