import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { scheduleAutoBackup, createDbBackup } from '@/lib/dbBackup';
import { getNextImageCode, parseImageCode } from '@/lib/imageCode';
import { reconcileImageSales } from '@/lib/salesReconciler';
import {
  parseContributorHtml,
  parseTsvString,
  detectContributorPlatform,
  cleanSuffixes,
  normalizeTitle,
  tokenize,
  computeSimilarity,
  type SyncInputItem,
} from '@/lib/contributorParser';

export {
  cleanSuffixes,
  normalizeTitle,
  tokenize,
  computeSimilarity,
  parseTsvString,
  detectContributorPlatform,
  type SyncInputItem,
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const rawPlatform = body.platform ? String(body.platform).trim() : '';
    const platform: 'Adobe Stock' | 'Shutterstock' =
      rawPlatform === 'Shutterstock' || rawPlatform === 'Adobe Stock'
        ? rawPlatform
        : detectContributorPlatform(body.text || body.tsv || body.html || '');
    const isShutterstock = platform === 'Shutterstock';

    // ─────────────────────────────────────────────────────────────────────────
    // ACTION: COMMIT (Execution)
    // ─────────────────────────────────────────────────────────────────────────
    if (body.action === 'commit') {
      const itemsToCommit = Array.isArray(body.items) ? body.items : [];
      if (itemsToCommit.length === 0) {
        return NextResponse.json(
          { success: false, error: 'No items provided to commit' },
          { status: 400 }
        );
      }

      let committedCount = 0;
      const createdItems: Array<{
        id: string;
        code: string;
        title: string;
        filePath: string;
        asId: string | null;
        ssId: string | null;
        asDownloads: number;
        ssDownloads: number;
      }> = [];

      for (const item of itemsToCommit) {
        const targetId = String(item.ssId || item.asId || item.id || '').trim();

        // Handle Action: Create Placeholder Artwork in Portfolio
        if (item.action === 'create_placeholder' || (!item.imageId && targetId && item.title)) {
          let targetDate = new Date();
          if (item.date || item.createdAt) {
            const rawDateStr = String(item.date || item.createdAt).trim();
            const dateToParse = rawDateStr.length === 10 ? `${rawDateStr}T12:00:00.000Z` : rawDateStr;
            const parsed = new Date(dateToParse);
            if (!isNaN(parsed.getTime())) {
              targetDate = parsed;
            }
          }

          const autoResult = await getNextImageCode(prisma, targetDate);
          let finalCode = autoResult.nextCode;
          let finalYear = autoResult.year;
          let finalMonth = autoResult.month;
          let finalSeqNumber = autoResult.seqNumber;

          if (typeof item.code === 'string' && item.code.trim().length > 0) {
            const parsedCode = parseImageCode(item.code);
            finalCode = item.code.trim();
            if (parsedCode) {
              finalYear = parsedCode.year;
              finalMonth = parsedCode.month;
              finalSeqNumber = parsedCode.seqNumber;
            }
          }

          const createData: Record<string, any> = {
            code: finalCode,
            year: finalYear,
            month: finalMonth,
            seqNumber: finalSeqNumber,
            title: String(item.title).trim(),
            asId: isShutterstock ? null : targetId,
            asDownloads: 0,
            totalDownloads: 0,
            keywords: typeof item.keywords === 'string' ? item.keywords.trim() : (item.keywords || ''),
            category: typeof item.category === 'string' && item.category.trim().length > 0 ? item.category.trim() : null,
            filePath: '',
            status: isShutterstock && item.status === 'Approved' ? 'published' : 'pending',
            createdAt: targetDate,
          };
          if (isShutterstock) {
            createData.ssId = targetId;
            createData.ssDownloads = 0;
          }

          const created = await prisma.image.create({
            data: createData as any,
          });

          createdItems.push({
            id: created.id,
            code: created.code || 'NO-CODE',
            title: created.title,
            filePath: created.filePath,
            asId: created.asId,
            ssId: created.ssId,
            asDownloads: created.asDownloads,
            ssDownloads: created.ssDownloads,
          });

          if (isShutterstock) {
            await reconcileImageSales(prisma, { id: created.id, ssId: targetId });
          } else {
            await reconcileImageSales(prisma, { id: created.id, asId: targetId });
            await prisma.serpItem.updateMany({
              where: { assetId: targetId },
              data: {
                isMine: true,
                matchedImageId: created.id,
              },
            });
          }

          committedCount++;
          continue;
        }

        if (!item.imageId || !targetId) continue;

        const img = await prisma.image.findUnique({
          where: { id: item.imageId },
          select: { id: true },
        });

        if (!img) continue;

        if (isShutterstock) {
          await prisma.image.update({
            where: { id: img.id },
            data: {
              ssId: targetId,
              status: item.status === 'Approved' ? 'published' : undefined,
            },
          });
          await reconcileImageSales(prisma, { id: img.id, ssId: targetId });
        } else {
          await prisma.image.update({
            where: { id: img.id },
            data: {
              asId: targetId,
            },
          });
          await reconcileImageSales(prisma, { id: img.id, asId: targetId });
          await prisma.serpItem.updateMany({
            where: { assetId: targetId },
            data: {
              isMine: true,
              matchedImageId: img.id,
            },
          });
        }

        committedCount++;
      }

      if (committedCount > 0) {
        try {
          await createDbBackup();
        } catch (err) {
          console.warn('Post-commit auto-backup warning:', err);
        }
      }

      return NextResponse.json({
        success: true,
        committedCount,
        createdItems,
      });
    }

    // ─────────────────────────────────────────────────────────────────────────
    // ACTION: PREVIEW (Default Dry-Run / Staged Analysis)
    // ─────────────────────────────────────────────────────────────────────────
    let candidateItems: SyncInputItem[] = [];

    if (Array.isArray(body.items)) {
      candidateItems = body.items.filter(
        (item: any) => item && typeof (item.ssId || item.asId) === 'string' && typeof item.title === 'string'
      );
    } else if (typeof body.html === 'string' && body.html.trim().length > 0) {
      candidateItems = parseContributorHtml(body.html);
    } else if (typeof body.tsv === 'string' && body.tsv.trim().length > 0) {
      candidateItems = parseTsvString(body.tsv, platform);
    } else if (typeof body.text === 'string' && body.text.trim().length > 0) {
      if (body.text.includes('<div') || body.text.includes('<img')) {
        candidateItems = parseContributorHtml(body.text);
      } else {
        candidateItems = parseTsvString(body.text, platform);
      }
    }

    if (candidateItems.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'No valid items found in the provided payload. Please provide TSV text, HTML, or items array.',
        },
        { status: 400 }
      );
    }

    // Fetch all existing images for matching
    const allImages = await prisma.image.findMany({
      select: {
        id: true,
        code: true,
        title: true,
        filePath: true,
        asId: true,
        ssId: true,
        asDownloads: true,
        ssDownloads: true,
        totalDownloads: true,
      },
    });

    // Group images by platform asset ID for Top Priority exact matching
    const idImageMap = new Map<string, typeof allImages[0]>();
    for (const img of allImages) {
      const activeId = isShutterstock ? img.ssId : img.asId;
      if (activeId && activeId.trim().length > 0) {
        idImageMap.set(activeId.trim(), img);
      }
    }

    // Group images by normalized title & normalized filename to detect matches
    const normImageMap = new Map<string, typeof allImages>();

    for (const img of allImages) {
      if (img.title) {
        const norm = normalizeTitle(img.title);
        if (norm) {
          const list = normImageMap.get(norm) || [];
          list.push(img);
          normImageMap.set(norm, list);
        }
      }

      // Also index filename from filePath for exact EPS filename matching
      if (img.filePath) {
        const filename = img.filePath.split(/[/\\]/).pop() || '';
        const normFile = normalizeTitle(filename);
        if (normFile && normFile !== normalizeTitle(img.title)) {
          const list = normImageMap.get(normFile) || [];
          list.push(img);
          normImageMap.set(normFile, list);
        }
      }
    }

    // Pre-collect exact match claims in this batch
    const claimedExactImageIds = new Set<string>();
    for (const item of candidateItems) {
      const cleanId = (item.ssId || item.asId || '').trim();
      const matchedById = idImageMap.get(cleanId);
      if (matchedById) {
        claimedExactImageIds.add(matchedById.id);
        continue;
      }

      const cleanTitle = item.title.trim();
      const normCandidate = normalizeTitle(cleanTitle);
      const exactMatches = normImageMap.get(normCandidate) || [];
      if (exactMatches.length === 1) {
        claimedExactImageIds.add(exactMatches[0].id);
      }
    }

    const previewRows = candidateItems.map((item) => {
      const cleanId = (item.ssId || item.asId || '').trim();
      const cleanTitle = item.title.trim();
      const normCandidate = normalizeTitle(cleanTitle);

      // Helper to build matched Image candidate
      const formatCandidate = (img: typeof allImages[0], similarity = 1.0) => ({
        id: img.id,
        code: img.code || 'NO-CODE',
        title: img.title,
        filePath: img.filePath,
        asId: img.asId,
        ssId: img.ssId,
        asDownloads: img.asDownloads,
        ssDownloads: img.ssDownloads,
        similarity,
      });

      // ───────────────────────────────────────────────────────────────────────
      // PRIORITY 1: Direct Asset ID Match (Already Synced / Verified)
      // ───────────────────────────────────────────────────────────────────────
      const matchedById = idImageMap.get(cleanId);
      if (matchedById) {
        const existingId = isShutterstock ? matchedById.ssId : matchedById.asId;
        return {
          platform,
          asId: cleanId,
          ssId: isShutterstock ? cleanId : undefined,
          adobeTitle: cleanTitle,
          displayTitle: cleanTitle,
          downloads: Number(item.downloads || 0),
          statusLabel: item.status || 'Approved',
          mediaType: item.mediaType || 'Illustration',
          thumbnailUrl: item.thumbnailUrl || '',
          status: 'exact' as const,
          confidence: 1.0,
          isAlreadySynced: true,
          isOverwrite: false,
          existingId: existingId || null,
          existingAsId: existingId || null,
          matchedImage: formatCandidate(matchedById, 1.0),
          candidates: [],
        };
      }

      // ───────────────────────────────────────────────────────────────────────
      // PRIORITY 2: Exact Title or Filename Match
      // ───────────────────────────────────────────────────────────────────────
      const exactMatches = normImageMap.get(normCandidate) || [];

      if (exactMatches.length === 1) {
        const matched = exactMatches[0];
        const existingId = isShutterstock ? matched.ssId : matched.asId;
        const isAlreadySynced = Boolean(existingId && existingId === cleanId);
        const isOverwrite = Boolean(existingId && existingId !== cleanId);
        return {
          platform,
          asId: cleanId,
          ssId: isShutterstock ? cleanId : undefined,
          adobeTitle: cleanTitle,
          displayTitle: cleanTitle,
          downloads: Number(item.downloads || 0),
          statusLabel: item.status || 'Approved',
          mediaType: item.mediaType || 'Illustration',
          thumbnailUrl: item.thumbnailUrl || '',
          status: 'exact' as const,
          confidence: 1.0,
          isAlreadySynced,
          isOverwrite,
          existingId: existingId || null,
          existingAsId: existingId || null,
          matchedImage: formatCandidate(matched, 1.0),
          candidates: [],
        };
      } else if (exactMatches.length > 1) {
        const alreadyMatchedCand = exactMatches.find((cand) => {
          const cid = isShutterstock ? cand.ssId : cand.asId;
          return cid === cleanId;
        });

        if (alreadyMatchedCand) {
          const existingId = isShutterstock ? alreadyMatchedCand.ssId : alreadyMatchedCand.asId;
          return {
            platform,
            asId: cleanId,
            ssId: isShutterstock ? cleanId : undefined,
            adobeTitle: cleanTitle,
            displayTitle: cleanTitle,
            downloads: Number(item.downloads || 0),
            statusLabel: item.status || 'Approved',
            mediaType: item.mediaType || 'Illustration',
            thumbnailUrl: item.thumbnailUrl || '',
            status: 'exact' as const,
            confidence: 1.0,
            isAlreadySynced: true,
            isOverwrite: false,
            existingId: existingId || null,
            existingAsId: existingId || null,
            matchedImage: formatCandidate(alreadyMatchedCand, 1.0),
            candidates: [],
          };
        }

        return {
          platform,
          asId: cleanId,
          ssId: isShutterstock ? cleanId : undefined,
          adobeTitle: cleanTitle,
          displayTitle: cleanTitle,
          downloads: Number(item.downloads || 0),
          statusLabel: item.status || 'Approved',
          mediaType: item.mediaType || 'Illustration',
          thumbnailUrl: item.thumbnailUrl || '',
          status: 'ambiguous' as const,
          confidence: 0.95,
          isAlreadySynced: false,
          isOverwrite: false,
          existingId: null,
          existingAsId: null,
          matchedImage: null,
          candidates: exactMatches.map((img) => formatCandidate(img, 1.0)),
        };
      }

      // ───────────────────────────────────────────────────────────────────────
      // PRIORITY 3: Fuzzy Similarity Search
      // ───────────────────────────────────────────────────────────────────────
      let bestImage: typeof allImages[0] | null = null;
      let bestScore = 0;

      for (const img of allImages) {
        const activeId = isShutterstock ? img.ssId : img.asId;
        if (activeId && activeId.trim().length > 0 && activeId.trim() !== cleanId) continue;
        if (claimedExactImageIds.has(img.id)) continue;

        const score = computeSimilarity(cleanTitle, img.title);
        if (score > bestScore) {
          bestScore = score;
          bestImage = img;
        }
      }

      if (bestScore >= 0.60 && bestImage) {
        const existingId = isShutterstock ? bestImage.ssId : bestImage.asId;
        const isAlreadySynced = Boolean(existingId && existingId === cleanId);
        const isOverwrite = Boolean(existingId && existingId !== cleanId);
        return {
          platform,
          asId: cleanId,
          ssId: isShutterstock ? cleanId : undefined,
          adobeTitle: cleanTitle,
          displayTitle: cleanTitle,
          downloads: Number(item.downloads || 0),
          statusLabel: item.status || 'Approved',
          mediaType: item.mediaType || 'Illustration',
          thumbnailUrl: item.thumbnailUrl || '',
          status: 'fuzzy' as const,
          confidence: Math.round(bestScore * 100) / 100,
          isAlreadySynced,
          isOverwrite,
          existingId: existingId || null,
          existingAsId: existingId || null,
          matchedImage: formatCandidate(bestImage, bestScore),
          candidates: [formatCandidate(bestImage, bestScore)],
        };
      }

      // ───────────────────────────────────────────────────────────────────────
      // PRIORITY 4: Unmatched Fallback
      // ───────────────────────────────────────────────────────────────────────
      return {
        platform,
        asId: cleanId,
        ssId: isShutterstock ? cleanId : undefined,
        adobeTitle: cleanTitle,
        displayTitle: cleanTitle,
        downloads: Number(item.downloads || 0),
        statusLabel: item.status || 'Approved',
        mediaType: item.mediaType || 'Illustration',
        thumbnailUrl: item.thumbnailUrl || '',
        status: 'unmatched' as const,
        confidence: 0,
        isAlreadySynced: false,
        isOverwrite: false,
        existingId: null,
        existingAsId: null,
        matchedImage: null,
        candidates: [],
      };
    });

    const exactCount = previewRows.filter((r) => r.status === 'exact').length;
    const fuzzyCount = previewRows.filter((r) => r.status === 'fuzzy' || r.status === 'ambiguous').length;
    const unmatchedCount = previewRows.filter((r) => r.status === 'unmatched').length;

    return NextResponse.json({
      success: true,
      platform,
      preview: true,
      totalParsed: candidateItems.length,
      exactCount,
      fuzzyCount,
      unmatchedCount,
      rows: previewRows,
    });
  } catch (error: any) {
    console.error('Error in portfolio paste-sync:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
