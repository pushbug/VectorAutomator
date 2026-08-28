import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { parseSerpClipboardText, ParsedSerpItem } from '@/lib/serpPasteParser';
import { scheduleAutoBackup, createDbBackup } from '@/lib/dbBackup';

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
    const customDate = body.searchedAt || body.statementDate || body.date;
    const searchedAt = customDate ? new Date(customDate) : new Date();
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

    // 1. Cross-reference Asset IDs with existing portfolio images (Image.asId, Image.ssId, Image.vzId)
    const validAssetIds = items.map((i) => i.assetId).filter((id) => Boolean(id) && !id.startsWith('row_') && !id.startsWith('temp_'));

    const matchingImages = validAssetIds.length > 0
      ? await prisma.image.findMany({
          where: {
            OR: [
              { asId: { in: validAssetIds } },
              { ssId: { in: validAssetIds } },
              { vzId: { in: validAssetIds } },
            ],
          },
          select: {
            id: true,
            asId: true,
            ssId: true,
            vzId: true,
            title: true,
          },
        })
      : [];

    const assetIdToImageMap = new Map<string, string>();
    for (const img of matchingImages) {
      if (img.asId) assetIdToImageMap.set(img.asId, img.id);
      if (img.ssId) assetIdToImageMap.set(img.ssId, img.id);
      if (img.vzId) assetIdToImageMap.set(img.vzId, img.id);
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

    // Calculate day boundaries for daily snapshot replacement
    const startOfDay = new Date(searchedAt);
    startOfDay.setUTCHours(0, 0, 0, 0);
    const endOfDay = new Date(searchedAt);
    endOfDay.setUTCHours(23, 59, 59, 999);

    // 2. Persist SerpQuery and SerpItems atomically (Replacing any existing query for same keyword, platform & day)
    const savedQuery = await prisma.$transaction(async (tx) => {
      const existingQueries = await tx.serpQuery.findMany({
        where: {
          keyword,
          platform,
          searchedAt: {
            gte: startOfDay,
            lte: endOfDay,
          },
        },
        select: { id: true },
      });

      if (existingQueries.length > 0) {
        const queryIds = existingQueries.map((q) => q.id);
        await tx.serpItem.deleteMany({
          where: { serpQueryId: { in: queryIds } },
        });
        await tx.serpQuery.deleteMany({
          where: { id: { in: queryIds } },
        });
      }

      const queryRecord = await tx.serpQuery.create({
        data: {
          keyword,
          platform,
          pageNumber,
          totalItems: processedItems.length,
          myItemsCount: myItems.length,
          searchedAt,
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
            include: {
              matchedImage: {
                select: {
                  id: true,
                  code: true,
                  title: true,
                  filePath: true,
                },
              },
            },
          },
        },
      });

      return queryRecord;
    });

    // Immediate auto-backup after ranking snapshot sync
    try {
      await createDbBackup();
    } catch (err) {
      console.warn('Post-sync SERP backup warning:', err);
    }

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
        myItems: (savedQuery.items || []).map((item: any) => ({
          id: item.id,
          rank: item.rank,
          assetId: item.assetId,
          title: item.matchedImage?.title || item.title,
          author: item.author,
          thumbnailUrl: item.thumbnailUrl,
          detailUrl: item.detailUrl,
          isMine: item.isMine,
          matchedImageId: item.matchedImageId,
          imageCode: item.matchedImage?.code || null,
          imageTitle: item.matchedImage?.title || item.title,
          imageFilePath: item.matchedImage?.filePath || null,
        })),
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
