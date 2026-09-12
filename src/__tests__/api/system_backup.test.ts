import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST as backupPOST } from '@/app/api/system/backup/route';
import { createDbBackup } from '@/lib/dbBackup';
import fs from 'fs';

vi.mock('@/lib/dbBackup', () => ({
  createDbBackup: vi.fn(),
}));

vi.mock('@/lib/prisma', () => ({
  prisma: {
    $queryRawUnsafe: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock('fs', async () => {
  const actual = await vi.importActual<typeof import('fs')>('fs');
  return {
    ...actual,
    default: {
      ...actual,
      existsSync: vi.fn(),
      statSync: vi.fn(),
    },
    existsSync: vi.fn(),
    statSync: vi.fn(),
  };
});

describe('System Manual Backup API (UT-API-SYSTEM-BACKUP-01)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('UT-API-SYSTEM-BACKUP-01: executes forced WAL checkpoint and returns backup metadata', async () => {
    const mockBackupPath = '/Users/baemon/Desktop/VectorAutomator/backups/dev_20260912_153500.db.gz';
    vi.mocked(createDbBackup).mockResolvedValue(mockBackupPath);
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.statSync).mockReturnValue({ size: 4450000 } as any);

    const res = await backupPOST();
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.ok).toBe(true);
    expect(data.filename).toBe('dev_20260912_153500.db.gz');
    expect(data.size).toBe(4450000);
    expect(data.timestamp).toBeDefined();

    // Verify forced creation parameter
    expect(createDbBackup).toHaveBeenCalledWith(10, undefined, true);
  });

  it('returns 500 error when createDbBackup returns null', async () => {
    vi.mocked(createDbBackup).mockResolvedValue(null);

    const res = await backupPOST();
    expect(res.status).toBe(500);

    const data = await res.json();
    expect(data.ok).toBe(false);
    expect(data.error).toContain('Failed to generate');
  });
});
