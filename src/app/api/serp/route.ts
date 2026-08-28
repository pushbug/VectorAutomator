import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { scheduleAutoBackup } from '@/lib/dbBackup';
import { autoReconcileSerpItems } from '@/lib/serpReconciler';

export function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const queryId = searchParams.get('queryId');
    const view = searchParams.get('view') || 'artworks'; // 'artworks' | 'queries'
    const keyword = searchParams.get('keyword') || undefined;
    const platform = searchParams.get('platform') || undefined;
    const search = searchParams.get('search') || undefined;
    const sortBy = searchParams.get('sortBy') || 'date';
    const sortOrder = (searchParams.get('sortOrder') || 'desc').toLowerCase() === 'asc' ? 'asc' : 'desc';
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.max(1, Math.min(100, parseInt(searchParams.get('limit') || '100', 10)));
    const skip = (page - 1) * limit;

    // Auto-reconcile SerpItems with newly populated Image IDs (asId, ssId, vzId)
    await autoReconcileSerpItems(prisma);

    // 1. Single Query Detail (for FullSerpModal / Competitor View)
    if (queryId) {
      const query = await prisma.serpQuery.findUnique({
        where: { id: queryId },
        include: {
          items: {
            orderBy: { rank: 'asc' },
            include: {
              matchedImage: {
                select: { id: true, code: true, title: true, filePath: true, asDownloads: true, totalDownloads: true },
              },
            },
          },
        },
      });

      if (!query) {
        return NextResponse.json({ error: 'SERP query not found' }, { status: 404 });
      }

      // Compute author distribution / leaderboard
      const authorMap = new Map<string, number>();
      for (const item of query.items) {
        const authorName = item.author || 'Unknown Author';
        authorMap.set(authorName, (authorMap.get(authorName) || 0) + 1);
      }

      const topAuthors = Array.from(authorMap.entries())
        .map(([author, count]) => ({ author, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      return NextResponse.json({ query, topAuthors }, { headers: { 'Access-Control-Allow-Origin': '*' } });
    }

    const startDate = searchParams.get('startDate') || undefined;
    const endDate = searchParams.get('endDate') || undefined;

    // 2. View: Ranked Artworks (Default Main Dashboard Table)
    if (view === 'artworks') {
      // Find all SerpItems where isMine is true
      const itemWhere: Record<string, unknown> = {
        isMine: true,
      };

      const queryWhere: Record<string, unknown> = {};
      if (keyword) {
        queryWhere.keyword = { contains: keyword };
      }
      if (startDate || endDate) {
        queryWhere.searchedAt = {
          ...(startDate ? { gte: new Date(`${startDate}T00:00:00.000Z`) } : {}),
          ...(endDate ? { lte: new Date(`${endDate}T23:59:59.999Z`) } : {}),
        };
      }

      if (Object.keys(queryWhere).length > 0) {
        itemWhere.serpQuery = queryWhere;
      }

      if (search) {
        itemWhere.OR = [
          { title: { contains: search } },
          { assetId: { contains: search } },
          { matchedImage: { code: { contains: search } } },
          { matchedImage: { title: { contains: search } } },
        ];
      }

      const [totalCount, serpItems, allQueries] = await Promise.all([
        prisma.serpItem.count({ where: itemWhere }),
        prisma.serpItem.findMany({
          where: itemWhere,
          orderBy: { serpQuery: { searchedAt: 'desc' } },
          skip,
          take: limit,
          include: {
            serpQuery: true,
            matchedImage: {
              include: {
                stats: {
                  select: { downloads: true, earnings: true, platform: true },
                },
              },
            },
          },
        }),
        prisma.serpQuery.findMany({
          orderBy: { searchedAt: 'desc' },
          select: { keyword: true },
          distinct: ['keyword'],
        }),
      ]);

      // Deduplicate: Keep only the latest snapshot per (assetId, keyword) for the main table view
      const latestItemsMap = new Map<string, typeof serpItems[0]>();
      for (const item of serpItems) {
        const key = `${item.assetId}_${item.serpQuery.keyword}`;
        if (!latestItemsMap.has(key)) {
          latestItemsMap.set(key, item);
        }
      }
      const uniqueSerpItems = Array.from(latestItemsMap.values());
      const assetIds = Array.from(new Set(uniqueSerpItems.map((i) => i.assetId).filter(Boolean)));

      // Batch query previous rankings and direct platform stats in parallel (eliminating N+1 loop)
      const [allPrevItems, allDirectStats] = await Promise.all([
        assetIds.length > 0
          ? prisma.serpItem.findMany({
              where: {
                assetId: { in: assetIds },
                isMine: true,
              },
              orderBy: {
                serpQuery: { searchedAt: 'desc' },
              },
              select: {
                assetId: true,
                rank: true,
                serpQuery: { select: { keyword: true, searchedAt: true } },
              },
            })
          : Promise.resolve([]),
        assetIds.length > 0 && prisma.platformStats
          ? prisma.platformStats.findMany({
              where: { platformAssetId: { in: assetIds } },
              select: { platformAssetId: true, downloads: true, earnings: true },
            })
          : Promise.resolve([]),
      ]);

      // Direct stats lookup map
      const directStatsMap = new Map<string, { downloads: number; earnings: number }>();
      for (const s of (allDirectStats || [])) {
        if (!s.platformAssetId) continue;
        const entry = directStatsMap.get(s.platformAssetId) || { downloads: 0, earnings: 0 };
        entry.downloads += (s.downloads || 0);
        entry.earnings += (s.earnings || 0);
        directStatsMap.set(s.platformAssetId, entry);
      }

      // Calculate Rank Deltas and Sales aggregations synchronously
      const enrichedItems = uniqueSerpItems.map((item) => {
        // Find previous ranking for this image/asset under the same keyword
        let previousRank: number | null = null;
        if (allPrevItems && allPrevItems.length > 0) {
          const itemSearchTime = new Date(item.serpQuery.searchedAt).getTime();
          const prevItem = allPrevItems.find(
            (p: any) =>
              p.assetId === item.assetId &&
              p.serpQuery?.keyword === item.serpQuery.keyword &&
              new Date(p.serpQuery.searchedAt).getTime() < itemSearchTime
          );
          if (prevItem) {
            previousRank = prevItem.rank;
          }
        }

        // Delta: positive means improved (e.g. was 10, now 2 -> +8)
        const rankDelta = previousRank !== null ? previousRank - item.rank : null;
        const isNew = previousRank === null;

        // Earnings and downloads rollup
        const statsEarnings = (item.matchedImage?.stats || []).reduce(
          (sum: number, s: any) => sum + s.earnings,
          0
        );
        const statsDownloads = (item.matchedImage?.stats || []).reduce(
          (sum: number, s: any) => sum + s.downloads,
          0
        );
        let totalEarnings = statsEarnings;
        const asDownloads = item.matchedImage?.asDownloads ?? 0;
        let totalDownloads = Math.max(
          statsDownloads,
          item.matchedImage?.totalDownloads ?? 0,
          asDownloads
        );

        // Check if unlinked PlatformStats exist directly in lookup map
        if (item.assetId && directStatsMap.has(item.assetId)) {
          const direct = directStatsMap.get(item.assetId)!;
          totalDownloads = Math.max(totalDownloads, direct.downloads);
          totalEarnings = Math.max(totalEarnings, direct.earnings);
        }

        return {
          id: item.id,
          rank: item.rank,
          assetId: item.assetId,
          title: item.title,
          author: item.author,
          thumbnailUrl: item.thumbnailUrl,
          detailUrl: item.detailUrl,
          keyword: item.serpQuery.keyword,
          platform: item.serpQuery.platform,
          pageNumber: item.serpQuery.pageNumber,
          searchedAt: item.serpQuery.searchedAt,
          serpQueryId: item.serpQueryId,
          matchedImageId: item.matchedImageId,
          imageCode: item.matchedImage?.code || null,
          imageTitle: item.matchedImage?.title || item.title,
          imageFilePath: item.matchedImage?.filePath || null,
          previousRank,
          rankDelta,
          isNew,
          asDownloads,
          totalDownloads,
          totalEarnings,
        };
      });

      // Apply requested sort order on enriched items
      enrichedItems.sort((a, b) => {
        let comparison = 0;
        switch (sortBy) {
          case 'date':
          case 'searchedAt':
            comparison = new Date(a.searchedAt).getTime() - new Date(b.searchedAt).getTime();
            break;
          case 'keyword':
            comparison = (a.keyword || '').localeCompare(b.keyword || '');
            break;
          case 'rank':
            comparison = a.rank - b.rank;
            break;
          case 'delta':
          case 'rankDelta': {
            const valA = a.rankDelta ?? (sortOrder === 'asc' ? 999999 : -999999);
            const valB = b.rankDelta ?? (sortOrder === 'asc' ? 999999 : -999999);
            comparison = valA - valB;
            break;
          }
          case 'downloads':
          case 'totalDownloads':
            comparison = (a.totalDownloads ?? 0) - (b.totalDownloads ?? 0);
            break;
          case 'revenue':
          case 'totalEarnings':
            comparison = (a.totalEarnings ?? 0) - (b.totalEarnings ?? 0);
            break;
          default:
            comparison = new Date(a.searchedAt).getTime() - new Date(b.searchedAt).getTime();
            break;
        }
        return sortOrder === 'asc' ? comparison : -comparison;
      });

      // KPI Summary calculations (Unique assets currently ranking)
      const [uniqueKeywordsCount, page1Count, top10Count, bestRankItem] = await Promise.all([
        prisma.serpQuery.groupBy({
          by: ['keyword'],
        }).then((res) => res.length),
        prisma.serpItem.groupBy({
          by: ['assetId'],
          where: { isMine: true, rank: { lte: 100 } },
        }).then((res) => res.length),
        prisma.serpItem.groupBy({
          by: ['assetId'],
          where: { isMine: true, rank: { lte: 10 } },
        }).then((res) => res.length),
        prisma.serpItem.findFirst({
          where: { isMine: true },
          orderBy: { rank: 'asc' },
          include: { serpQuery: { select: { keyword: true } } },
        }),
      ]);

      const summary = {
        totalKeywords: uniqueKeywordsCount,
        page1Artworks: page1Count,
        top10Artworks: top10Count,
        bestRank: bestRankItem ? `#${bestRankItem.rank} ${bestRankItem.serpQuery.keyword}` : '-',
      };

      const trackedKeywordsList = allQueries.map((q) => q.keyword);

      return NextResponse.json(
        {
          items: enrichedItems,
          summary,
          trackedKeywords: trackedKeywordsList,
          pagination: {
            page,
            limit,
            total: totalCount,
            totalPages: Math.ceil(totalCount / limit) || 1,
          },
        },
        { headers: { 'Access-Control-Allow-Origin': '*' } }
      );
    }

    // 3. View: Queries
    const where: Record<string, unknown> = {
      ...(keyword ? { keyword: { contains: keyword } } : {}),
      ...(platform ? { platform } : {}),
    };

    const [total, queries] = await Promise.all([
      prisma.serpQuery.count({ where }),
      prisma.serpQuery.findMany({
        where,
        orderBy: { searchedAt: 'desc' },
        skip,
        take: limit,
        include: {
          items: {
            where: { isMine: true },
            select: { rank: true, assetId: true, title: true, matchedImageId: true },
          },
        },
      }),
    ]);

    const totalPages = Math.ceil(total / limit) || 1;

    return NextResponse.json(
      {
        queries,
        pagination: {
          page,
          limit,
          total,
          totalPages,
        },
      },
      { headers: { 'Access-Control-Allow-Origin': '*' } }
    );
  } catch (error: any) {
    console.error('Error fetching SERP data:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to fetch SERP data', details: error?.stack },
      { status: 500, headers: { 'Access-Control-Allow-Origin': '*' } }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const idsParam = searchParams.get('ids');

    const targetIds: string[] = [];
    if (id) targetIds.push(id);
    if (idsParam) targetIds.push(...idsParam.split(',').map((s) => s.trim()).filter(Boolean));

    if (targetIds.length === 0) {
      try {
        const body = await request.json();
        if (body.id) targetIds.push(body.id);
        if (Array.isArray(body.ids)) targetIds.push(...body.ids);
      } catch (_) {}
    }

    if (targetIds.length === 0) {
      return NextResponse.json({ error: 'Query ID(s) required' }, { status: 400 });
    }

    await prisma.$transaction([
      prisma.serpItem.deleteMany({
        where: { serpQueryId: { in: targetIds } },
      }),
      prisma.serpQuery.deleteMany({
        where: { id: { in: targetIds } },
      }),
    ]);

    // Schedule debounced auto-backup after ranking deletion
    scheduleAutoBackup();

    return NextResponse.json({ success: true, deletedIds: targetIds });
  } catch (error) {
    console.error('Error deleting SERP query:', error);
    return NextResponse.json({ error: 'Failed to delete SERP query' }, { status: 500 });
  }
}
