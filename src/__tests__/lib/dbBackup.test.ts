import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
import {
  scheduleAutoBackup,
  getIsDbDirty,
  cancelScheduledBackup,
  createDbBackup,
  DEFAULT_BACKUP_DEBOUNCE_MS,
} from '@/lib/dbBackup';

describe('Database Auto-Backup Utility (UT-LIB-BACKUP-01)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    cancelScheduledBackup();
  });

  afterEach(() => {
    cancelScheduledBackup();
    vi.useRealTimers();
  });

  it('sets isDbDirty to true and coalesces rapid debounce timers', () => {
    expect(getIsDbDirty()).toBe(false);

    // First mutation
    scheduleAutoBackup(1000);
    expect(getIsDbDirty()).toBe(true);

    // Fast-forward 500ms and trigger second mutation
    vi.advanceTimersByTime(500);
    scheduleAutoBackup(1000);
    expect(getIsDbDirty()).toBe(true);

    // Fast-forward 600ms (1100ms total, but second timer needs 1000ms)
    vi.advanceTimersByTime(600);
    expect(getIsDbDirty()).toBe(true);

    // Fast-forward remaining 400ms to complete 1000ms from second schedule
    vi.advanceTimersByTime(400);
    expect(getIsDbDirty()).toBe(false);
  });

  it('cancelScheduledBackup resets timer and dirty state cleanly', () => {
    scheduleAutoBackup(5000);
    expect(getIsDbDirty()).toBe(true);

    cancelScheduledBackup();
    expect(getIsDbDirty()).toBe(false);

    vi.advanceTimersByTime(6000);
    expect(getIsDbDirty()).toBe(false);
  });

  it('DEFAULT_BACKUP_DEBOUNCE_MS is configured to 3 minutes', () => {
    expect(DEFAULT_BACKUP_DEBOUNCE_MS).toBe(3 * 60 * 1000);
  });
});
