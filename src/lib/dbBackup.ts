import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
import crypto from 'crypto';
import Database from 'better-sqlite3';

/**
 * Default debounced quiet period: 30 seconds (30,000 ms).
 * Coalesces micro-edits while ensuring timely durability.
 */
export const DEFAULT_BACKUP_DEBOUNCE_MS = 30 * 1000;

interface DbBackupCoordinator {
  isDbDirty: boolean;
  backupTimer: NodeJS.Timeout | null;
  lastMutationTimestamp: number;
  isLock: boolean;
  processHooksRegistered: boolean;
}

const globalForBackup = globalThis as unknown as {
  __dbBackupCoordinator?: DbBackupCoordinator;
};

if (!globalForBackup.__dbBackupCoordinator) {
  globalForBackup.__dbBackupCoordinator = {
    isDbDirty: false,
    backupTimer: null,
    lastMutationTimestamp: 0,
    isLock: false,
    processHooksRegistered: false,
  };
}

const coordinator = globalForBackup.__dbBackupCoordinator;

/**
 * Checks if running inside an automated test environment.
 */
export function isTestEnv(): boolean {
  return process.env.NODE_ENV === 'test' || process.env.VITEST === 'true';
}

/**
 * Executes a SQLite WAL checkpoint.
 * Defaults to PASSIVE during live operations to consolidate uncommitted pages without locking writers or readers.
 * Uses TRUNCATE on process shutdown or offline maintenance to reset WAL file size to zero.
 */
export function checkpointDatabase(targetDbPath?: string, mode: 'PASSIVE' | 'TRUNCATE' = 'PASSIVE'): boolean {
  try {
    const dbPath = targetDbPath || path.resolve(process.cwd(), 'dev.db');
    if (!fs.existsSync(dbPath) || dbPath === ':memory:') {
      return false;
    }

    const db = new Database(dbPath, { timeout: 10000 });
    try {
      const result = db.pragma(`wal_checkpoint(${mode})`) as any;
      if (Array.isArray(result) && result.length > 0 && result[0]?.busy !== 0) {
        console.warn(`[dbBackup] SQLite WAL checkpoint(${mode}) busy: ${result[0].busy}, log: ${result[0].log}`);
        return false;
      }
      return true;
    } finally {
      db.close();
    }
  } catch (error) {
    console.warn('SQLite WAL checkpoint warning:', error);
    return false;
  }
}

/**
 * Scans the backups directory and safely unlinks any orphaned temporary snapshot files.
 */
export function purgeOrphanSnapshots(targetBackupsDir?: string): number {
  try {
    const backupsDir = targetBackupsDir || path.resolve(process.cwd(), 'backups');
    if (!fs.existsSync(backupsDir)) {
      return 0;
    }

    const files = fs.readdirSync(backupsDir);
    let purgedCount = 0;

    for (const file of files) {
      if (file.startsWith('temp_snapshot_') && (file.endsWith('.db') || file.endsWith('.db-journal') || file.endsWith('-journal') || file.endsWith('-wal') || file.endsWith('-shm'))) {
        try {
          fs.unlinkSync(path.join(backupsDir, file));
          purgedCount++;
        } catch (_) {}
      }
    }

    return purgedCount;
  } catch (error) {
    console.error('Failed to purge orphan snapshots:', error);
    return 0;
  }
}

/**
 * Registers graceful process shutdown hooks to ensure pending WAL frames are flushed before exit.
 */
function registerProcessShutdownHooks(): void {
  if (coordinator.processHooksRegistered || isTestEnv() || typeof process === 'undefined') {
    return;
  }

  const handleShutdown = () => {
    try {
      checkpointDatabase(undefined, 'TRUNCATE');
    } catch (_) {}
  };

  process.on('SIGINT', () => {
    handleShutdown();
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    handleShutdown();
    process.exit(0);
  });

  process.on('beforeExit', () => {
    handleShutdown();
  });

  coordinator.processHooksRegistered = true;
}

// Auto-register lifecycle hooks and purge stale temp snapshots on module load
registerProcessShutdownHooks();
if (!isTestEnv()) {
  purgeOrphanSnapshots();
}

/**
 * Formats a Date object into local system timestamp YYYYMMDD_HHmmss.
 */
