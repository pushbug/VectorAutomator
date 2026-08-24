import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: imageParam } = await params;

    if (!imageParam) {
      return NextResponse.json({ error: 'Image ID is required' }, { status: 400 });
    }

    // Find image by id, code, or asId
    const image = await prisma.image.findFirst({
      where: {
        OR: [
          { id: imageParam },
          { code: imageParam },
          { asId: imageParam },
        ],
      },
      include: {
        stats: {
          orderBy: { date: 'asc' },
        },
      },
    });

    if (!image) {
      return NextResponse.json({ error: 'Artwork not found' }, { status: 404 });
    }

    // Fetch all SERP items associated with this image or its asId
    const serpItems = await prisma.serpItem.findMany({
      where: {
        OR: [
          { matchedImageId: image.id },
          ...(image.asId ? [{ assetId: image.asId }] : []),
        ],
      },
      include: {
        serpQuery: true,
      },
      orderBy: {
        serpQuery: { searchedAt: 'asc' },
      },
    });

    // Group rankings by keyword to determine active keywords & deltas
    const keywordMap = new Map<string, Array<{
      date: Date;
      rank: number;
      pageNumber: number;
      serpQueryId: string;
    }>>();

    for (const item of serpItems) {
      const kw = item.serpQuery.keyword;
      if (!keywordMap.has(kw)) {
        keywordMap.set(kw, []);
      }
      keywordMap.get(kw)!.push({
        date: item.serpQuery.searchedAt,
        rank: item.rank,
        pageNumber: item.serpQuery.pageNumber,
        serpQueryId: item.serpQueryId,
      });
    }

    // Calculate active keywords summary
    const activeKeywords = Array.from(keywordMap.entries()).map(([keyword, history]) => {
      const latest = history[history.length - 1];
      const previous = history.length > 1 ? history[history.length - 2] : null;
      const rankDelta = previous ? previous.rank - latest.rank : null;
      const isNew = previous === null;
      const bestRank = Math.min(...history.map((h) => h.rank));

      return {
        keyword,
        currentRank: latest.rank,
        pageNumber: latest.pageNumber,
        lastCheckedAt: latest.date,
        previousRank: previous ? previous.rank : null,
        rankDelta,
        isNew,
        bestRank,
        totalChecks: history.length,
      };
    });

    // Chronological history table items (newest first for UI table)
    const chronologicalHistory = [];
    for (const [keyword, history] of keywordMap.entries()) {
      for (let i = 0; i < history.length; i++) {
        const entry = history[i];
        const prev = i > 0 ? history[i - 1] : null;
        const delta = prev ? prev.rank - entry.rank : null;

        let milestone: string | null = null;
        if (entry.rank <= 3) {
          milestone = 'Top 3 🔥';
        } else if (entry.rank <= 10) {
          milestone = 'Top 10 🚀';
        } else if (entry.rank <= 30) {
          milestone = 'Page 1 Hero ⭐';
        } else if (i === 0) {
          milestone = 'First Indexed 📌';
        }

        // Correlate with sales around this check date (within ±7 days or cumulative)
        const checkDate = new Date(entry.date);
        const statsUpToDate = image.stats.filter(
          (s) => new Date(s.date) <= checkDate
        );
        const cumulativeDownloads = statsUpToDate.reduce((sum, s) => sum + s.downloads, 0);
        const cumulativeEarnings = statsUpToDate.reduce((sum, s) => sum + s.earnings, 0);

        chronologicalHistory.push({
          date: entry.date,
          keyword,
          rank: entry.rank,
          previousRank: prev ? prev.rank : null,
          rankDelta: delta,
          isNew: prev === null,
          pageNumber: entry.pageNumber,
          milestone,
          cumulativeDownloads,
          cumulativeEarnings,
        });
      }
    }

    // Sort history newest first
    chronologicalHistory.sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    // Sales and earnings aggregates
    const totalEarnings = image.stats.reduce((sum, s) => sum + s.earnings, 0);
    const totalDownloads = image.totalDownloads || image.asDownloads || image.stats.reduce((sum, s) => sum + s.downloads, 0);

    return NextResponse.json(
      {
        artwork: {
          id: image.id,
          code: image.code,
          title: image.title,
          filePath: image.filePath,
          asId: image.asId,
          ssId: image.ssId,
          totalDownloads,
          asDownloads: image.asDownloads,
          totalEarnings,
          keywords: image.keywords,
          createdAt: image.createdAt,
        },
        activeKeywords,
        history: chronologicalHistory,
        statsTimeline: image.stats.map((s) => ({
          date: s.date,
          platform: s.platform,
          downloads: s.downloads,
          earnings: s.earnings,
        })),
      },
      { headers: { 'Access-Control-Allow-Origin': '*' } }
    );
  } catch (error) {
    console.error('Error fetching artwork SERP correlation:', error);
    return NextResponse.json(
      { error: 'Failed to fetch artwork SERP details' },
      { status: 500, headers: { 'Access-Control-Allow-Origin': '*' } }
    );
  }
}
