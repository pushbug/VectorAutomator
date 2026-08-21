import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { aggregateKeywordTokens, KeywordSortMode, PortfolioReferenceImage } from '@/lib/keywordAnalytics';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const search = searchParams.get('search') || '';
    const sortBy = (searchParams.get('sortBy') || 'earnings') as KeywordSortMode;
    const sortOrder = (searchParams.get('sortOrder') === 'asc' ? 'asc' : 'desc') as 'asc' | 'desc';
    const tier = searchParams.get('tier') || 'all';
    const minFrequency = parseInt(searchParams.get('minFrequency') || '1', 10);
    const timeRange = searchParams.get('timeRange') || 'all';

    let cutoffDate: Date | null = null;
    const now = new Date();
    if (timeRange === '30d') {
      cutoffDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    } else if (timeRange === '90d') {
      cutoffDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    } else if (timeRange === '1y') {
      cutoffDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
    }

    const images = await prisma.image.findMany({
      select: {
        id: true,
        code: true,
        title: true,
        keywords: true,
        totalDownloads: true,
        filePath: true,
        stats: {
          select: {
            downloads: true,
            earnings: true,
            platform: true,
            date: true,
          },
        },
      },
    });

    let totalTaggedAssets = 0;
    const refImages: PortfolioReferenceImage[] = images.map((img) => {
      if (img.keywords && img.keywords.trim().length > 0) {
        totalTaggedAssets++;
      }

      const filteredStats = img.stats && img.stats.length > 0
        ? (cutoffDate
            ? img.stats.filter(s => new Date(s.date).getTime() >= cutoffDate!.getTime())
            : img.stats)
        : [];

      const earnings = filteredStats.reduce((acc, s) => acc + (s.earnings || 0), 0);
      const scopedDownloads = cutoffDate
        ? filteredStats.reduce((acc, s) => acc + (s.downloads || 0), 0)
        : (img.totalDownloads ?? 0);

      return {
        id: img.id,
        code: img.code,
        title: img.title,
        keywords: img.keywords,
        totalDownloads: scopedDownloads,
        totalEarnings: earnings,
        filePath: img.filePath,
      };
    });

    // Aggregate tokens across all assets
    const allTokens = aggregateKeywordTokens(refImages, {
      sortBy,
      sortOrder,
      search,
      tier,
      minFrequency,
    });

    // Compute top performers from full dataset
    let topEarning = { keyword: '-', earnings: 0 };
    let topDownloaded = { keyword: '-', downloads: 0 };

    for (const t of allTokens) {
      if (t.totalEarnings > topEarning.earnings) {
        topEarning = { keyword: t.keyword, earnings: t.totalEarnings };
      }
      if (t.totalDownloads > topDownloaded.downloads) {
        topDownloaded = { keyword: t.keyword, downloads: t.totalDownloads };
      }
    }

    const totalCount = allTokens.length;
    const totalPages = Math.ceil(totalCount / limit) || 1;
    const skip = (Math.max(1, page) - 1) * limit;
    const paginatedData = allTokens.slice(skip, skip + limit);

    return NextResponse.json({
      data: paginatedData,
      meta: {
        total: totalCount,
        page: Math.max(1, page),
        limit,
        totalPages,
      },
      summary: {
        totalUniqueKeywords: totalCount,
        totalTaggedAssets,
        topEarningKeyword: topEarning.earnings > 0 ? topEarning : null,
        topDownloadedKeyword: topDownloaded.downloads > 0 ? topDownloaded : null,
      },
    });
  } catch (error) {
    console.error('Failed to fetch keyword analytics:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
