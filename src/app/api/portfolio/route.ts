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
            { category: { contains: search } },
            { code: { contains: search } },
            { tags: { contains: search } },
            { notes: { contains: search } },
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
    const contentType = request.headers.get('content-type') || '';
    let id: string = '';
    let title: string | undefined;
    let keywords: string | undefined;
    let code: string | undefined;
    let uploadDate: string | undefined;
    let category: string | undefined;
    let tags: string | undefined;
    let notes: string | undefined;
    let ssId: string | undefined;
    let asId: string | undefined;
    let vzId: string | undefined;
    let ssDownloads: any;
    let asDownloads: any;
    let file: File | null = null;

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      id = (formData.get('id') as string || '').trim();
      title = formData.has('title') ? (formData.get('title') as string) : undefined;
      keywords = formData.has('keywords') ? (formData.get('keywords') as string) : undefined;
      code = formData.has('code') ? (formData.get('code') as string) : undefined;
      uploadDate = formData.has('uploadDate') ? (formData.get('uploadDate') as string) : undefined;
      category = formData.has('category') ? (formData.get('category') as string) : undefined;
      tags = formData.has('tags') ? (formData.get('tags') as string) : undefined;
      notes = formData.has('notes') ? (formData.get('notes') as string) : undefined;
      ssId = formData.has('ssId') ? (formData.get('ssId') as string) : undefined;
      asId = formData.has('asId') ? (formData.get('asId') as string) : undefined;
      vzId = formData.has('vzId') ? (formData.get('vzId') as string) : undefined;
      ssDownloads = formData.has('ssDownloads') ? formData.get('ssDownloads') : undefined;
      asDownloads = formData.has('asDownloads') ? formData.get('asDownloads') : undefined;
      const fileEntry = formData.get('file');
      if (fileEntry instanceof File && fileEntry.size > 0) {
        file = fileEntry;
      }
    } else {
      const body = await request.json();
      id = body.id;
      title = body.title;
      keywords = body.keywords;
      code = body.code;
      uploadDate = body.uploadDate;
      category = body.category;
      tags = body.tags;
      notes = body.notes;
      ssId = body.ssId;
      asId = body.asId;
      vzId = body.vzId;
      ssDownloads = body.ssDownloads;
      asDownloads = body.asDownloads;
    }

    if (!id) {
      return NextResponse.json({ error: 'Image ID is required' }, { status: 400 });
    }

    const currentImage = await prisma.image.findUnique({ where: { id } });
    if (!currentImage) {
      return NextResponse.json({ error: 'Image not found' }, { status: 404 });
    }

    const dataToUpdate: any = {};

    if (title !== undefined) {
      if (!title.trim()) {
        return NextResponse.json({ error: 'Title cannot be empty' }, { status: 400 });
      }
      dataToUpdate.title = title.trim();
    }

    if (keywords !== undefined) {
      if (!keywords.trim()) {
        return NextResponse.json({ error: 'Keywords cannot be empty' }, { status: 400 });
      }
      dataToUpdate.keywords = keywords.trim();
    }

    if (code !== undefined) {
      const cleanedCode = code.trim() || null;
      if (cleanedCode) {
        // Validate uniqueness excluding current image
        const existing = await prisma.image.findFirst({
          where: {
            code: cleanedCode,
            NOT: { id },
          },
        });

        if (existing) {
          return NextResponse.json(
            { error: `Image code "${cleanedCode}" already exists in the system.` },
            { status: 409 }
          );
        }

        dataToUpdate.code = cleanedCode;
        const match = cleanedCode.match(/^(\d{2})(\d{2})-(\d+)$/);
        if (match) {
          dataToUpdate.year = 2000 + parseInt(match[1], 10);
          dataToUpdate.month = parseInt(match[2], 10);
          dataToUpdate.seqNumber = parseInt(match[3], 10);
        }
      } else {
        dataToUpdate.code = null;
      }
    }

    if (uploadDate !== undefined) {
      const parsedDate = new Date(uploadDate);
      if (!isNaN(parsedDate.getTime())) {
        dataToUpdate.createdAt = parsedDate;
      }
    }

    if (file) {
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      const uploadsDir = path.resolve(process.cwd(), 'public', 'uploads');
      try {
        await fs.access(uploadsDir);
      } catch {
        await fs.mkdir(uploadsDir, { recursive: true });
      }
      const uniqueFilename = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
      const filePath = path.join(uploadsDir, uniqueFilename);
      await fs.writeFile(filePath, buffer);

      if (currentImage.filePath) {
        try {
          await fs.unlink(currentImage.filePath);
        } catch (err: any) {
          console.warn('Could not unlink old image file:', err?.message);
        }
      }

      dataToUpdate.filePath = filePath;
    }

    if (category !== undefined) {
      dataToUpdate.category = typeof category === 'string' ? category.trim() || null : null;
    }
    if (tags !== undefined) {
      dataToUpdate.tags = typeof tags === 'string' ? tags.trim() || null : null;
    }
    if (notes !== undefined) {
      dataToUpdate.notes = typeof notes === 'string' ? notes.trim() || null : null;
    }
    if (ssId !== undefined) {
      dataToUpdate.ssId = typeof ssId === 'string' ? ssId.trim() || null : null;
    }
    if (asId !== undefined) {
      dataToUpdate.asId = typeof asId === 'string' ? asId.trim() || null : null;
    }
    if (vzId !== undefined) {
      dataToUpdate.vzId = typeof vzId === 'string' ? vzId.trim() || null : null;
    }

    if (ssDownloads !== undefined || asDownloads !== undefined) {
      const newSsDownloads = ssDownloads !== undefined ? parseInt(ssDownloads, 10) : currentImage.ssDownloads;
      const newAsDownloads = asDownloads !== undefined ? parseInt(asDownloads, 10) : currentImage.asDownloads;
      dataToUpdate.ssDownloads = isNaN(newSsDownloads) ? currentImage.ssDownloads : newSsDownloads;
      dataToUpdate.asDownloads = isNaN(newAsDownloads) ? currentImage.asDownloads : newAsDownloads;
      dataToUpdate.totalDownloads = dataToUpdate.ssDownloads + dataToUpdate.asDownloads;
    }

    const updatedImage = await prisma.image.update({
      where: { id },
      data: dataToUpdate,
    });

    return NextResponse.json(updatedImage);
  } catch (error: any) {
    console.error('Failed to update portfolio data:', error);
    if (error.code === 'P2002') {
      return NextResponse.json({ error: 'Image code already exists in the system.' }, { status: 409 });
    }
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
