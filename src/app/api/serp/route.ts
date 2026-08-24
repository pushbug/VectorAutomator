import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const keyword = searchParams.get('keyword') || undefined;
    const platform = searchParams.get('platform') || undefined;
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.max(1, Math.min(100, parseInt(searchParams.get('limit') || '20', 10)));
    const skip = (page - 1) * limit;

    const where = {
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
      {
        headers: {
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  } catch (error) {
    console.error('Error fetching SERP queries:', error);
    return NextResponse.json(
      { error: 'Failed to fetch SERP queries' },
      {
        status: 500,
        headers: {
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  }
}