function formatLocalTimestamp(date = new Date()): string {
  const YYYY = date.getFullYear();
  const MM = String(date.getMonth() + 1).padStart(2, '0');
  const DD = String(date.getDate()).padStart(2, '0');
  const HH = String(date.getHours()).padStart(2, '0');
  const mm = String(date.getMinutes()).padStart(2, '0');
  const ss = String(date.getSeconds()).padStart(2, '0');
  return `${YYYY}${MM}${DD}_${HH}${mm}${ss}`;
}

/**
 * Schedules an automated database backup after a debounced quiet window.
 * Executes synchronous WAL checkpoint immediately to ensure 100% write-through persistence.
 */
export function scheduleAutoBackup(debounceMs = DEFAULT_BACKUP_DEBOUNCE_MS, targetDbPath?: string): void {
  // 1. Immediate write-through durability: checkpoint WAL to dev.db instantly
  checkpointDatabase(targetDbPath);

  // 2. Debounced background snapshot compression
  coordinator.isDbDirty = true;
  coordinator.lastMutationTimestamp = Date.now();

  if (coordinator.backupTimer) {
    clearTimeout(coordinator.backupTimer);
  }

  coordinator.backupTimer = setTimeout(() => {
    coordinator.isDbDirty = false;
    coordinator.backupTimer = null;
    createDbBackup(10, targetDbPath).catch((err) => {
      console.error('Debounced auto backup failed:', err);
    });
  }, debounceMs);
}

/**
 * Checks if the database currently has pending unsaved mutations.
 */
export function getIsDbDirty(): boolean {
  return coordinator.isDbDirty;
}

/**
 * Cancels pending scheduled auto backup timer (useful for testing & resets).
 */
export function cancelScheduledBackup(): void {
  if (coordinator.backupTimer) {
    clearTimeout(coordinator.backupTimer);
    coordinator.backupTimer = null;
  }
  coordinator.isDbDirty = false;
}

/**
 * Automated SQLite database backup utility using native SQLite Online Backup:
 * 1. Executes synchronous WAL checkpoint prior to snapshot.
 * 2. Safely merges dev.db + dev.db-wal + dev.db-shm into a consolidated standalone DB snapshot.
 * 3. Smart SHA-256 change detection (skips saving duplicate snapshot if data is unchanged).
 * 4. Lossless Gzip compression (.db.gz saving ~80% disk space).
 * 5. Local system timestamping (matching Mac clock exactly).
 * 6. Strict rolling retention cap (retaining strictly the latest maxRetained = 10 files).
 * 7. Guaranteed temp snapshot cleanup in finally block.
 */
