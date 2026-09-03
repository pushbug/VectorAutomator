import fs from 'fs';
import path from 'path';
import { checkpointDatabase } from './dbBackup';

interface WatchdogState {
  bootTime: number;
  lastHeartbeat: number;
  activeTabs: Set<string>;
  timerStarted: boolean;
  gracePeriodMs: number;
  inactivityThresholdMs: number;
}

const globalForWatchdog = globalThis as unknown as {
  __watchdogState?: WatchdogState;
};

const PID_FILE_PATH = path.resolve(process.cwd(), '.server.pid');

function getWatchdogState(): WatchdogState {
  if (!globalForWatchdog.__watchdogState) {
    const now = Date.now();
    globalForWatchdog.__watchdogState = {
      bootTime: now,
      lastHeartbeat: now,
      activeTabs: new Set<string>(),
      timerStarted: false,
      gracePeriodMs: 60_000, // 60s boot grace period
      inactivityThresholdMs: 25_000, // 25s inactivity threshold
    };
  }
  return globalForWatchdog.__watchdogState;
}

/**
 * Register incoming client heartbeat from an active window or browser tab.
 */
export function registerHeartbeat(tabId?: string): { activeTabsCount: number; lastHeartbeat: number } {
  const state = getWatchdogState();
  state.lastHeartbeat = Date.now();
  if (tabId) {
    state.activeTabs.add(tabId);
  }
  initWatchdog();
  return {
    activeTabsCount: state.activeTabs.size,
    lastHeartbeat: state.lastHeartbeat,
  };
}

/**
 * Unregister a closing tab or window beacon.
 */
export function unregisterTab(tabId: string): void {
  const state = getWatchdogState();
  state.activeTabs.delete(tabId);
  state.lastHeartbeat = Date.now();
}

/**
 * Retrieve current watchdog telemetry status.
 */
export function getWatchdogStatus(): {
  bootTime: number;
  lastHeartbeat: number;
  activeTabsCount: number;
  timeSinceLastHeartbeat: number;
  isGracePeriod: boolean;
} {
  const state = getWatchdogState();
  const now = Date.now();
  return {
    bootTime: state.bootTime,
    lastHeartbeat: state.lastHeartbeat,
    activeTabsCount: state.activeTabs.size,
    timeSinceLastHeartbeat: now - state.lastHeartbeat,
    isGracePeriod: now - state.bootTime < state.gracePeriodMs,
  };
}

/**
 * Safely checkpoints SQLite WAL and shuts down the process.
 */
export async function shutdownServer(reason: string = 'manual'): Promise<boolean> {
  try {
    // 1. Commit all SQLite WAL frames to dev.db
    checkpointDatabase(undefined, 'TRUNCATE');

    // 2. Remove .server.pid
    if (fs.existsSync(PID_FILE_PATH)) {
      try {
        fs.unlinkSync(PID_FILE_PATH);
      } catch {
        // Ignore unlink error during shutdown
      }
    }

    // 3. Terminate process (disabled during test suite)
    if (process.env.NODE_ENV !== 'test') {
      setTimeout(() => {
        process.exit(0);
      }, 200);
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * Periodic watchdog check evaluating inactivity.
 */
export function checkWatchdog(): boolean {
  const state = getWatchdogState();
  const now = Date.now();

  // Test mode safety guard
  if (process.env.NODE_ENV === 'test') {
    return false;
  }

  // Boot grace period active
  if (now - state.bootTime < state.gracePeriodMs) {
    return false;
  }

  // Inactivity threshold exceeded
  if (now - state.lastHeartbeat > state.inactivityThresholdMs) {
    console.log(
      `[Watchdog] No active client windows/tabs detected for ${Math.round(
        (now - state.lastHeartbeat) / 1000
      )}s. Auto-shutting down to free port.`
    );
    shutdownServer('auto_shutdown_inactivity');
    return true;
  }

  return false;
}

/**
 * Initialize background interval timer.
 */
export function initWatchdog(): void {
  const state = getWatchdogState();
  if (state.timerStarted || process.env.NODE_ENV === 'test') {
    return;
  }
  state.timerStarted = true;
  const timer = setInterval(() => {
    checkWatchdog();
  }, 5000);
  if (timer.unref) {
    timer.unref(); // Prevent timer from keeping node event loop artificially open
  }
}
