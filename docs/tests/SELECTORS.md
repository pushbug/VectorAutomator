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
| `sales-kpi-total-earnings` | The KPI card display for total earnings |
| `sales-kpi-total-downloads` | The KPI card display for total downloads |
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


