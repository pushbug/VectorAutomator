import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1; // 1-12

    const startOfMonth = new Date(currentYear, currentMonth - 1, 1, 0, 0, 0, 0);
    const endOfMonth = new Date(currentYear, currentMonth, 0, 23, 59, 59, 999);
    const daysInMonth = new Date(currentYear, currentMonth, 0).getDate();
    const daysRemaining = Math.max(0, daysInMonth - now.getDate());

    // Run aggregations concurrently
    const [
      totalVectors,
      monthlyVectors,
      pendingCount,
      totalDownloadsAgg,
      monthStatsAgg,
      latestAsset,
      recentUploads,
      topPerformersQuery,
    ] = await Promise.all([
      prisma.image.count(),
      prisma.image.count({
        where: {
          OR: [
            { year: currentYear, month: currentMonth },
            { createdAt: { gte: startOfMonth, lte: endOfMonth } },
          ],
        },
      }),
      prisma.image.count({ where: { status: 'pending' } }),
      prisma.image.aggregate({
        _sum: { totalDownloads: true },
      }),
      prisma.platformStats.aggregate({
        _sum: { earnings: true, downloads: true },
        where: {
          date: { gte: startOfMonth, lte: endOfMonth },
        },
      }),
      prisma.image.findFirst({
        orderBy: [
          { year: 'desc' },
          { month: 'desc' },
          { seqNumber: 'desc' },
          { createdAt: 'desc' },
        ],
        select: { code: true },
      }),
      prisma.image.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          code: true,
          title: true,
          filePath: true,
          status: true,
          totalDownloads: true,
          ssDownloads: true,
          asDownloads: true,
          keywords: true,
          createdAt: true,
        },
      }),
      prisma.image.findMany({
        take: 5,
        where: { totalDownloads: { gt: 0 } },
        orderBy: { totalDownloads: 'desc' },
        select: {
          id: true,
          code: true,
          title: true,
          filePath: true,
          status: true,
          totalDownloads: true,
          ssDownloads: true,
          asDownloads: true,
          keywords: true,
          createdAt: true,
        },
      }),
    ]);

    const targetGoal = 50;
    const goalPercentage = targetGoal > 0 ? Math.min(100, Math.round((monthlyVectors / targetGoal) * 100)) : 0;
    const topPerformers = topPerformersQuery.length > 0 ? topPerformersQuery : recentUploads;

    return NextResponse.json({
      summary: {
        totalVectors,
        monthlyVectors,
        pendingCount,
        totalDownloads: totalDownloadsAgg._sum.totalDownloads || 0,
        currentMonthEarnings: Number((monthStatsAgg._sum.earnings || 0).toFixed(2)),
        currentMonthDownloads: monthStatsAgg._sum.downloads || 0,
        latestCode: latestAsset?.code || 'No uploads yet',
      },
      monthlyGoal: {
        target: targetGoal,
        current: monthlyVectors,
        percentage: goalPercentage,
        daysRemaining,
        currentMonthName: now.toLocaleString('en-US', { month: 'long', year: 'numeric' }),
      },
      recentUploads,
      topPerformers,
    });
  } catch (error) {
    console.error('Error in GET /api/dashboard:', error);
    return NextResponse.json({ error: 'Failed to fetch dashboard metrics' }, { status: 500 });
  }
}
