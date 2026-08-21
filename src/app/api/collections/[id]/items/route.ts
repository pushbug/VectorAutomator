import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

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
    const rawIds = body.imageIds || (body.imageId ? [body.imageId] : []);
    
    if (!Array.isArray(rawIds) || rawIds.length === 0) {
      return NextResponse.json({ error: 'At least one image ID is required' }, { status: 400 });
    }

    const imageIds = Array.from(new Set(rawIds.filter((x) => typeof x === 'string' && x.trim())));

    // Check which images exist
    const existingImages = await prisma.image.findMany({
      where: { id: { in: imageIds } },
      select: { id: true },
    });
    const validImageIds = existingImages.map((img) => img.id);

    // Get existing collection items to avoid duplicates
    const existingItems = await prisma.collectionItem.findMany({
      where: {
        collectionId: id,
        imageId: { in: validImageIds },
      },
      select: { imageId: true },
    });
    const existingSet = new Set(existingItems.map((it) => it.imageId));

    const newImageIds = validImageIds.filter((imgId) => !existingSet.has(imgId));

    if (newImageIds.length > 0) {
      await prisma.collectionItem.createMany({
        data: newImageIds.map((imageId) => ({
          collectionId: id,
          imageId,
        })),
      });
    }

    return NextResponse.json({
      success: true,
      addedCount: newImageIds.length,
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
