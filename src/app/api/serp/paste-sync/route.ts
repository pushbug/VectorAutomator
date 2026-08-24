import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { parseSerpClipboardText, ParsedSerpItem } from '@/lib/serpPasteParser';

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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    let keyword = String(body.keyword || '').trim();
    let platform = String(body.platform || 'Adobe Stock').trim();
    let pageNumber = Number(body.pageNumber || body.page) || 1;
    let items: ParsedSerpItem[] = [];

    if (body.text && typeof body.text === 'string') {
      const parsed = parseSerpClipboardText(
        body.text,
        keyword || 'untitled',
        pageNumber,
        platform
      );
      keyword = parsed.keyword;
      platform = parsed.platform;
      pageNumber = parsed.pageNumber;
      items = parsed.items;
    } else if (Array.isArray(body.items)) {
      items = body.items.map((item: Record<string, unknown>, idx: number) => ({
        rank: Number(item.rank) || (pageNumber - 1) * 100 + idx + 1,
        assetId: String(item.assetId || item.id || '').replace(/^[#:]+/, '').trim(),
        title: String(item.title || '').trim(),
        author: typeof item.author === 'string' ? item.author : undefined,
        thumbnailUrl: typeof item.thumbnailUrl === 'string' ? item.thumbnailUrl : undefined,
        detailUrl: typeof item.detailUrl === 'string' ? item.detailUrl : undefined,
      }));
    }

    if (!keyword) {
      keyword = 'untitled';
    }

    if (items.length === 0) {
      return NextResponse.json(
        { error: 'No search result items provided or parsed' },
        {
          status: 400,
          headers: { 'Access-Control-Allow-Origin': '*' },
        }
      );
    }

    // 1. Cross-reference Asset IDs with existing portfolio images (Image.asId)
    const validAssetIds = items.map((i) => i.assetId).filter((id) => Boolean(id) && !id.startsWith('row_') && !id.startsWith('temp_'));

    const matchingImages = validAssetIds.length > 0
      ? await prisma.image.findMany({
          where: {
            asId: { in: validAssetIds },
          },
          select: {
            id: true,
            asId: true,
            title: true,
          },
        })
      : [];

    const assetIdToImageMap = new Map<string, string>();
    for (const img of matchingImages) {
      if (img.asId) {
        assetIdToImageMap.set(img.asId, img.id);
      }
    }

    // Prepare items with isMine and matchedImageId
    const processedItems = items.map((item) => {
      const matchedImageId = assetIdToImageMap.get(item.assetId) || null;
      return {
        ...item,
        isMine: Boolean(matchedImageId),
        matchedImageId,
      };
    });

    const myItems = processedItems.filter((i) => i.isMine);
    const myRanks = myItems.map((i) => i.rank);

    // 2. Persist SerpQuery and SerpItems atomically
    const savedQuery = await prisma.$transaction(async (tx) => {
      const queryRecord = await tx.serpQuery.create({
        data: {
          keyword,
          platform,
          pageNumber,
          totalItems: processedItems.length,
          myItemsCount: myItems.length,
          searchedAt: new Date(),
          items: {
            create: processedItems.map((item) => ({
              rank: item.rank,
              assetId: item.assetId,
              title: item.title,
              author: item.author,
              thumbnailUrl: item.thumbnailUrl,
              detailUrl: item.detailUrl,
              isMine: item.isMine,
              matchedImageId: item.matchedImageId,
            })),
          },
        },
        include: {
          items: {
            where: { isMine: true },
          },
        },
      });

      return queryRecord;
    });

    return NextResponse.json(
      {
        success: true,
        serpQueryId: savedQuery.id,
        keyword: savedQuery.keyword,
        platform: savedQuery.platform,
        pageNumber: savedQuery.pageNumber,
        totalItems: savedQuery.totalItems,
        myItemsCount: savedQuery.myItemsCount,
        myRanks,
        myItems: savedQuery.items,
      },
      {
        status: 201,
        headers: {
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  } catch (error) {
    console.error('Error syncing SERP paste data:', error);
    return NextResponse.json(
      { error: 'Failed to sync SERP data' },
      {
        status: 500,
        headers: {
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  }
}
