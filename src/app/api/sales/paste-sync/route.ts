import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { parseStockPaste, ParsedStockRow } from '@/lib/stockPasteParser';
import { syncImageRollup } from '@/lib/salesReconciler';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      action,
      platform = 'Adobe Stock',
      rawText,
      items,
      statementDate,
      useStatementDate = false,
    } = body;

    // ----------------------------------------------------
    // Action 1: PREVIEW
    // ----------------------------------------------------
    if (action === 'preview') {
      if (!rawText || typeof rawText !== 'string') {
        return NextResponse.json({ error: 'No text provided' }, { status: 400 });
      }

      const parsedRows: ParsedStockRow[] = parseStockPaste(rawText);
      if (parsedRows.length === 0) {
        return NextResponse.json({ rows: [], message: 'No valid rows found in text' });
      }

      // Fetch all images for resolution
      const allImages = await prisma.image.findMany({
        select: {
          id: true,
          code: true,
          title: true,
          filePath: true,
          createdAt: true,
          asId: true,
          ssId: true,
          vzId: true,
        },
      });

      const previewRows = parsedRows.map((row) => {
        const effectiveDateStr =
          useStatementDate && statementDate ? statementDate : row.dateStr;
        const effectiveDateDisplay =
          useStatementDate && statementDate ? statementDate : row.dateDisplay;

        // Priority 1: Match by existing platform ID
        const matched = allImages.find((img) => {
          if (platform === 'Adobe Stock' && img.asId === row.assetId) return true;
          if (platform === 'Shutterstock' && img.ssId === row.assetId) return true;
          if (platform === 'Vecteezy' && img.vzId === row.assetId) return true;
          return false;
        });

        if (matched) {
          return {
            ...row,
            uploadDateStr: row.dateStr,
            uploadDateDisplay: row.dateDisplay,
            dateStr: effectiveDateStr,
            dateDisplay: effectiveDateDisplay,
            matchType: 'exact_id',
            matchedImage: {
              id: matched.id,
              code: matched.code,
              title: matched.title,
              filePath: matched.filePath,
              createdAt: matched.createdAt.toISOString(),
            },
            candidates: [],
          };
        }

        // Priority 2: Match by exact creation date (using parsed artwork upload date)
        const rowDate = new Date(`${row.dateStr}T00:00:00.000Z`);
        const exactMatches = allImages.filter((img) => {
          const imgDate = new Date(img.createdAt);
          return (
            imgDate.getUTCFullYear() === rowDate.getUTCFullYear() &&
            imgDate.getUTCMonth() === rowDate.getUTCMonth() &&
            imgDate.getUTCDate() === rowDate.getUTCDate()
          );
        });

        if (exactMatches.length === 1) {
          const single = exactMatches[0];
          return {
            ...row,
            uploadDateStr: row.dateStr,
            uploadDateDisplay: row.dateDisplay,
            dateStr: effectiveDateStr,
            dateDisplay: effectiveDateDisplay,
            matchType: 'exact_date',
            matchedImage: {
              id: single.id,
              code: single.code,
              title: single.title,
              filePath: single.filePath,
              createdAt: single.createdAt.toISOString(),
            },
            candidates: [],
          };
        }

        // Priority 3: Multiple exact matches or Proximity matches (±7 days)
        const rowTime = rowDate.getTime();
        const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;

        const proximityMatches = allImages.filter((img) => {
          const diff = Math.abs(new Date(img.createdAt).getTime() - rowTime);
          return diff <= sevenDaysMs;
        });

        const candidates = (exactMatches.length > 1 ? exactMatches : proximityMatches).map(
          (img) => ({
            id: img.id,
            code: img.code,
            title: img.title,
            filePath: img.filePath,
            createdAt: img.createdAt.toISOString(),
          })
        );

        return {
          ...row,
          uploadDateStr: row.dateStr,
          uploadDateDisplay: row.dateDisplay,
          dateStr: effectiveDateStr,
          dateDisplay: effectiveDateDisplay,
          matchType:
            exactMatches.length > 1
              ? 'multi_exact_date'
              : candidates.length > 0
              ? 'proximity'
              : 'unmatched',
          matchedImage: candidates.length === 1 ? candidates[0] : null,
          candidates,
        };
      });

      return NextResponse.json({ rows: previewRows });
    }

    // ----------------------------------------------------
    // Action 2: COMMIT & SYNC
    // ----------------------------------------------------
    if (action === 'commit') {
      if (!Array.isArray(items) || items.length === 0) {
        return NextResponse.json({ error: 'No items to sync' }, { status: 400 });
      }

      await prisma.$transaction(async (tx) => {
        for (const item of items) {
          const { imageId, assetId, dateStr, earnings, downloads } = item;
          const normalizedDate = new Date(`${dateStr}T00:00:00.000Z`);
          const numEarnings = Number(earnings) || 0;
          const resolvedDownloads =
            downloads !== undefined
              ? Number(downloads)
              : numEarnings > 0
              ? 1
              : 0;

          if (imageId) {
            // Case A: Matched to Image in Portfolio
            // 1. Permanently link platform Asset ID on Image
            const updateData: Record<string, string> = {};
            if (platform === 'Adobe Stock' && assetId) updateData.asId = assetId;
            if (platform === 'Shutterstock' && assetId) updateData.ssId = assetId;
            if (platform === 'Vecteezy' && assetId) updateData.vzId = assetId;

            if (Object.keys(updateData).length > 0) {
              await tx.image.update({
                where: { id: imageId },
                data: updateData,
              });
            }

            // 2. Upsert PlatformStats record
            await tx.platformStats.upsert({
              where: {
                imageId_platform_date: {
                  imageId,
                  platform,
                  date: normalizedDate,
                },
              },
              create: {
                imageId,
                platform,
                platformAssetId: assetId || null,
                date: normalizedDate,
                earnings: numEarnings,
                downloads: resolvedDownloads,
              },
              update: {
                platformAssetId: assetId || undefined,
                earnings: numEarnings,
                downloads: resolvedDownloads,
              },
            });

            // 3. Recalculate and update image rollups
            await syncImageRollup(tx, imageId);
          } else {
            // Case B: Unlinked (imageId is null)
            const existingUnlinked = await tx.platformStats.findFirst({
              where: {
                imageId: null,
                platform,
                platformAssetId: assetId || null,
                date: normalizedDate,
              },
            });

            if (existingUnlinked) {
              await tx.platformStats.update({
                where: { id: existingUnlinked.id },
                data: {
                  earnings: numEarnings,
                  downloads: resolvedDownloads,
                },
              });
            } else {
              await tx.platformStats.create({
                data: {
                  imageId: null,
                  platform,
                  platformAssetId: assetId || null,
                  date: normalizedDate,
                  earnings: numEarnings,
                  downloads: resolvedDownloads,
                },
              });
            }
          }

        }
      });

      return NextResponse.json({ success: true, syncedCount: items.length });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Error in paste-sync API:', error);
    return NextResponse.json({ error: 'Failed to process paste-sync' }, { status: 500 });
  }
}
