import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { scheduleAutoBackup } from '@/lib/dbBackup';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: 'Collection ID is required' }, { status: 400 });
    }

    const collection = await prisma.collection.findUnique({ where: { id } });
    if (!collection) {
      return NextResponse.json({ error: 'Collection not found' }, { status: 404 });
    }

    const body = await request.json();
    const rawTokens = [
      ...(Array.isArray(body.imageIds) ? body.imageIds : body.imageId ? [body.imageId] : []),
      ...(Array.isArray(body.asIds) ? body.asIds : body.asId ? [body.asId] : []),
      ...(Array.isArray(body.codes) ? body.codes : body.code ? [body.code] : []),
      ...(Array.isArray(body.identifiers) ? body.identifiers : []),
      ...(Array.isArray(body.tokens) ? body.tokens : []),
    ];
    
    const uniqueTokens = Array.from(
      new Set(
        rawTokens
          .map((x) => (typeof x === 'string' || typeof x === 'number' ? String(x).trim() : ''))
          .filter(Boolean)
      )
    );

    if (uniqueTokens.length === 0) {
      return NextResponse.json({ error: 'At least one image ID or identifier is required' }, { status: 400 });
    }

    // Universal resolution across CUID id, Adobe asId, Image code, Shutterstock ssId, Vecteezy vzId
    // Chunking tokens to avoid SQLite P2029 parameter limit (max 999 host variables)
    const CHUNK_SIZE = 100;
    const matchedImagesMap = new Map<string, { id: string; asId: string | null; code: string | null }>();

    for (let i = 0; i < uniqueTokens.length; i += CHUNK_SIZE) {
      const chunk = uniqueTokens.slice(i, i + CHUNK_SIZE);
      const chunkMatches = await prisma.image.findMany({
        where: {
          OR: [
            { id: { in: chunk } },
            { asId: { in: chunk } },
            { code: { in: chunk } },
            { ssId: { in: chunk } },
            { vzId: { in: chunk } },
          ],
        },
        select: { id: true, asId: true, code: true },
      });

      chunkMatches.forEach((img) => {
        matchedImagesMap.set(img.id, img);
      });
    }

    const validImageIds = Array.from(matchedImagesMap.keys());

    // Get existing collection items in chunks to avoid duplicates and SQLite parameter limits
    const existingSet = new Set<string>();
    for (let i = 0; i < validImageIds.length; i += CHUNK_SIZE) {
      const chunk = validImageIds.slice(i, i + CHUNK_SIZE);
      const existingItems = await prisma.collectionItem.findMany({
        where: {
          collectionId: id,
          imageId: { in: chunk },
        },
        select: { imageId: true },
      });
      existingItems.forEach((it) => existingSet.add(it.imageId));
    }

    const newImageIds = validImageIds.filter((imgId) => !existingSet.has(imgId));

    if (newImageIds.length > 0) {
      // Chunk insert into CollectionItem
      for (let i = 0; i < newImageIds.length; i += CHUNK_SIZE) {
        const chunk = newImageIds.slice(i, i + CHUNK_SIZE);
        await prisma.collectionItem.createMany({
          data: chunk.map((imageId) => ({
            collectionId: id,
            imageId,
          })),
        });
      }

      // Schedule debounced auto-backup after adding items
      scheduleAutoBackup();
    }

    return NextResponse.json({
      success: true,
      matchedCount: validImageIds.length,
      addedCount: newImageIds.length,
      alreadyInCollectionCount: validImageIds.length - newImageIds.length,
      notFoundCount: Math.max(0, uniqueTokens.length - validImageIds.length),
      collectionId: id,
    });
  } catch (error) {
    console.error('Failed to add items to collection:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: 'Collection ID is required' }, { status: 400 });
    }

    const { searchParams } = request.nextUrl;
    let imageId = searchParams.get('imageId');

    if (!imageId) {
      const body = await request.json().catch(() => ({}));
      imageId = body.imageId;
    }

    if (!imageId || typeof imageId !== 'string') {
      return NextResponse.json({ error: 'Image ID is required' }, { status: 400 });
    }

    const deleted = await prisma.collectionItem.deleteMany({
      where: {
        collectionId: id,
        imageId: imageId.trim(),
      },
    });

    if (deleted.count === 0) {
      return NextResponse.json({ error: 'Item not found in collection' }, { status: 404 });
    }

    // Schedule debounced auto-backup after removing items
    scheduleAutoBackup();

    return NextResponse.json({
      success: true,
      removedImageId: imageId,
      collectionId: id,
    });
  } catch (error) {
    console.error('Failed to remove item from collection:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
