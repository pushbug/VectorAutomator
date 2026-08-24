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
  };
}

const coordinator = globalForBackup.__dbBackupCoordinator;

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
 * Coalesces rapid sequential mutations into a single consolidated snapshot.
 */
export function scheduleAutoBackup(debounceMs = DEFAULT_BACKUP_DEBOUNCE_MS): void {
  coordinator.isDbDirty = true;
  coordinator.lastMutationTimestamp = Date.now();

  if (coordinator.backupTimer) {
    clearTimeout(coordinator.backupTimer);
  }

  coordinator.backupTimer = setTimeout(() => {
    coordinator.isDbDirty = false;
    coordinator.backupTimer = null;
    createDbBackup().catch((err) => {
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
 * 1. Safely merges dev.db + dev.db-wal + dev.db-shm into a consolidated standalone DB snapshot.
 * 2. Smart SHA-256 change detection (skips saving duplicate snapshot if data is unchanged).
 * 3. Lossless Gzip compression (.db.gz saving ~80% disk space).
 * 4. Local system timestamping (matching Mac clock exactly).
 * 5. Strict rolling retention cap (retaining strictly the latest maxRetained = 10 files).
 */
export async function createDbBackup(maxRetained = 10): Promise<string | null> {
  if (coordinator.isLock) {
    return null;
  }
  coordinator.isLock = true;

  try {
    const dbPath = path.resolve(process.cwd(), 'dev.db');
    if (!fs.existsSync(dbPath)) {
      return null;
    }

    const backupsDir = path.resolve(process.cwd(), 'backups');
    if (!fs.existsSync(backupsDir)) {
      fs.mkdirSync(backupsDir, { recursive: true });
    }

    const tempSnapshotPath = path.join(backupsDir, `temp_snapshot_${Date.now()}.db`);

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

    // 2. Smart Change Detection against latest existing backup
    const existingBackups = fs
      .readdirSync(backupsDir)
      .filter((f) => f.startsWith('dev_') && (f.endsWith('.db') || f.endsWith('.db.gz')))
      .sort();

    if (existingBackups.length > 0) {
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
          try {
            fs.unlinkSync(tempSnapshotPath);
          } catch (_) {}
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

    // Clean up temporary uncompressed snapshot
    try {
      fs.unlinkSync(tempSnapshotPath);
    } catch (_) {}

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
    coordinator.isLock = false;
  }
}

/**
 * Restores the SQLite database from a selected backup file (.db or .db.gz).
 */
export function restoreDbBackup(backupFilePath: string): boolean {
  try {
    const fullPath = path.resolve(backupFilePath);
    if (!fs.existsSync(fullPath)) {
      throw new Error(`Backup file not found: ${fullPath}`);
    }

    const dbPath = path.resolve(process.cwd(), 'dev.db');

    if (fullPath.endsWith('.gz')) {
      const compressed = fs.readFileSync(fullPath);
      const decompressed = zlib.gunzipSync(compressed);
      fs.writeFileSync(dbPath, decompressed);
    } else {
      fs.copyFileSync(fullPath, dbPath);
    }

    return true;
  } catch (error) {
    console.error('Failed to restore database backup:', error);
    return false;
  }
}
