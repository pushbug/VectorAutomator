# Payouts & Withdrawals Tracking Feature

## 1. Overview
The Payouts & Withdrawals module manages the full financial lifecycle of microstock earnings, tracking fund flows from Stock Agency payouts (gross USD) to intermediate platform wallets (Payoneer / PayPal), currency conversions (FX rates & fees), and final deposits into Thai bank accounts (net THB).

## 2. Core Concepts
- **3-Stage Lifecycle & Statuses:**
  - `pending`: Stock payout initiated/requested; awaiting arrival in payment platform wallet.
  - `in_platform`: Funds received in Payoneer / PayPal; held as USD balance.
  - `completed`: Funds transferred to Thai bank account with realized exchange rate and net THB.
- **Auto-Calculations:**
  - `feeUsd` = `stockAmountUsd - platformAmountUsd` (intermediary and transfer fees).
  - 2-way currency derivation between `exchangeRate` and `netIncomeThb`.
  - `leadTimeDays` = duration between stock withdrawal and bank deposit.
  - `taxYear` = tax reporting year for Thai personal income tax (P.N.D. 90/91).
- **Bundled Bank Withdrawals:**
  - Allows combining multiple platform holdings (e.g. Adobe Stock + Vecteezy) into a single bank transfer with automatic proportional split of Net THB across items.

## 3. UI Components (`/payouts`)
1. **PayoutSummaryCards:**
   - Realized Net Income (฿ THB) - Green KPI card
   - Holding in Platform ($ USD) - Amber KPI card
   - Total Platform Fees ($ USD) - Red KPI card
   - Total Transactions (Items count) - Blue KPI card
2. **PayoutTable:**
   - Year Segmented switcher (`All`, `2026`, `2025`, `2024`, `2023`, etc.)
   - Stock Agency filter (`Adobe Stock`, `Shutterstock`, `Vecteezy`, `123RF`), search bar, and multi-row selection toolbar
   - Unified 2-line table headers (`bg-muted/10`) and text hierarchy (`text-foreground` primary values, `text-muted` secondary sub-dates)
   - 3-dots dropdown action menu (`MoreVertical`) for editing and deleting records
   - Inline `Holding` clock indicator on Thai Bank cell for unallocated pending withdrawals
3. **PayoutEntryModal:**
   - Create and edit dialog with step-by-step stage inputs, 2-way currency calculations, and default `Bangkok Bank (BBL)`
4. **PayoutPasteModal:**
   - Smart TSV paste importer to batch ingest Google Sheet rows in one click with live parsing preview and multi-space delimiter fallback
5. **PayoutBatchModal:**
   - Bundled transfer modal with live proportional THB distribution calculation

## 4. API Endpoints
- `GET /api/payouts`: Paginated list with multi-column filtering, sorting, and aggregate KPI rollups.
- `POST /api/payouts`: Create a single payout transaction with auto-derived metrics.
- `GET /api/payouts/[id]`: Fetch single transaction.
- `PATCH /api/payouts/[id]`: Update transaction with recalculated fields.
- `DELETE /api/payouts/[id]`: Delete transaction.
- `POST /api/payouts/batch`: Batch operations:
  - `create_many`: Batch create transactions from Google Sheet TSV.
  - `delete`: Bulk delete selected IDs.
  - `bundle_withdraw`: Apply bank transfer and proportional THB split across multiple records.
