import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const search = (searchParams.get('search') || '').trim().toLowerCase();
    const sortBy = searchParams.get('sortBy') || 'updatedAt';
    const sortOrder = (searchParams.get('sortOrder') || 'desc') as 'asc' | 'desc';

    const where: any = {};
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { description: { contains: search } },
      ];
    }

    const collections = await prisma.collection.findMany({
      where,
      orderBy: {
        [sortBy === 'name' || sortBy === 'createdAt' ? sortBy : 'updatedAt']: sortOrder,
      },
      include: {
        items: {
          include: {
            image: {
              include: {
                stats: true,
              },
            },
          },
          orderBy: { addedAt: 'desc' },
        },
      },
    });

    const enrichedCollections = collections.map((col) => {
      const items = col.items || [];
      const totalImages = items.length;
      
      let totalDownloads = 0;
      let totalEarnings = 0;

      const previewImages: Array<{ id: string; filePath: string; title: string; code: string | null }> = [];

      for (let i = 0; i < items.length; i++) {
        const img = items[i].image;
        if (!img) continue;

        totalDownloads += img.totalDownloads || 0;
        const imgEarnings = (img.stats || []).reduce((sum, s) => sum + (s.earnings || 0), 0);
        totalEarnings += imgEarnings;

        if (previewImages.length < 4) {
          previewImages.push({
            id: img.id,
            filePath: img.filePath,
            title: img.title,
            code: img.code,
          });
        }
      }

      // Resolve cover image
      let coverImage: { id: string; filePath: string; title: string; code: string | null } | null = null;
      if (col.coverId) {
        const found = items.find((it) => it.image?.id === col.coverId);
        if (found?.image) {
          coverImage = {
            id: found.image.id,
            filePath: found.image.filePath,
            title: found.image.title,
            code: found.image.code,
          };
        }
      }
      if (!coverImage && previewImages.length > 0) {
        coverImage = previewImages[0];
      }

      const avgRpi = totalImages > 0 ? totalEarnings / totalImages : 0;

      return {
        id: col.id,
        name: col.name,
        description: col.description,
        coverId: col.coverId,
        createdAt: col.createdAt,
        updatedAt: col.updatedAt,
        totalImages,
        totalDownloads,
        totalEarnings,
        avgRpi,
        coverImage,
        previewImages,
      };
    });

    // Client-side sorting for computed fields
    if (sortBy === 'totalDownloads') {
      enrichedCollections.sort((a, b) => 
        sortOrder === 'asc' ? a.totalDownloads - b.totalDownloads : b.totalDownloads - a.totalDownloads
      );
    } else if (sortBy === 'totalEarnings') {
      enrichedCollections.sort((a, b) => 
        sortOrder === 'asc' ? a.totalEarnings - b.totalEarnings : b.totalEarnings - a.totalEarnings
      );
    } else if (sortBy === 'totalImages') {
      enrichedCollections.sort((a, b) => 
        sortOrder === 'asc' ? a.totalImages - b.totalImages : b.totalImages - a.totalImages
      );
    }

    return NextResponse.json({
      data: enrichedCollections,
      meta: {
        total: enrichedCollections.length,
      },
    });
  } catch (error) {
    console.error('Failed to fetch collections:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, description, coverId, imageIds } = body;

    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json({ error: 'Collection name is required' }, { status: 400 });
    }

    const trimmedName = name.trim();
    const trimmedDesc = typeof description === 'string' ? description.trim() || null : null;
    const validatedCoverId = typeof coverId === 'string' ? coverId.trim() || null : null;

    const collection = await prisma.collection.create({
      data: {
        name: trimmedName,
        description: trimmedDesc,
        coverId: validatedCoverId,
      },
    });

    if (Array.isArray(imageIds) && imageIds.length > 0) {
      const uniqueImageIds = Array.from(new Set(imageIds.filter((id) => typeof id === 'string' && id.trim())));
      
      if (uniqueImageIds.length > 0) {
        await prisma.collectionItem.createMany({
          data: uniqueImageIds.map((imgId) => ({
            collectionId: collection.id,
            imageId: imgId,
          })),
          // Ignore duplicates if any
        });
      }
    }

    const result = await prisma.collection.findUnique({
      where: { id: collection.id },
      include: {
        items: {
          include: {
            image: true,
          },
        },
      },
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error: any) {
    console.error('Failed to create collection:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
