# Test Selectors

Always use `data-testid` for element selection in E2E tests.

| Selector | Description |
|----------|-------------|
| `dropzone-input` | The hidden input for dropping/selecting files |
| `asset-queue-item-{id}` | A specific asset item in the queue (e.g. `asset-queue-item-img1`) |
| `metadata-title-input` | The textarea for editing title |
| `metadata-keywords-input` | The textarea for editing keywords |
| `save-metadata-btn` | The button to save metadata and embed EXIF |
| `download-eps-btn` | The button to download processed EPS |
| `download-jpg-btn` | The button to download processed JPG |
| `portfolio-search-input` | The search input field in the portfolio dashboard |
| `portfolio-search-field-select` | The dropdown select to scope search (all, title, keywords, code, ids) in portfolio dashboard |
| `portfolio-search-clear-btn` | The clear button to reset the search input in portfolio dashboard |
| `portfolio-sort-select` | The dropdown to select sort order in the portfolio dashboard |
| `portfolio-grid-item` | An individual image card in the portfolio grid |
| `portfolio-detail-panel` | The side panel showing selected image details |
| `portfolio-update-btn` | The button to save manual updates to downloads |
| `portfolio-date-picker-trigger` | The button/input triggering the date range picker popover |
| `portfolio-date-picker-popover` | The date range picker popover dialog |
| `portfolio-date-clear-btn` | The clear button to reset date range |
| `calendar-done-btn` | The done/apply button in the calendar popover |
| `portfolio-add-btn` | The button in header to open Add Image drawer |
| `portfolio-add-drawer` | The slide-over drawer modal for adding image |
| `portfolio-add-file-input` | The file input inside the add image drawer |
| `portfolio-add-date-picker-trigger` | The date picker trigger inside the add image drawer |
| `portfolio-add-date-picker-popover` | The date picker popover calendar inside the add image drawer |
| `portfolio-add-title-input` | The title input inside the add image drawer |
| `portfolio-add-keywords-input` | The keywords textarea inside the add image drawer |
| `portfolio-add-submit-btn` | The submit button inside the add image drawer |
| `portfolio-add-close-btn` | The close button inside the add image drawer |
| `portfolio-detail-upload-date` | The upload date display text inside portfolio detail panel |
| `portfolio-add-code-input` | The image code input field inside the add image drawer |
| `portfolio-detail-code` | The image code badge inside the portfolio detail panel |
| `portfolio-delete-btn` | The button to trigger delete confirmation in portfolio detail |
| `portfolio-detail-edit-btn` | The button in portfolio detail header to trigger edit image drawer |
| `delete-confirm-dialog` | The modal dialog asking for confirmation before deleting |
| `delete-confirm-btn` | The confirmation button inside delete modal |
| `delete-cancel-btn` | The cancel button inside delete modal |
| `portfolio-detail-log-sale-btn` | The button in portfolio detail to trigger log sale drawer |
| `portfolio-summary-bar` | Summary bar container displaying total artworks, downloads, and revenue in Portfolio |
| `portfolio-summary-count` | Total artworks count text inside portfolio summary bar |
| `portfolio-summary-downloads` | Total downloads count text inside portfolio summary bar |
| `portfolio-summary-earnings` | Total revenue amount text inside portfolio summary bar |
| `sales-kpi-total-earnings` | The KPI card display for total earnings |
| `sales-kpi-total-downloads` | The KPI card display for total downloads |
| `sales-kpi-top-platform` | The KPI card display for top performing platform |
| `sales-kpi-avg-download` | The KPI card display for average earnings per download |

