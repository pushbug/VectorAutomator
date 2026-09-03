import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import Database from 'better-sqlite3';
import {
  scheduleAutoBackup,
  getIsDbDirty,
  cancelScheduledBackup,
  createDbBackup,
  checkpointDatabase,
  purgeOrphanSnapshots,
  restoreDbBackup,
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

  it('sets isDbDirty to true and coalesces rapid debounce timers', async () => {
    expect(getIsDbDirty()).toBe(false);

    // First mutation
    scheduleAutoBackup(1000);
    expect(getIsDbDirty()).toBe(true);

    // Fast-forward 500ms and trigger second mutation
    await vi.advanceTimersByTimeAsync(500);
    scheduleAutoBackup(1000);
    expect(getIsDbDirty()).toBe(true);

    // Fast-forward 600ms (1100ms total, but second timer needs 1000ms)
    await vi.advanceTimersByTimeAsync(600);
    expect(getIsDbDirty()).toBe(true);

    // Fast-forward remaining 400ms to complete 1000ms from second schedule
    await vi.advanceTimersByTimeAsync(400);
    expect(getIsDbDirty()).toBe(false);
  });

  it('cancelScheduledBackup resets timer and dirty state cleanly', async () => {
    scheduleAutoBackup(5000);
    expect(getIsDbDirty()).toBe(true);

    cancelScheduledBackup();
    expect(getIsDbDirty()).toBe(false);

    await vi.advanceTimersByTimeAsync(6000);
    expect(getIsDbDirty()).toBe(false);
  });

  it('DEFAULT_BACKUP_DEBOUNCE_MS is configured to 30 seconds', () => {
    expect(DEFAULT_BACKUP_DEBOUNCE_MS).toBe(30 * 1000);
  });
});

describe('Database WAL Checkpointing & Durability (UT-LIB-BACKUP-WAL-01)', () => {
  const testDbDir = path.resolve(process.cwd(), 'playground', 'test_durability_tmp');
  const testDbPath = path.join(testDbDir, 'mock_test.db');

  beforeEach(() => {
    if (!fs.existsSync(testDbDir)) {
      fs.mkdirSync(testDbDir, { recursive: true });
    }
  });

  afterEach(() => {
    if (fs.existsSync(testDbDir)) {
      fs.rmSync(testDbDir, { recursive: true, force: true });
    }
  });

  it('safely checkpoints a valid SQLite database in WAL mode', () => {
    const db = new Database(testDbPath);
    db.pragma('journal_mode = WAL');
    db.exec('CREATE TABLE items (id TEXT PRIMARY KEY, val TEXT);');
    db.exec("INSERT INTO items VALUES ('1', 'hello');");
    db.close();

    const success = checkpointDatabase(testDbPath);
    expect(success).toBe(true);

    const checkDb = new Database(testDbPath);
    const row = checkDb.prepare('SELECT val FROM items WHERE id = ?').get('1') as { val: string };
    expect(row.val).toBe('hello');
    checkDb.close();

    // Verify explicit PASSIVE and TRUNCATE modes
    const passiveSuccess = checkpointDatabase(testDbPath, 'PASSIVE');
    expect(passiveSuccess).toBe(true);

    const truncateSuccess = checkpointDatabase(testDbPath, 'TRUNCATE');
    expect(truncateSuccess).toBe(true);
  });

  it('returns false gracefully when database file does not exist', () => {
    const success = checkpointDatabase('/non/existent/path/db.sqlite');
    expect(success).toBe(false);
  });
});

describe('Orphan Snapshot Purging & Restore Synchronization (UT-LIB-BACKUP-PURGE-01, UT-LIB-BACKUP-RESTORE-01)', () => {
  const testDir = path.resolve(process.cwd(), 'playground', 'test_purge_tmp');

  beforeEach(() => {
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }
  });

  afterEach(() => {
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  it('purges orphaned temp_snapshot_* files from target directory', () => {
    fs.writeFileSync(path.join(testDir, 'temp_snapshot_12345.db'), 'temp');
    fs.writeFileSync(path.join(testDir, 'temp_snapshot_12345.db-journal'), 'journal');
    fs.writeFileSync(path.join(testDir, 'dev_20260828_120000.db.gz'), 'real backup');

    const purged = purgeOrphanSnapshots(testDir);
    expect(purged).toBe(2);

    const remaining = fs.readdirSync(testDir);
    expect(remaining).toEqual(['dev_20260828_120000.db.gz']);
  });

  it('restores backup while unlinking stale WAL and SHM files to prevent salt mismatch', () => {
    const testDbPath = path.join(testDir, 'test.db');
    const walPath = `${testDbPath}-wal`;
    const shmPath = `${testDbPath}-shm`;
    const backupPath = path.join(testDir, 'backup.db');

    // Create backup db
    const bdb = new Database(backupPath);
    bdb.exec("CREATE TABLE test (name TEXT); INSERT INTO test VALUES ('restored_data');");
    bdb.close();

    // Create stale wal and shm files
    fs.writeFileSync(testDbPath, 'old base');
    fs.writeFileSync(walPath, 'stale wal');
    fs.writeFileSync(shmPath, 'stale shm');

    const restored = restoreDbBackup(backupPath, testDbPath);
    expect(restored).toBe(true);

    const verifyDb = new Database(testDbPath);
    const row = verifyDb.prepare('SELECT name FROM test').get() as { name: string };
    expect(row.name).toBe('restored_data');
    verifyDb.close();
  });
});
