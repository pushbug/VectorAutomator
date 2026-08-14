import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@/generated/prisma/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import path from 'path';
import fs from 'fs/promises';

const dbPath = path.resolve(process.cwd(), 'dev.db');
const adapter = new PrismaBetterSqlite3({ url: dbPath });
const prisma = new PrismaClient({ adapter });

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '100', 10);
    const sortBy = searchParams.get('sortBy') || 'createdAt';
    const sortOrder = searchParams.get('sortOrder') || 'desc';
    const search = searchParams.get('search') || '';
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const skip = (page - 1) * limit;

    const where: any = search
      ? {
          OR: [
            { title: { contains: search } },
            { keywords: { contains: search } },
            { code: { contains: search } },
          ],
        }
      : {};

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt.gte = new Date(startDate);
      }
      if (endDate) {
        // To include the entire end date, set time to 23:59:59.999
        const end = new Date(endDate);
        end.setUTCHours(23, 59, 59, 999);
        where.createdAt.lte = end;
      }
    }

    const [images, totalCount] = await Promise.all([
      prisma.image.findMany({
        where,
        skip,
        take: limit,
        orderBy: {
          [sortBy]: sortOrder,
        },
        include: {
          stats: {
            orderBy: { date: 'desc' },
          },
        },
      }),
      prisma.image.count({ where }),
    ]);

    const enrichedImages = images.map((img: any) => {
      const stats = img.stats || [];
      const totalEarnings = stats.reduce((sum: number, s: any) => sum + (s.earnings || 0), 0);
      const platformBreakdown: Record<string, { downloads: number; earnings: number }> = {};
      
      for (const stat of stats) {
        if (!platformBreakdown[stat.platform]) {
          platformBreakdown[stat.platform] = { downloads: 0, earnings: 0 };
        }
        platformBreakdown[stat.platform].downloads += stat.downloads;
        platformBreakdown[stat.platform].earnings += stat.earnings;
      }

      return {
        ...img,
        totalEarnings,
        platformBreakdown,
      };
    });

    return NextResponse.json({
      data: enrichedImages,
      meta: {
        total: totalCount,
        page,
        limit,
        totalPages: Math.ceil(totalCount / limit),
      },
    });
  } catch (error) {
    console.error('Failed to fetch portfolio data:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ssDownloads, asDownloads } = body;

    if (!id) {
      return new NextResponse('Image ID is required', { status: 400 });
    }

    const currentImage = await prisma.image.findUnique({ where: { id } });
    if (!currentImage) {
      return new NextResponse('Image not found', { status: 404 });
    }

    // Compute updated values, falling back to existing if not provided
    const newSsDownloads = ssDownloads !== undefined ? parseInt(ssDownloads, 10) : currentImage.ssDownloads;
    const newAsDownloads = asDownloads !== undefined ? parseInt(asDownloads, 10) : currentImage.asDownloads;

    // Enforce totalDownloads sum logic
    const totalDownloads = newSsDownloads + newAsDownloads;

    const updatedImage = await prisma.image.update({
      where: { id },
      data: {
        ssDownloads: newSsDownloads,
        asDownloads: newAsDownloads,
        totalDownloads,
      },
    });

    return NextResponse.json(updatedImage);
  } catch (error) {
    console.error('Failed to update portfolio data:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
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
      return NextResponse.json({ error: 'Image ID is required' }, { status: 400 });
    }

    const image = await prisma.image.findUnique({ where: { id } });
    if (!image) {
      return NextResponse.json({ error: 'Image not found' }, { status: 404 });
    }

    // Safely remove file if it exists
    if (image.filePath) {
      try {
        await fs.unlink(image.filePath);
      } catch (err: any) {
        // File may have been moved or manually deleted, proceed with DB deletion
        console.warn(`File unlink warning for ${image.filePath}:`, err?.message);
      }
    }

    // Delete image from database (cascades platformStats)
    await prisma.image.delete({
      where: { id },
    });

    return NextResponse.json({ success: true, deletedId: id });
  } catch (error) {
    console.error('Failed to delete image:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
