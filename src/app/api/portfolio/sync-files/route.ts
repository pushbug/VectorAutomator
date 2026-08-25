import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { syncPhysicalUploadFiles } from '@/lib/fileStorage';

export async function POST(_request: NextRequest) {
  try {
    const result = await syncPhysicalUploadFiles(prisma);
    return NextResponse.json({
      success: true,
      syncedCount: result.syncedCount,
      syncedCodes: result.syncedCodes,
    });
  } catch (error: any) {
    console.error('Error syncing physical upload files:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to sync upload files' },
      { status: 500 }
    );
  }
}
