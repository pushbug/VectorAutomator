import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { prisma } from '@/lib/prisma';
import { createDbBackup } from '@/lib/dbBackup';

export async function POST() {
  try {
    // 1. Force immediate write-through: flush all in-flight WAL frames to dev.db via Prisma
    try {
      if (process.env.NODE_ENV !== 'test' && prisma && typeof (prisma as any).$queryRawUnsafe === 'function') {
        await prisma.$queryRawUnsafe('PRAGMA wal_checkpoint(TRUNCATE);');
      }
    } catch (checkpointErr) {
      console.warn('[api/system/backup] Prisma WAL checkpoint warning:', checkpointErr);
    }

    // 2. Generate timestamped Gzip database backup snapshot with force=true
    const backupFilePath = await createDbBackup(10, undefined, true);

    if (!backupFilePath || !fs.existsSync(backupFilePath)) {
      return NextResponse.json(
        { ok: false, error: 'Failed to generate database backup snapshot.' },
        { status: 500 }
      );
    }

    const stat = fs.statSync(backupFilePath);
    const filename = path.basename(backupFilePath);

    return NextResponse.json({
      ok: true,
      filename,
      size: stat.size,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('[api/system/backup] Backup error:', error);
    return NextResponse.json(
      { ok: false, error: error?.message || 'Internal backup error occurred.' },
      { status: 500 }
    );
  }
}
