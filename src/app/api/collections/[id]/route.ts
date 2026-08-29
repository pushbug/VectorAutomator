import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { parseKeywordsString } from '@/lib/keywordAnalytics';
import { scheduleAutoBackup } from '@/lib/dbBackup';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json({ error: 'Collection ID is required' }, { status: 400 });
    }

    const collection = await prisma.collection.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            image: {
              include: {
                stats: {
                  orderBy: { date: 'desc' },
                },
              },
            },
          },
          orderBy: { addedAt: 'desc' },
        },
      },
    });

    if (!collection) {
      return NextResponse.json({ error: 'Collection not found' }, { status: 404 });
    }

    const items = collection.items || [];
    const totalImages = items.length;

    let totalDownloads = 0;
    let totalEarnings = 0;

    // Keyword frequency mapping
    const keywordMap = new Map<string, { frequency: number; totalDownloads: number; totalEarnings: number }>();

    const images = items
      .filter((it) => it.image !== null)
      .map((it) => {
        const img = it.image!;
        const stats = img.stats || [];
        const imgEarnings = stats.reduce((sum, s) => sum + (s.earnings || 0), 0);
        const imgDownloads = img.totalDownloads || 0;

        totalDownloads += imgDownloads;
        totalEarnings += imgEarnings;

        // Process keywords
        const tokens = parseKeywordsString(img.keywords);
        const uniqueTokensInImage = Array.from(new Set(tokens.map((t) => t.toLowerCase())));

        for (const token of uniqueTokensInImage) {
          const existing = keywordMap.get(token) || { frequency: 0, totalDownloads: 0, totalEarnings: 0 };
          keywordMap.set(token, {
            frequency: existing.frequency + 1,
            totalDownloads: existing.totalDownloads + imgDownloads,
            totalEarnings: existing.totalEarnings + imgEarnings,
          });
        }

        return {
          id: img.id,
          code: img.code,
          title: img.title,
          keywords: img.keywords,
          category: img.category,
          tags: img.tags,
          notes: img.notes,
          status: img.status,
          filePath: img.filePath,
          ssId: img.ssId,
          asId: img.asId,
          vzId: img.vzId,
          ssDownloads: img.ssDownloads,
          asDownloads: img.asDownloads,
          totalDownloads: img.totalDownloads,
          totalEarnings: imgEarnings,
          stats: img.stats || [],
          createdAt: img.createdAt,
          addedAt: it.addedAt,
        };
      });

    // Compute shared keywords with rollups
    const topKeywords = Array.from(keywordMap.entries())
      .map(([keyword, data]) => ({
        keyword,
        frequency: data.frequency,
        percentage: totalImages > 0 ? Math.round((data.frequency / totalImages) * 100) : 0,
        totalDownloads: data.totalDownloads,
        totalEarnings: data.totalEarnings,
      }))
      .sort((a, b) => {
        if (b.frequency !== a.frequency) return b.frequency - a.frequency;
        if (b.totalEarnings !== a.totalEarnings) return b.totalEarnings - a.totalEarnings;
        return b.totalDownloads - a.totalDownloads;
      });

    const avgRpi = totalImages > 0 ? totalEarnings / totalImages : 0;

    return NextResponse.json({
      id: collection.id,
      name: collection.name,
      description: collection.description,
      coverId: collection.coverId,
      createdAt: collection.createdAt,
      updatedAt: collection.updatedAt,
      summary: {
        totalImages,
        totalDownloads,
        totalEarnings,
        avgRpi,
      },
      topKeywords,
      images,
    });
  } catch (error) {
    console.error('Failed to fetch collection detail:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: 'Collection ID is required' }, { status: 400 });
    }

    const body = await request.json();
    const { name, description, coverId } = body;

    const dataToUpdate: any = {};

    if (name !== undefined) {
      if (typeof name !== 'string' || !name.trim()) {
        return NextResponse.json({ error: 'Collection name cannot be empty' }, { status: 400 });
      }
      dataToUpdate.name = name.trim();
    }

    if (description !== undefined) {
      dataToUpdate.description = typeof description === 'string' ? description.trim() || null : null;
    }

    if (coverId !== undefined) {
      dataToUpdate.coverId = typeof coverId === 'string' ? coverId.trim() || null : null;
    }

    const updated = await prisma.collection.update({
      where: { id },
      data: dataToUpdate,
    });

    // Schedule debounced auto-backup after collection update
    scheduleAutoBackup();

    return NextResponse.json(updated);
  } catch (error: any) {
    console.error('Failed to update collection:', error);
    if (error.code === 'P2025') {
      return NextResponse.json({ error: 'Collection not found' }, { status: 404 });
    }
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

    const existing = await prisma.collection.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Collection not found' }, { status: 404 });
    }

    // Deleting collection cascades to CollectionItem records, preserving Image records
    await prisma.collection.delete({
      where: { id },
    });

    // Schedule debounced auto-backup after collection deletion
    scheduleAutoBackup();

    return NextResponse.json({ success: true, deletedId: id });
  } catch (error) {
    console.error('Failed to delete collection:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
