import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@/generated/prisma/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import path from 'path';

const dbPath = path.resolve(process.cwd(), 'dev.db');
const adapter = new PrismaBetterSqlite3({ url: dbPath });
const prisma = new PrismaClient({ adapter });

async function syncImageRollup(imageId?: string | null) {
  if (!imageId) return;
  const allStats = await prisma.platformStats.findMany({
    where: { imageId },
  });

  const totalDownloads = allStats.reduce((sum, s) => sum + s.downloads, 0);
  const ssDownloads = allStats
    .filter((s) => s.platform.toLowerCase() === 'shutterstock')
    .reduce((sum, s) => sum + s.downloads, 0);
  const asDownloads = allStats
    .filter((s) => s.platform.toLowerCase().includes('adobe'))
    .reduce((sum, s) => sum + s.downloads, 0);

  return prisma.image.update({
    where: { id: imageId },
    data: {
      totalDownloads,
      ssDownloads,
      asDownloads,
    },
  });
}


export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const platform = searchParams.get('platform');
    const imageId = searchParams.get('imageId');
    const search = searchParams.get('search');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const sortBy = searchParams.get('sortBy') || 'date';
    const sortOrder = searchParams.get('sortOrder') === 'asc' ? 'asc' : 'desc';

    let orderBy: any = { date: sortOrder };
    if (sortBy === 'earnings') {
      orderBy = { earnings: sortOrder };
    } else if (sortBy === 'downloads') {
      orderBy = { downloads: sortOrder };
    } else if (sortBy === 'platform') {
      orderBy = { platform: sortOrder };
    } else if (sortBy === 'image') {
      orderBy = [
        { image: { code: sortOrder } },
        { platformAssetId: sortOrder },
      ];
    } else {
      orderBy = { date: sortOrder };
    }

    const skip = (page - 1) * limit;

    const where: any = {};

    if (platform === 'unlinked') {
      where.imageId = null;
    } else if (platform && platform !== 'all') {
      where.platform = platform;
    }

    if (imageId && platform !== 'unlinked') {
      where.imageId = imageId;
    }

    if (search) {
      where.OR = [
        { image: { code: { contains: search } } },
        { image: { title: { contains: search } } },
        { platformAssetId: { contains: search } },
      ];
    }


    if (startDate || endDate) {
      where.date = {};
      if (startDate) {
        const start = new Date(startDate);
        start.setUTCHours(0, 0, 0, 0);
        where.date.gte = start;
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setUTCHours(23, 59, 59, 999);
        where.date.lte = end;
      }
    }

    const [sales, totalCount, allMatchingStats] = await Promise.all([
      prisma.platformStats.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {

          image: {
            include: {
              stats: {
                orderBy: { date: 'desc' },
              },
            },
          },
        },
      }),

      prisma.platformStats.count({ where }),
      prisma.platformStats.findMany({
        where,
        select: {
          downloads: true,
          earnings: true,
          platform: true,
        },
      }),
    ]);

    // Calculate aggregated metrics
    const totalEarnings = allMatchingStats.reduce((sum, s) => sum + s.earnings, 0);
    const totalDownloads = allMatchingStats.reduce((sum, s) => sum + s.downloads, 0);

    const platformTotals: Record<string, { downloads: number; earnings: number }> = {};
    for (const stat of allMatchingStats) {
      if (!platformTotals[stat.platform]) {
        platformTotals[stat.platform] = { downloads: 0, earnings: 0 };
      }
      platformTotals[stat.platform].downloads += stat.downloads;
      platformTotals[stat.platform].earnings += stat.earnings;
    }

    let topPlatform = '-';
    let maxEarnings = -1;
    for (const [pName, pData] of Object.entries(platformTotals)) {
      if (pData.earnings > maxEarnings) {
        maxEarnings = pData.earnings;
        topPlatform = pName;
      }
    }

    const enrichedSales = sales.map((sale: any) => {
      if (!sale.image) return sale;
      const stats = sale.image.stats || [];
      const imgTotalEarnings = stats.reduce((sum: number, s: any) => sum + (s.earnings || 0), 0);
      const platformBreakdown: Record<string, { downloads: number; earnings: number }> = {};
      for (const stat of stats) {
        if (!platformBreakdown[stat.platform]) {
          platformBreakdown[stat.platform] = { downloads: 0, earnings: 0 };
        }
        platformBreakdown[stat.platform].downloads += stat.downloads;
        platformBreakdown[stat.platform].earnings += stat.earnings;
      }
      return {
        ...sale,
        image: {
          ...sale.image,
          totalEarnings: imgTotalEarnings,
          platformBreakdown,
        },
      };
    });

    return NextResponse.json({
      data: enrichedSales,

      meta: {
        total: totalCount,
        page,
        limit,
        totalPages: Math.ceil(totalCount / limit) || 1,
      },
      summary: {
        totalEarnings,
        totalDownloads,
        topPlatform,
        platformTotals,
      },
    });
  } catch (error) {
    console.error('Failed to fetch sales:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { imageId, platform, downloads, earnings, date } = body;

    if (!imageId || !platform) {
      return NextResponse.json(
        { error: 'imageId and platform are required' },
        { status: 400 }
      );
    }

    const numDownloads = typeof downloads === 'number' ? downloads : parseInt(downloads || '0', 10);
    const numEarnings = typeof earnings === 'number' ? earnings : parseFloat(earnings || '0');

    if (isNaN(numDownloads) || isNaN(numEarnings) || numDownloads < 0 || numEarnings < 0) {
      return NextResponse.json(
        { error: 'downloads and earnings must be valid non-negative numbers' },
        { status: 400 }
      );
    }

    const image = await prisma.image.findUnique({ where: { id: imageId } });
    if (!image) {
      return NextResponse.json({ error: 'Image not found' }, { status: 404 });
    }

    // Normalize date to UTC Midnight
    const targetDate = date ? new Date(date) : new Date();
    targetDate.setUTCHours(0, 0, 0, 0);

    // Upsert or accumulate if record exists on same image + platform + date
    const existing = await prisma.platformStats.findUnique({
      where: {
        imageId_platform_date: {
          imageId,
          platform,
          date: targetDate,
        },
      },
    });

    let savedStat;
    if (existing) {
      savedStat = await prisma.platformStats.update({
        where: { id: existing.id },
        data: {
          downloads: existing.downloads + numDownloads,
          earnings: existing.earnings + numEarnings,
        },
      });
    } else {
      savedStat = await prisma.platformStats.create({
        data: {
          imageId,
          platform,
          downloads: numDownloads,
          earnings: numEarnings,
          date: targetDate,
        },
      });
    }

    // Sync rollup fields on Image entity
    await syncImageRollup(imageId);

    return NextResponse.json({
      success: true,
      data: savedStat,
    });
  } catch (error) {
    console.error('Failed to log sale:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    let id = searchParams.get('id');

    if (!id) {
      const body = await request.json().catch(() => ({}));
      id = body.id;
    }

    if (!id) {
      return NextResponse.json({ error: 'Sale record ID is required' }, { status: 400 });
    }

    const stat = await prisma.platformStats.findUnique({ where: { id } });
    if (!stat) {
      return NextResponse.json({ error: 'Sale record not found' }, { status: 404 });
    }

    const imageId = stat.imageId;

    await prisma.platformStats.delete({ where: { id } });

    // Sync rollup fields on Image entity if image was linked
    if (imageId) {
      await syncImageRollup(imageId);
    }

    return NextResponse.json({ success: true, deletedId: id });

  } catch (error) {
    console.error('Failed to delete sale record:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
