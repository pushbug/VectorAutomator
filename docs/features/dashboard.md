# Overview Dashboard & macOS Local Launcher

## 1. Overview
The Dashboard (`/`) serves as the central operational Cockpit for VectorAutomator. It provides the contributor with immediate visibility into key metrics upon starting the application, tracks monthly vector production goals, offers one-click module launchpads, and surfaces recent uploads alongside top-performing assets with fast keyword copying.

## 2. Architecture & Components

### 2.1 Backend: `GET /api/dashboard`
- Aggregates metrics concurrently using Prisma:
  - `totalVectors`: `prisma.image.count()`
  - `monthlyVectors`: Current month upload count
  - `pendingCount`: Pending queue items count
  - `totalDownloads`: Aggregate sum of all image downloads
  - `currentMonthEarnings`: Aggregate sum of monthly revenue from `PlatformStats`
  - `latestCode`: Most recent hierarchical sequence code (e.g. `2608-45`)
  - `monthlyGoal`: Target (default 50 vectors/mo), current count, progress percentage, and days remaining
  - `recentUploads`: Latest 5 records with thumbnails, code badges, and status
  - `topPerformers`: Top 5 records sorted by `totalDownloads` descending

### 2.2 Frontend Components (`src/components/dashboard/`)
- `DashboardHeader.tsx`: Greeting, live formatted date, and latest sequence code pill.
- `KpiCards.tsx`: 4 Bento KPI cards (Total Vectors, Monthly Output, Total Downloads, Month Earnings).
- `MonthlyGoalCard.tsx`: Visual progress bar tracking monthly vector output against target (50/month) with days-left countdown.
- `QuickActionHub.tsx`: 3 Primary workflow launch cards for Process & Upload, Portfolio, and Sales & Earnings.
- `ActivitySplitGrid.tsx`: Split widget for Recent Ingestion and Top Performers with 1-click clipboard keyword copy.

### 2.3 Standalone macOS Desktop Launcher
- `scripts/launch.sh`: Dynamically resolves Homebrew/NVM Node environment, starts Next.js background daemon with output piped to `.server.log`, polls port readiness, and launches Chrome/Edge in standalone app window mode (`--app=http://localhost:3000`).
- `scripts/generate-icon.sh`: Uses Swift AppKit to render a 1024x1024 Blue Squircle with white "V" glyph, generates a multi-resolution `.iconset` with `sips`, and compiles `applet.icns` via `iconutil`.
- `scripts/create-mac-app.sh`: Compiles `VectorAutomator.app` via `osacompile`, copies the standalone bundle to `~/Desktop/VectorAutomator.app`, applies the custom icon attribute via Cocoa `NSWorkspace.shared.setIcon`, and refreshes Finder/LaunchServices.

## 3. Testing
- `UT-API-DASH-01`: Unit test verifying `GET /api/dashboard` aggregations, zero-data safety, and error states (`src/__tests__/api/dashboard.test.ts`).
- `UT-UI-DASH-01`: Component test verifying Dashboard rendering, KPI values, goal pace calculation, and quick action routing (`src/__tests__/components/Dashboard.test.tsx`).