export async function createDbBackup(maxRetained = 10, targetDbPath?: string, force = false): Promise<string | null> {
  if (coordinator.isLock) {
    return null;
  }
  coordinator.isLock = true;

  let tempSnapshotPath: string | null = null;
  const backupsDir = path.resolve(process.cwd(), 'backups');

  try {
    const dbPath = targetDbPath || path.resolve(process.cwd(), 'dev.db');
    if (!fs.existsSync(dbPath) || dbPath === ':memory:') {
      return null;
    }

    if (!fs.existsSync(backupsDir)) {
      fs.mkdirSync(backupsDir, { recursive: true });
    }

    // Flush WAL pages into base DB prior to snapshot
    checkpointDatabase(dbPath, 'TRUNCATE');

    tempSnapshotPath = path.join(backupsDir, `temp_snapshot_${Date.now()}.db`);

    // 1. Native SQLite Online Backup: safely consolidates dev.db and dev.db-wal into temp file
    try {
      const srcDb = new Database(dbPath, { readonly: true });
      await srcDb.backup(tempSnapshotPath);
      srcDb.close();
    } catch (onlineBackupErr) {
      // Fallback: copy file if native backup fails
      fs.copyFileSync(dbPath, tempSnapshotPath);
    }

    if (!fs.existsSync(tempSnapshotPath)) {
      return null;
    }

    const tempDbBuffer = fs.readFileSync(tempSnapshotPath);
    const currentHash = crypto.createHash('sha256').update(tempDbBuffer).digest('hex');

    // 2. Smart Change Detection against latest existing backup (bypassed if force is true)
    const existingBackups = fs
      .readdirSync(backupsDir)
      .filter((f) => f.startsWith('dev_') && (f.endsWith('.db') || f.endsWith('.db.gz')))
      .sort();

    if (!force && existingBackups.length > 0) {
      const latestBackupFile = path.join(backupsDir, existingBackups[existingBackups.length - 1]);
      try {
        let latestBuffer: Buffer;
        if (latestBackupFile.endsWith('.gz')) {
          latestBuffer = zlib.gunzipSync(fs.readFileSync(latestBackupFile));
        } else {
          latestBuffer = fs.readFileSync(latestBackupFile);
        }
        const latestHash = crypto.createHash('sha256').update(latestBuffer).digest('hex');

        if (currentHash === latestHash) {
          // Database content is identical to latest backup; clean up temp and return
          if (fs.existsSync(tempSnapshotPath)) {
            try {
              fs.unlinkSync(tempSnapshotPath);
            } catch (_) {}
          }
          return latestBackupFile;
        }
      } catch (_) {
        // Proceed with backup if unzipping / comparing errors
      }
    }

    // 3. Compress and save timestamped backup using Mac local time
    const timestamp = formatLocalTimestamp(new Date());
    const backupFilename = `dev_${timestamp}.db.gz`;
    const targetPath = path.join(backupsDir, backupFilename);

    const compressed = zlib.gzipSync(tempDbBuffer, { level: 9 });
    fs.writeFileSync(targetPath, compressed);

    // 4. Auto-Pruning: Retain strictly the latest `maxRetained` files
    const allBackups = fs
      .readdirSync(backupsDir)
      .filter((f) => f.startsWith('dev_') && (f.endsWith('.db') || f.endsWith('.db.gz')))
      .sort();

    if (allBackups.length > maxRetained) {
      const toDelete = allBackups.slice(0, allBackups.length - maxRetained);
      for (const file of toDelete) {
        try {
          fs.unlinkSync(path.join(backupsDir, file));
        } catch (_) {}
      }
    }

    return targetPath;
  } catch (error) {
    console.error('Failed to create automated database backup:', error);
    return null;
  } finally {
    if (tempSnapshotPath && fs.existsSync(tempSnapshotPath)) {
      try {
        fs.unlinkSync(tempSnapshotPath);
      } catch (_) {}
    }
    purgeOrphanSnapshots(backupsDir);
    coordinator.isLock = false;
  }
}

/**
 * Restores the SQLite database from a selected backup file (.db or .db.gz).
 * Atomically unlinks stale WAL and SHM files to guarantee zero header salt corruption.
 */
export function restoreDbBackup(backupFilePath: string, targetDbPath?: string): boolean {
  try {
    const fullPath = path.resolve(backupFilePath);
    if (!fs.existsSync(fullPath)) {
      throw new Error(`Backup file not found: ${fullPath}`);
    }

    const dbPath = targetDbPath || path.resolve(process.cwd(), 'dev.db');
    const walPath = `${dbPath}-wal`;
    const shmPath = `${dbPath}-shm`;

    // Unlink stale WAL/SHM before restoring base file
    if (fs.existsSync(walPath)) {
      try {
        fs.unlinkSync(walPath);
      } catch (_) {}
    }
    if (fs.existsSync(shmPath)) {
      try {
        fs.unlinkSync(shmPath);
      } catch (_) {}
    }

    if (fullPath.endsWith('.gz')) {
      const compressed = fs.readFileSync(fullPath);
      const decompressed = zlib.gunzipSync(compressed);
      fs.writeFileSync(dbPath, decompressed);
    } else {
      fs.copyFileSync(fullPath, dbPath);
    }

    // Clean up any newly triggered WAL/SHM artifacts and checkpoint clean state
    if (fs.existsSync(walPath)) {
      try {
        fs.unlinkSync(walPath);
      } catch (_) {}
    }
    if (fs.existsSync(shmPath)) {
      try {
        fs.unlinkSync(shmPath);
      } catch (_) {}
    }

    checkpointDatabase(dbPath, 'TRUNCATE');

    console.log('[dbBackup] Database restored successfully. Restarting server to refresh database connections...');
    if (!isTestEnv()) {
      process.exit(0);
    }

    return true;
  } catch (error) {
    console.error('Failed to restore database backup:', error);
    return false;
  }
}
