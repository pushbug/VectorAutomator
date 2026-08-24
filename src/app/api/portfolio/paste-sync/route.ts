import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { scheduleAutoBackup, createDbBackup } from '@/lib/dbBackup';
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

      for (const item of itemsToCommit) {
        if (!item.imageId || !item.asId) continue;

        const img = await prisma.image.findUnique({
          where: { id: item.imageId },
          select: { id: true },
        });

        if (!img) continue;

        // Update Image Asset ID strictly (does not touch daily sales/PlatformStats)
        await prisma.image.update({
          where: { id: img.id },
          data: {
            asId: String(item.asId),
          },
        });

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

    const previewRows = candidateItems.map((item) => {
      const cleanTitle = item.title.trim();
      const normCandidate = normalizeTitle(cleanTitle);

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

      // Fuzzy Similarity Search
      let bestImage: typeof allImages[0] | null = null;
      let bestScore = 0;

      for (const img of allImages) {
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
