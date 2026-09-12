# Microstock Auto-Pilot Design System

This document outlines the design tokens used in the application to ensure consistency across light and dark modes.

## Semantic Colors

We use semantic color names in our Tailwind classes to automatically adapt to the user's theme preference. 
These are defined in `src/app/globals.css` and can be used directly as Tailwind utilities (e.g., `bg-background`, `text-primary`, `border-border`).

### Core Backgrounds
- **background**: The main page background. (Light: `slate-50`, Dark: `slate-950`)
- **surface**: Card or container background. (Light: `white`, Dark: `slate-900`)
- **surface-hover**: Background for hovered items. (Light: `slate-100`, Dark: `slate-800`)

### Text Colors
- **foreground**: Primary text color. (Light: `slate-900`, Dark: `slate-100`)
- **muted**: Secondary, less important text. (Light: `slate-500`, Dark: `slate-400`)

### Borders
- **border**: Default border color for elements. (Light: `slate-200`, Dark: `slate-800`)

### Brand / Accents
- **primary**: Main brand color used for active states, buttons, links. (Light/Dark: `blue-500` / `blue-600`)
- **primary-foreground**: Text color on top of primary background (e.g., white text on blue button).
- **destructive**: Alert and error color used for destructive actions, validation errors. (Light/Dark: `red-600` / `red-500`)
- **destructive-foreground**: Text color on top of destructive background (white).

## Typography
- **Font**: Inter (sans-serif).

## Implementation in Tailwind v4
In Tailwind v4, we define these using the `@theme` directive in `globals.css` with CSS variables:

```css
:root {
  --background: var(--color-slate-50);
  --surface: #ffffff;
  --surface-hover: var(--color-slate-100);
  --foreground: var(--color-slate-900);
  --muted: var(--color-slate-500);
  --border: var(--color-slate-200);
  --primary: var(--color-blue-600);
  --primary-foreground: #ffffff;
  --destructive: var(--color-red-600);
  --destructive-foreground: #ffffff;
}

[data-theme="dark"] {
  --background: var(--color-slate-950);
  --surface: var(--color-slate-900);
  --surface-hover: var(--color-slate-800);
  --foreground: var(--color-slate-100);
  --muted: var(--color-slate-400);
  --border: var(--color-slate-800);
  --primary: var(--color-blue-500);
  --primary-foreground: #ffffff;
  --destructive: var(--color-red-500);
  --destructive-foreground: #ffffff;
}
```

Whenever adding a new UI element, always use semantic classes:
- Bad: `className="bg-white dark:bg-slate-900"`
- Good: `className="bg-surface"`

## Tailwind v4 Canonical Utility Classes

Always write modern canonical Tailwind v4 utilities. Never use legacy/deprecated aliases:

| Legacy / Deprecated / Redundant Arbitrary Class (Do NOT use) | Canonical Tailwind v4 Class (MUST use) |
|---|---|
| `flex-shrink-0` | `shrink-0` |
| `flex-shrink` | `shrink` |
| `flex-grow` | `grow` |
| `flex-grow-0` | `grow-0` |
| `overflow-clip` | `overflow-hidden` / `truncate` |
| `text-opacity-*`, `bg-opacity-*` | `text-*/80`, `bg-*/50` (slash opacity syntax) |
| `min-w-[200px]`, `w-[200px]`, `max-w-[200px]` | `min-w-50`, `w-50`, `max-w-50` (50 * 4px = 200px) |
| `min-w-[100px]`, `w-[100px]`, `max-w-[100px]` | `min-w-25`, `w-25`, `max-w-25` (25 * 4px = 100px) |
| `h-[16px]`, `w-[16px]`, `p-[16px]` | `h-4`, `w-4`, `p-4` (4 * 4px = 16px) |
| `h-[24px]`, `w-[24px]`, `p-[24px]` | `h-6`, `w-6`, `p-6` (6 * 4px = 24px) |
| `h-[32px]`, `w-[32px]`, `p-[32px]` | `h-8`, `w-8`, `p-8` (8 * 4px = 32px) |

## Server Process Lifecycle & Multi-Window Architecture

### Multi-Window Concurrency
- `VectorAutomator.app` launches on `http://localhost:3000`.
- Users can open concurrent sibling windows via the "New Window" action button (`sidebar-new-window-btn`) or `Cmd+Shift+N`.
- All open windows share the same singleton SQLite instance (`dev.db`) in WAL mode with zero data fragmentation.

### Watchdog Auto-Shutdown & Port Release
- **Client Heartbeat:** `<ServerHeartbeat />` in RootLayout emits a 5-second beacon (`POST /api/system/heartbeat`) and a `pagehide` disconnect beacon.
- **Server Watchdog:** `src/lib/serverWatchdog.ts` maintains a 60-second boot grace period and a 25-second inactivity threshold.
- **Auto-Shutdown:** If all browser tabs and desktop windows are closed for >25s, the watchdog executes `checkpointDatabase(undefined, 'TRUNCATE')`, unlinks `.server.pid`, and calls `process.exit(0)` to immediately release port 3000 for other development projects.
- **Explicit Exit:** Clicking "Quit App" (`sidebar-quit-app-btn`) triggers `POST /api/system/quit` for instant shutdown and port release.

### On-Demand Database Backup & Durability
- **Manual Trigger:** Clicking "Backup Now" (`sidebar-backup-btn`) triggers `POST /api/system/backup`.
- **Forced Flush:** The route executes `prisma.$queryRawUnsafe('PRAGMA wal_checkpoint(TRUNCATE);')` directly on the active Prisma connection to flush in-flight WAL frames into `dev.db`, then generates a compressed `.db.gz` snapshot (`force = true`) bypassing duplicate hash suppression.
- **UI Feedback:** Displays dynamic loading spinner, 3.5-second success/error indicator, and tooltip with the generated archive filename while disabling the button during execution.
