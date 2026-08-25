import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { scheduleAutoBackup, createDbBackup } from '@/lib/dbBackup';
import { getNextImageCode, parseImageCode } from '@/lib/imageCode';
import { reconcileImageSales } from '@/lib/salesReconciler';
import {
  parseContributorHtml,
  parseTsvString,
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
  type SyncInputItem,
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

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
        asId: string;
        asDownloads: number;
      }> = [];

      for (const item of itemsToCommit) {
        // Handle Action: Create Placeholder Artwork in Portfolio (Metadata-Only, no file required)
        if (item.action === 'create_placeholder' || (!item.imageId && item.asId && item.title)) {
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

          const created = await prisma.image.create({
            data: {
              code: finalCode,
              year: finalYear,
              month: finalMonth,
              seqNumber: finalSeqNumber,
              title: String(item.title).trim(),
              asId: String(item.asId).trim(),
              asDownloads: 0,
              totalDownloads: 0,
              keywords: typeof item.keywords === 'string' ? item.keywords.trim() : (item.keywords || ''),
              category: typeof item.category === 'string' && item.category.trim().length > 0 ? item.category.trim() : null,
              filePath: '',
              status: 'pending',
              createdAt: targetDate,
            },
          });

          createdItems.push({
            id: created.id,
            code: created.code || 'NO-CODE',
            title: created.title,
            filePath: created.filePath,
            asId: created.asId || String(item.asId).trim(),
            asDownloads: created.asDownloads,
          });

          // Reconcile unlinked sales from PlatformStats if any match this asId
          await reconcileImageSales(prisma, { id: created.id, asId: String(item.asId) });

          // Two-way reconciliation with SERP database
          await prisma.serpItem.updateMany({
            where: { assetId: String(item.asId) },
            data: {
              isMine: true,
              matchedImageId: created.id,
            },
          });

          committedCount++;
          continue;
        }

        if (!item.imageId || !item.asId) continue;

        const img = await prisma.image.findUnique({
          where: { id: item.imageId },
          select: { id: true },
        });

        if (!img) continue;

        // Update Image Asset ID strictly (do NOT mutate asDownloads/totalDownloads from contributor metadata)
        await prisma.image.update({
          where: { id: img.id },
          data: {
            asId: String(item.asId),
          },
        });

        // Reconcile unlinked sales from PlatformStats if any match this asId
        await reconcileImageSales(prisma, { id: img.id, asId: String(item.asId) });

        // Two-way reconciliation with SERP database
        await prisma.serpItem.updateMany({
          where: { assetId: String(item.asId) },
          data: {
            isMine: true,
            matchedImageId: img.id,
          },
        });

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
        (item: any) => item && typeof item.asId === 'string' && typeof item.title === 'string'
      );
    } else if (typeof body.html === 'string' && body.html.trim().length > 0) {
      candidateItems = parseContributorHtml(body.html);
    } else if (typeof body.tsv === 'string' && body.tsv.trim().length > 0) {
      candidateItems = parseTsvString(body.tsv);
    } else if (typeof body.text === 'string' && body.text.trim().length > 0) {
      if (body.text.includes('<div') || body.text.includes('<img')) {
        candidateItems = parseContributorHtml(body.text);
      } else {
        candidateItems = parseTsvString(body.text);
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
        asDownloads: true,
        ssDownloads: true,
        totalDownloads: true,
      },
    });

    // Group images by asId for Top Priority exact matching (Already Synced)
    const asIdImageMap = new Map<string, typeof allImages[0]>();
    for (const img of allImages) {
      if (img.asId && img.asId.trim().length > 0) {
        asIdImageMap.set(img.asId.trim(), img);
      }
    }

    // Group images by normalized title to detect potential title duplicates
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
    }

    // Pre-collect exact match claims in this batch to prevent duplicate candidate claims
    const claimedExactImageIds = new Set<string>();
    for (const item of candidateItems) {
      const cleanAsId = item.asId.trim();
      const matchedByAsId = asIdImageMap.get(cleanAsId);
      if (matchedByAsId) {
        claimedExactImageIds.add(matchedByAsId.id);
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
      const cleanAsId = item.asId.trim();
      const cleanTitle = item.title.trim();
      const normCandidate = normalizeTitle(cleanTitle);

      // ───────────────────────────────────────────────────────────────────────
      // PRIORITY 1: Direct Asset ID Match (Already Synced / Verified)
      // ───────────────────────────────────────────────────────────────────────
      const matchedByAsId = asIdImageMap.get(cleanAsId);
      if (matchedByAsId) {
        return {
          asId: item.asId,
          adobeTitle: cleanTitle,
          downloads: Number(item.downloads || 0),
          thumbnailUrl: item.thumbnailUrl || '',
          status: 'exact' as const,
          confidence: 1.0,
          isAlreadySynced: true,
          isOverwrite: false,
          existingAsId: matchedByAsId.asId || null,
          matchedImage: {
            id: matchedByAsId.id,
            code: matchedByAsId.code || 'NO-CODE',
            title: matchedByAsId.title,
            filePath: matchedByAsId.filePath,
            asId: matchedByAsId.asId,
            asDownloads: matchedByAsId.asDownloads,
          },
          candidates: [],
        };
      }

      // ───────────────────────────────────────────────────────────────────────
      // PRIORITY 2: Exact Title Match
      // ───────────────────────────────────────────────────────────────────────
      const exactMatches = normImageMap.get(normCandidate) || [];

      if (exactMatches.length === 1) {
        const matched = exactMatches[0];
        const isAlreadySynced = Boolean(matched.asId && matched.asId === item.asId);
        const isOverwrite = Boolean(matched.asId && matched.asId !== item.asId);
        return {
          asId: item.asId,
          adobeTitle: cleanTitle,
          downloads: Number(item.downloads || 0),
          thumbnailUrl: item.thumbnailUrl || '',
          status: 'exact' as const,
          confidence: 1.0,
          isAlreadySynced,
          isOverwrite,
          existingAsId: matched.asId || null,
          matchedImage: {
            id: matched.id,
            code: matched.code || 'NO-CODE',
            title: matched.title,
            filePath: matched.filePath,
            asId: matched.asId,
            asDownloads: matched.asDownloads,
          },
          candidates: [],
        };
      } else if (exactMatches.length > 1) {
        const alreadyMatchedCand = exactMatches.find((cand) => cand.asId === item.asId);
        if (alreadyMatchedCand) {
          return {
            asId: item.asId,
            adobeTitle: cleanTitle,
            downloads: Number(item.downloads || 0),
            thumbnailUrl: item.thumbnailUrl || '',
            status: 'exact' as const,
            confidence: 1.0,
            isAlreadySynced: true,
            isOverwrite: false,
            existingAsId: alreadyMatchedCand.asId || null,
            matchedImage: {
              id: alreadyMatchedCand.id,
              code: alreadyMatchedCand.code || 'NO-CODE',
              title: alreadyMatchedCand.title,
              filePath: alreadyMatchedCand.filePath,
              asId: alreadyMatchedCand.asId,
              asDownloads: alreadyMatchedCand.asDownloads,
            },
            candidates: [],
          };
        }

        return {
          asId: item.asId,
          adobeTitle: cleanTitle,
          downloads: Number(item.downloads || 0),
          thumbnailUrl: item.thumbnailUrl || '',
          status: 'ambiguous' as const,
          confidence: 0.95,
          isAlreadySynced: false,
          isOverwrite: false,
          existingAsId: null,
          matchedImage: null,
          candidates: exactMatches.map((img) => ({
            id: img.id,
            code: img.code || 'NO-CODE',
            title: img.title,
            filePath: img.filePath,
            asId: img.asId,
            asDownloads: img.asDownloads,
            similarity: 1.0,
          })),
        };
      }

      // ───────────────────────────────────────────────────────────────────────
      // PRIORITY 3: Fuzzy Similarity Search
      // STRICT SAFETY: Exclude images that ALREADY have a DIFFERENT assigned asId or are claimed by exact matches in this batch
      // ───────────────────────────────────────────────────────────────────────
      let bestImage: typeof allImages[0] | null = null;
      let bestScore = 0;

      for (const img of allImages) {
        if (img.asId && img.asId.trim().length > 0 && img.asId.trim() !== cleanAsId) continue;
        if (claimedExactImageIds.has(img.id)) continue;

        const score = computeSimilarity(cleanTitle, img.title);
        if (score > bestScore) {
          bestScore = score;
          bestImage = img;
        }
      }

      if (bestScore >= 0.60 && bestImage) {
        const isAlreadySynced = Boolean(bestImage.asId && bestImage.asId === item.asId);
        const isOverwrite = Boolean(bestImage.asId && bestImage.asId !== item.asId);
        return {
          asId: item.asId,
          adobeTitle: cleanTitle,
          downloads: Number(item.downloads || 0),
          thumbnailUrl: item.thumbnailUrl || '',
          status: 'fuzzy' as const,
          confidence: Math.round(bestScore * 100) / 100,
          isAlreadySynced,
          isOverwrite,
          existingAsId: bestImage.asId || null,
          matchedImage: {
            id: bestImage.id,
            code: bestImage.code || 'NO-CODE',
            title: bestImage.title,
            filePath: bestImage.filePath,
            asId: bestImage.asId,
            asDownloads: bestImage.asDownloads,
          },
          candidates: [
            {
              id: bestImage.id,
              code: bestImage.code || 'NO-CODE',
              title: bestImage.title,
              filePath: bestImage.filePath,
              asId: bestImage.asId,
              asDownloads: bestImage.asDownloads,
              similarity: bestScore,
            },
          ],
        };
      }

      // ───────────────────────────────────────────────────────────────────────
      // PRIORITY 4: Unmatched Fallback
      // ───────────────────────────────────────────────────────────────────────
      return {
        asId: item.asId,
        adobeTitle: cleanTitle,
        downloads: Number(item.downloads || 0),
        thumbnailUrl: item.thumbnailUrl || '',
        status: 'unmatched' as const,
        confidence: 0,
        isAlreadySynced: false,
        isOverwrite: false,
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