| `sales-add-sale-btn` | The button in sales page header to open log sale drawer |
| `sales-form-drawer` | The slide-over drawer modal for logging a sale |
| `sales-form-image-select` | The image picker/search input in sales drawer |
| `sales-form-platform-select` | The platform select dropdown in sales drawer |
| `sales-form-downloads-input` | The downloads count input in sales drawer |
| `sales-form-earnings-input` | The earnings amount input in sales drawer |
| `sales-form-date-input` | The date picker trigger in sales drawer |
| `sales-form-submit-btn` | The submit button in sales drawer |
| `sales-form-close-btn` | The close button in sales drawer |
| `sales-table` | The table displaying sales history log |
| `sales-row-delete-btn` | The button to delete a specific sales log entry |
| `portfolio-add-category-input` | The Category input field in Add Image drawer |
| `portfolio-add-tags-input` | The Tags input field in Add Image drawer |
| `portfolio-add-notes-input` | The Notes textarea in Add Image drawer |
| `portfolio-add-ssid-input` | The Shutterstock Asset ID input in Add Image drawer |
| `portfolio-add-asid-input` | The Adobe Stock Asset ID input in Add Image drawer |
| `portfolio-add-vzid-input` | The Vecteezy Asset ID input in Add Image drawer |
| `portfolio-detail-title` | The full title text container inside portfolio detail panel |
| `portfolio-detail-keywords` | The keywords text container inside portfolio detail panel |
| `portfolio-detail-category` | The category text container inside portfolio detail panel |
| `portfolio-detail-tags` | The tags text container inside portfolio detail panel |
| `portfolio-detail-notes` | The notes text container inside portfolio detail panel |
| `single-calendar-month-btn` | Header button to toggle month grid view mode |
| `single-calendar-year-btn` | Header button to toggle year grid view mode |
| `single-calendar-month-{idx}` | Specific month select button in month grid |
| `single-calendar-year-{year}` | Specific year select button in year grid |
| `single-calendar-day-{dateStr}` | Specific day select button in day grid |
| `range-calendar-month-btn` | Left month header button to toggle month grid view in DateRangePicker |
| `range-calendar-year-btn` | Left year header button to toggle year grid view in DateRangePicker |
| `range-calendar-month-{idx}` | Specific month select button in DateRangePicker month grid |
| `range-calendar-year-{year}` | Specific year select button in DateRangePicker year grid |
| `portfolio-page-input` | Numeric jump-to-page input field in Portfolio grid pagination |
| `sales-smart-paste-btn` | Header button to open Smart Paste stock data modal |
| `smart-paste-modal` | Modal dialog for pasting and previewing stock statement |
| `smart-paste-close-btn` | Close button inside Smart Paste modal |
| `smart-paste-textarea` | Textarea for pasting contributor clipboard table |
| `smart-paste-parse-btn` | Button to parse and match pasted data |
| `smart-paste-submit-btn` | Button to confirm and sync matched items to database |
| `asset-select-checkbox-{id}` | Checkbox button in AssetQueue card to toggle selection for portfolio import |
| `asset-select-all-btn` | Button in AssetQueue header to toggle select all / deselect all |
| `batch-import-portfolio-btn` | Header button in Process & Upload page to batch import selected assets to portfolio |
| `dash-kpi-total-vectors` | Total vectors KPI summary card in Overview Dashboard |
| `dash-kpi-monthly-vectors` | Monthly vector output KPI summary card in Overview Dashboard |
| `dash-kpi-total-downloads` | Total downloads KPI summary card in Overview Dashboard |
| `dash-kpi-month-earnings` | Current month earnings KPI summary card in Overview Dashboard |
| `dash-action-upload` | Quick launch link to Process & Upload module |
| `dash-action-portfolio` | Quick launch link to Portfolio module |
| `dash-action-sales` | Quick launch link to Sales & Earnings module |
| `dash-recent-item-{id}` | Recent vector item row in Dashboard activity grid |
| `dash-top-item-{id}` | Top performing vector item row in Dashboard activity grid |
| `portfolio-copy-title-btn` | Button next to Title in Portfolio Detail to copy title text |
| `portfolio-copy-keywords-btn` | Button next to Keywords in Portfolio Detail to copy keywords text |
| `portfolio-copy-platform-id-{platform}-btn` | Button next to Platform badge in Portfolio Detail to copy platform asset ID |
| `keyword-suggest-search-field-select` | Search scope dropdown select (All / Title & Keywords / Code & IDs) in KeywordSuggester |
| `keyword-suggest-search-input` | Search input in KeywordSuggester panel |
| `keyword-suggest-search-clear-btn` | Clear button for search input in KeywordSuggester |
| `keyword-suggest-sort-select` | Sort dropdown select (Newest / Top Downloads) in KeywordSuggester |
| `keyword-suggest-image-card-{id}` | Reference image card in KeywordSuggester grid |
| `keyword-suggest-select-all-images-btn` | Select all reference images button in KeywordSuggester |
| `keyword-suggest-clear-images-btn` | Clear selected reference images button in KeywordSuggester |
| `keyword-suggest-tag-{keyword}` | Individual keyword tag pill button in KeywordSuggester (1-click cart add/remove toggle) |
| `keyword-suggest-tag-checkbox-{keyword}` | Checkbox button on keyword tag pill in KeywordSuggester (batch inclusion toggle) |
| `keyword-suggest-tag-container-{keyword}` | Outer container for dual-action keyword tag pill |
| `keyword-suggest-sort-score-btn` | Button in Suggested Keywords header to sort by Composite Score |
| `keyword-suggest-sort-downloads-btn` | Button in Suggested Keywords header to sort by Total Downloads |
| `keyword-suggest-sort-earnings-btn` | Button in Suggested Keywords header to sort by Total Earnings ($) |
| `keyword-suggest-sort-alpha-btn` | Button in Suggested Keywords header to sort Alphabetically (A-Z) |
| `keyword-suggest-select-all-tags-btn` | Select all suggested keyword tags button |
| `keyword-suggest-clear-tags-btn` | Deselect all suggested keyword tags button |
| `keyword-suggest-copy-tags-btn` | Button in KeywordSuggester footer to copy selected keywords to clipboard |
| `keyword-suggest-header-copy-btn` | Button in KeywordSuggester header to copy selected keywords to clipboard |
| `keyword-suggest-apply-btn` | Button to inject selected keywords into active asset in MetadataEditor |
| `metadata-keyword-limit-warning` | Warning badge/text in MetadataEditor when keywords count exceeds 50 |
| `metadata-keywords-sort-orig-btn` | Button in MetadataEditor to sort keywords by original entry order |
| `metadata-keywords-sort-dl-btn` | Button in MetadataEditor to sort keywords by total downloads descending |
| `metadata-keywords-sort-rev-btn` | Button in MetadataEditor to sort keywords by total earnings ($) descending |
| `metadata-keywords-sort-alpha-btn` | Button in MetadataEditor to sort keywords alphabetically (A-Z) |
| `metadata-keyword-row-{keyword}` | Individual numbered keyword row in MetadataEditor (#1 - #50) |
| `metadata-keyword-remove-btn-{keyword}` | Button to remove specific keyword in MetadataEditor |
| `metadata-title-input` | Textarea for editing vector title in MetadataEditor |
| `metadata-title-error` | Validation error message displayed under title input when saving without title |
| `smart-paste-date-input` | Date input / trigger for statement date in Smart Paste modal |
| `smart-paste-platform-{platform}` | Platform select button inside Smart Paste modal toolbar |
| `smart-paste-unlinked-badge` | Status badge indicating an unmatched unlinked sales record |
| `smart-paste-summary-date` | Statement date display text in Smart Paste preview summary header |
| `smart-paste-summary-revenue` | Total revenue display text in Smart Paste preview summary header |
| `smart-paste-live-stats` | Real-time detected items count and estimated revenue badge in Smart Paste input view |
| `smart-paste-duplicate-warning` | Warning banner in Smart Paste preview indicating existing sales records on target date |
| `smart-paste-clear-btn` | Button to clear textarea text and reset stats in Smart Paste modal |



| `sales-date-picker-trigger` | Button/input triggering the date range picker popover in Sales page |
| `sales-table-artwork-btn-{id}` | Clickable artwork trigger button/area in sales table row |
| `sales-sort-date-btn` | Button in SalesTable header to sort by Date |
| `sales-sort-image-btn` | Button in SalesTable header to sort by Image |
| `sales-sort-platform-btn` | Button in SalesTable header to sort by Platform |
| `sales-sort-downloads-btn` | Button in SalesTable header to sort by Downloads count |
| `sales-sort-earnings-btn` | Button in SalesTable header to sort by Earnings amount |
| `sales-image-hover-preview` | Floating enlarged image preview popover on thumbnail hover |
| `sales-row-menu-btn-{id}` | Button to open 3-dots action dropdown menu in sales table row |
| `sales-row-menu-dropdown-{id}` | Dropdown menu container with Preview and Delete actions |
| `sales-row-preview-btn-{id}` | Preview action button inside row dropdown menu |
| `sales-row-delete-btn-{id}` | Delete action button inside row dropdown menu |
| `sales-pagination-prev-btn` | Button to navigate to previous page in SalesTable |
| `sales-pagination-next-btn` | Button to navigate to next page in SalesTable |
| `sales-pagination-page-input` | Number input for direct page jump in SalesTable |
| `sales-platform-filter-{platform}` | Platform filter button in SalesTable toolbar (all, Shutterstock, Adobe Stock, Vecteezy, unlinked) |
| `sales-select-all-checkbox` | Checkbox in table header to toggle selection of all items on current page |
| `sales-row-checkbox-{id}` | Checkbox in sales table row to toggle individual row selection |
| `sales-bulk-action-bar` | Floating action toolbar displayed when one or more sales rows are selected |
| `sales-bulk-delete-btn` | Button in floating bulk action bar to delete selected sales records |
| `sales-bulk-date-btn` | Button in floating bulk action bar to open bulk change date modal |
| `sales-bulk-date-modal` | Modal dialog for picking new date for batch update |
| `sales-bulk-date-input` | Date picker component inside bulk date modal |
| `sales-bulk-date-confirm-btn` | Button to confirm applying new date to selected records |
| `sales-bulk-date-cancel-btn` | Button to cancel bulk date update modal |
| `sales-bulk-date-close-btn` | Close button inside bulk date modal header |
| `keyword-kpi-total-keywords` | Total unique keywords KPI summary card in Keyword Insights |
| `keyword-kpi-tagged-assets` | Total tagged artworks KPI summary card in Keyword Insights |
| `keyword-kpi-top-earning` | Top earning keyword KPI summary card in Keyword Insights |
| `keyword-kpi-top-downloads` | Top downloaded keyword KPI summary card in Keyword Insights |
| `keyword-search-input` | Search input field in KeywordTable toolbar |
| `keyword-search-clear-btn` | Clear button for search input in KeywordTable |
| `keyword-filter-tier-{tier}` | Tier filter button in KeywordTable toolbar (all, draw_more, star, workhorse, dormant, untested) |
| `keyword-time-range-{range}` | Time range velocity filter button in KeywordTable toolbar (all, 30d, 90d, 1y) |
| `keyword-table` | Data table container displaying keyword performance metrics |
| `keyword-select-all-checkbox` | Header checkbox to toggle selection of all keywords on page |
| `keyword-row-checkbox-{keyword}` | Checkbox in table row to select an individual keyword |
| `keyword-tier-badge-{keyword}` | Tier status badge (Draw More, Star, Workhorse, Dormant, Untested) for a keyword |
| `keyword-sort-frequency-btn` | Header button to sort by Assets / Frequency count |
| `keyword-sort-downloads-btn` | Header button to sort by Total Downloads |
| `keyword-sort-earnings-btn` | Header button to sort by Total Earnings |
| `keyword-sort-rpi-btn` | Header button to sort by Revenue Per Image ($/image) |
| `keyword-sort-rpd-btn` | Header button to sort by Revenue Per Download ($/download) |
| `keyword-row-inspect-btn-{keyword}` | Button in row to open KeywordDetailDrawer slide-over |
| `keyword-bulk-copy-btn` | Button in floating bulk action bar to copy selected keywords to clipboard |
| `keyword-detail-drawer` | Slide-over drawer displaying portfolio artworks matching selected keyword |
| `keyword-detail-close-btn` | Close button inside KeywordDetailDrawer header |
| `keyword-drawer-winning-tags` | Container card in drawer header displaying top co-occurring winning tags |
| `keyword-drawer-copy-recipe-btn` | Button in drawer header to copy winning tag recipe to clipboard |
| `keyword-guide-btn` | Header button in Keyword Insights page to open Guidelines modal |
| `keyword-guide-modal` | Modal dialog explaining keyword performance tiers, velocity, and metrics |
| `keyword-guide-close-btn` | Close button inside Guidelines modal header |
| `keyword-guide-got-it-btn` | Action button in Guidelines modal footer to close dialog |
| `portfolio-checkbox-{id}` | Multi-select checkbox on individual portfolio grid card |
| `portfolio-floating-toolbar` | Floating action toolbar for portfolio multi-selection |
| `portfolio-create-collection-btn` | Button in floating toolbar to open Create Collection modal |
| `portfolio-add-to-collection-btn` | Button in floating toolbar to open Add to Collection modal |
| `portfolio-clear-selection-btn` | Button in floating toolbar to clear all selected images |
| `collection-card-{id}` | Collection card container in collections overview grid |
| `collection-card-cover-{id}` | Cover image link container on collection card |
| `collection-card-title-{id}` | Title heading on collection card |
| `collection-card-downloads-{id}` | Total downloads metric display on collection card |
| `collection-card-earnings-{id}` | Total revenue metric display on collection card |
| `collection-card-rpi-{id}` | Average RPI metric display on collection card |
| `collection-add-btn` | Header button in Collections page to create a new collection |
| `collection-search-input` | Search input field in Collections page toolbar |
| `collection-sort-select` | Sort select dropdown in Collections page toolbar |
| `collection-view-grid-btn` | Button in Collections toolbar to switch to Grid Cards view mode |
| `collection-view-table-btn` | Button in Collections toolbar to switch to Table List view mode |
| `collection-table` | Table view container on Collections page |
| `collection-table-row-{id}` | Individual collection row in CollectionTable |
| `collection-sort-header-{column}` | Interactive sortable column header button in CollectionTable |
| `collection-table-edit-btn-{id}` | Edit action button inside CollectionTable row |
| `collection-table-delete-btn-{id}` | Delete action button inside CollectionTable row |
| `collection-pagination-prev-btn` | Previous page button for Collections pagination |
| `collection-pagination-next-btn` | Next page button for Collections pagination |
| `collection-pagination-page-input` | Jump to page input in Collections PaginationCapsule |
| `collection-detail-title` | Header title in Collection detail view |
| `collection-detail-description` | Description text in Collection detail view |
| `collection-detail-back-btn` | Back button in Collection detail header |
| `collection-detail-delete-btn` | Delete button in Collection detail header |
| `collection-top-keywords-bar` | Top shared keywords container bar in Collection detail |
| `collection-top-keyword-tag-{keyword}` | Individual shared keyword chip in TopSharedKeywordsBar |
| `collection-copy-top-keywords-btn` | Button to copy all top shared keywords to clipboard |
| `collection-keywords-view-freq-btn` | Button in TopSharedKeywordsBar to sort and view keywords by Frequency |
| `collection-keywords-view-dl-btn` | Button in TopSharedKeywordsBar to sort and view keywords by Downloads |
| `collection-keywords-view-rev-btn` | Button in TopSharedKeywordsBar to sort and view keywords by Revenue |
| `collection-keyword-filter-badge` | Active keyword filter pill indicator above collection artwork grid |
| `collection-keyword-filter-clear-btn` | Clear button inside active keyword filter indicator |
| `collection-artwork-item` | Artwork card inside Collection detail image grid |
| `collection-item-remove-btn-{id}` | Button to remove an artwork item from the collection |
| `collection-set-cover-btn-{id}` | Button to set artwork item as the collection cover image |
| `collection-edit-btn` | Edit button in Collection detail header next to title |
| `create-collection-modal` | Modal dialog for creating a new collection |
| `create-collection-name-input` | Name input field inside Create Collection modal |
| `create-collection-description-input` | Description textarea inside Create Collection modal |
| `create-collection-submit-btn` | Submit button inside Create Collection modal |
| `create-collection-close-btn` | Close button inside Create Collection modal header |
| `edit-collection-modal` | Modal dialog for editing an existing collection |
| `edit-collection-name-input` | Name input field inside Edit Collection modal |
| `edit-collection-description-input` | Description textarea inside Edit Collection modal |
| `edit-collection-submit-btn` | Submit button inside Edit Collection modal |
| `edit-collection-close-btn` | Close button inside Edit Collection modal header |
| `add-to-collection-modal` | Modal dialog for adding selected artworks to an existing collection |
| `add-to-collection-select` | Destination collection select dropdown in Add to Collection modal |
| `add-to-collection-submit-btn` | Submit button inside Add to Collection modal |
| `payout-kpi-realized-thb` | The KPI card display for total realized net income (THB) in Payouts |
| `payout-kpi-holding-usd` | The KPI card display for total USD holding in payment platforms in Payouts |
| `payout-kpi-total-fees` | The KPI card display for total platform fees in Payouts |
| `payout-kpi-total-transactions` | The KPI card display for total recorded payout withdrawals count in Payouts |
| `payout-table` | The table container for payout transactions |
| `payout-year-filter` | The year segmented pills container for filtering payouts by tax year |
| `payout-stock-filter` | The stock agency dropdown select in Payouts table |
| `payout-add-btn` | The button in Payouts header to open Log Payout modal |
| `payout-paste-btn` | The button in Payouts header to open Smart Paste from Google Sheet modal |
| `payout-batch-withdraw-btn` | The button in multi-selection action bar to open Bundled Bank Withdrawal modal |
| `payout-entry-modal` | The modal dialog for logging or editing a single payout transaction |
| `payout-paste-modal` | The modal dialog for smart TSV pasting from Google Sheet |
| `payout-batch-modal` | The modal dialog for bundled bank withdrawal with proportional THB split |
| `payout-submit-btn` | The primary submit button inside payout modals |
| `payout-input-stock-name` | Stock Agency dropdown select inside PayoutEntryModal |
| `payout-input-withdraw-date` | Withdraw Date input inside PayoutEntryModal |
| `payout-input-stock-amount` | Stock USD Amount input inside PayoutEntryModal |
| `payout-input-notes` | Notes / Remarks input inside PayoutEntryModal |
| `extension-copy-tsv-btn` | Button in Stock SERP Copier popup to copy TSV table to clipboard |
| `extension-download-csv-btn` | Button in Stock SERP Copier popup to download CSV file |
| `extension-copy-json-btn` | Button in Stock SERP Copier popup to copy JSON data to clipboard |
| `extension-depth-none` | Segmented button in extension popup for Instant depth (no author) |
| `extension-depth-top10` | Segmented button in extension popup for Top 10 author depth |
| `extension-depth-top20` | Segmented button in extension popup for Top 20 author depth |
| `extension-depth-all` | Segmented button in extension popup for All 100 author depth |
| `extension-fetch-btn` | Trigger button to start sequential author fetching |
| `extension-cancel-btn` | Stop/cancel button for author fetching queue |
| `extension-progress-bar` | Live progress bar container during author fetching |
| `extension-toggle-urls` | Checkbox toggle to include/exclude URL columns in TSV/CSV export |
| `serp-paste-btn` | Button in SERP page header to open Smart Paste SERP modal |
| `serp-smart-paste-modal` | Modal dialog for pasting and previewing SERP search ranking results |
| `serp-smart-paste-textarea` | Textarea for pasting TSV/CSV SERP clipboard data |
| `serp-smart-paste-date-picker` | Date picker trigger inside Smart Paste SERP modal |
| `serp-smart-paste-submit-btn` | Confirm button inside Smart Paste SERP modal |
| `serp-table` | Table container displaying ranked portfolio artworks |
| `serp-kpi-keywords` | KPI card display for total tracked keywords count |
| `serp-kpi-page1-artworks` | KPI card display for total portfolio artworks on Page 1 |
| `serp-kpi-top10` | KPI card display for total portfolio artworks in Top 10 |
| `serp-kpi-best-rank` | KPI card display for highest ranking position |
| `artwork-serp-drawer` | Slide-over inspector drawer for artwork keyword & sales correlation |
| `full-serp-modal` | Modal dialog displaying full 100-item SERP search results & competitor author leaderboard |
| `quick-import-dialog` | Modal dialog for creating placeholder artwork during Adobe ID paste sync |
| `quick-import-date-picker-trigger` | Date picker input trigger inside Quick Import dialog |
| `quick-import-date-picker-popover` | Date picker popover calendar inside Quick Import dialog |
| `quick-import-code-input` | YYMM-Seq image code input field inside Quick Import dialog |
| `quick-import-title-input` | Title textarea inside Quick Import dialog |
| `quick-import-keywords-input` | Keywords textarea inside Quick Import dialog |
| `quick-import-category-input` | Category input field inside Quick Import dialog |
| `confirm-quick-import-btn` | Confirm and import button inside Quick Import dialog |
| `cancel-quick-import-btn` | Cancel button inside Quick Import dialog |
| `portfolio-id-status-select` | The dropdown select to filter by platform ID status and image file status in portfolio dashboard |
| `portfolio-image-placeholder` | Graceful placeholder box rendered when artwork image is missing or corrupt in Portfolio grid |
| `portfolio-detail-image-placeholder` | Graceful placeholder box rendered when artwork image is missing or corrupt in Portfolio detail |
| `portfolio-sync-files-btn` | Button in Portfolio to trigger scanning and linking of physical upload files to database |












