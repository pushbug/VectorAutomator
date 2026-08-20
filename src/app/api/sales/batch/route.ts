import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { syncImageRollup } from '@/lib/salesReconciler';

/**
 * DELETE /api/sales/batch
 * Bulk deletes sales records and recalculates parent image rollups safely.
 */
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { ids } = body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { error: 'ids array is required and must not be empty' },
        { status: 400 }
      );
    }

    const affectedStats = await prisma.platformStats.findMany({
      where: { id: { in: ids } },
      select: { id: true, imageId: true },
    });

    if (affectedStats.length === 0) {
      return NextResponse.json(
        { error: 'No matching sales records found' },
        { status: 404 }
      );
    }

    // Extract unique non-null image IDs
    const affectedImageIds = Array.from(
      new Set(affectedStats.map((s) => s.imageId).filter((id): id is string => Boolean(id)))
    );

    await prisma.$transaction(async (tx) => {
      await tx.platformStats.deleteMany({
        where: { id: { in: ids } },
      });

      for (const imageId of affectedImageIds) {
        await syncImageRollup(tx, imageId);
      }
    });

    return NextResponse.json({
      success: true,
      deletedCount: affectedStats.length,
      affectedImageCount: affectedImageIds.length,
    });
  } catch (error) {
    console.error('Failed to bulk delete sales:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

/**
 * PATCH /api/sales/batch
 * Bulk updates sales record dates with collision-safe merging and parent image rollup sync.
 */
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { ids, date } = body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { error: 'ids array is required and must not be empty' },
        { status: 400 }
      );
    }

    if (!date || typeof date !== 'string') {
      return NextResponse.json(
        { error: 'date string (YYYY-MM-DD) is required' },
        { status: 400 }
      );
    }

    const cleanDateStr = date.split('T')[0];
    const targetDate = new Date(`${cleanDateStr}T00:00:00.000Z`);
    if (isNaN(targetDate.getTime())) {
      return NextResponse.json(
        { error: 'Invalid date format' },
        { status: 400 }
      );
    }

    const sourceStats = await prisma.platformStats.findMany({
      where: { id: { in: ids } },
    });

    if (sourceStats.length === 0) {
      return NextResponse.json(
        { error: 'No matching sales records found' },
        { status: 404 }
      );
    }

    const affectedImageIds = Array.from(
      new Set(sourceStats.map((s) => s.imageId).filter((id): id is string => Boolean(id)))
    );

    await prisma.$transaction(async (tx) => {
      for (const stat of sourceStats) {
        if (stat.imageId) {
          // Check collision on (imageId, platform, targetDate)
          const existing = await tx.platformStats.findUnique({
            where: {
              imageId_platform_date: {
                imageId: stat.imageId,
                platform: stat.platform,
                date: targetDate,
              },
            },
          });

          if (existing && existing.id !== stat.id) {
            // Collision-safe merge: accumulate metrics into existing target and delete source row
            await tx.platformStats.update({
              where: { id: existing.id },
              data: {
                downloads: existing.downloads + stat.downloads,
                earnings: existing.earnings + stat.earnings,
              },
            });
            await tx.platformStats.delete({
              where: { id: stat.id },
            });
          } else {
            // No collision on target date: update date directly
            await tx.platformStats.update({
              where: { id: stat.id },
              data: {
                date: targetDate,
              },
            });
          }
        } else {
          // Unlinked artwork (imageId is null)
          const existingUnlinked = await tx.platformStats.findFirst({
            where: {
              imageId: null,
              platform: stat.platform,
              platformAssetId: stat.platformAssetId || null,
              date: targetDate,
            },
          });

          if (existingUnlinked && existingUnlinked.id !== stat.id) {
            await tx.platformStats.update({
              where: { id: existingUnlinked.id },
              data: {
                downloads: existingUnlinked.downloads + stat.downloads,
                earnings: existingUnlinked.earnings + stat.earnings,
              },
            });
            await tx.platformStats.delete({
              where: { id: stat.id },
            });
          } else {
            await tx.platformStats.update({
              where: { id: stat.id },
              data: {
                date: targetDate,
              },
            });
          }
        }
      }

      // Re-sync rollups for all affected images
      for (const imageId of affectedImageIds) {
        await syncImageRollup(tx, imageId);
      }
    });

    return NextResponse.json({
      success: true,
      updatedCount: sourceStats.length,
      targetDate: targetDate.toISOString(),
      affectedImageCount: affectedImageIds.length,
    });
  } catch (error) {
    console.error('Failed to bulk update sales dates:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
