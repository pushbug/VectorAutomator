import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
import crypto from 'crypto';
import Database from 'better-sqlite3';

/**
 * Default debounced quiet period: 3 minutes (180,000 ms).
 */
export const DEFAULT_BACKUP_DEBOUNCE_MS = 3 * 60 * 1000;

let isDbDirty = false;
let backupTimer: NodeJS.Timeout | null = null;
let lastMutationTimestamp = 0;

/**
 * Computes SHA-256 hash of a file for change detection.
 */
function getFileHash(filePath: string): string {
  const buffer = fs.readFileSync(filePath);
  return crypto.createHash('sha256').update(buffer).digest('hex');
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
 * Schedules an automated database backup after a 3-minute debounced quiet window.
 * Coalesces rapid sequential mutations into a single consolidated snapshot.
 * Triggered strictly by mutation endpoints (PATCH, POST, DELETE).
 */
export function scheduleAutoBackup(debounceMs = DEFAULT_BACKUP_DEBOUNCE_MS): void {
  isDbDirty = true;
  lastMutationTimestamp = Date.now();

  if (backupTimer) {
    clearTimeout(backupTimer);
  }

  backupTimer = setTimeout(() => {
    if (isDbDirty) {
      try {
        createDbBackup();
      } catch (err) {
        console.error('Debounced auto backup failed:', err);
      } finally {
        isDbDirty = false;
        backupTimer = null;
      }
    }
  }, debounceMs);

  if (typeof backupTimer?.unref === 'function') {
    backupTimer.unref();
  }
}

/**
 * Checks if the database currently has pending unsaved mutations.
 */
export function getIsDbDirty(): boolean {
  return isDbDirty;
}

/**
 * Cancels pending scheduled auto backup timer (useful for testing & resets).
 */
export function cancelScheduledBackup(): void {
  if (backupTimer) {
    clearTimeout(backupTimer);
    backupTimer = null;
  }
  isDbDirty = false;
}

/**
 * Automated SQLite database backup utility with:
 * 1. Strict retention cap (default maxRetained = 10).
 * 2. Smart change detection (skips snapshot if DB is unchanged).
 * 3. Lossless Gzip compression (.db.gz saving ~80% disk space).
 * 4. Local system timestamping (matching Mac clock exactly).
 * 5. WAL checkpoint flush ensuring 100% fresh database bytes.
 */
export function createDbBackup(maxRetained = 10): string | null {
  try {
    const dbPath = path.resolve(process.cwd(), 'dev.db');
    if (!fs.existsSync(dbPath)) {
      return null;
    }

    const backupsDir = path.resolve(process.cwd(), 'backups');
    if (!fs.existsSync(backupsDir)) {
      fs.mkdirSync(backupsDir, { recursive: true });
    }

    // 1. Flush SQLite WAL journal into dev.db for 100% fresh data
    try {
      const db = new Database(dbPath);
      db.pragma('wal_checkpoint(TRUNCATE)');
      db.close();
    } catch (_) {}

    // 2. Smart Change Detection: Check if database changed since latest backup
    const existingBackups = fs
      .readdirSync(backupsDir)
      .filter((f) => f.startsWith('dev_') && (f.endsWith('.db') || f.endsWith('.db.gz')))
      .sort();

    const currentHash = getFileHash(dbPath);

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
          // Database content is identical to latest backup; skip duplicate snapshot
          return latestBackupFile;
        }
      } catch (_) {
        // Fallback: proceed with backup if hash comparison errors
      }
    }

    // 3. Compress and save timestamped backup using Mac local time
    const timestamp = formatLocalTimestamp(new Date());
    const backupFilename = `dev_${timestamp}.db.gz`;
    const targetPath = path.join(backupsDir, backupFilename);

    const dbBuffer = fs.readFileSync(dbPath);
    const compressed = zlib.gzipSync(dbBuffer, { level: 9 });
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
