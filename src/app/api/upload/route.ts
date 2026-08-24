import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import path from 'path';
import fs from 'fs/promises';
import { reconcileImageSales } from '@/lib/salesReconciler';
import { getNextImageCode, parseImageCode } from '@/lib/imageCode';
import { scheduleAutoBackup } from '@/lib/dbBackup';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const dateStr = searchParams.get('date') || '';
    
    const result = await getNextImageCode(prisma, dateStr);
    return NextResponse.json(result);
  } catch (error) {
    console.error('Failed to get next image code:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    
    const file = formData.get('file') as File;
    const title = formData.get('title') as string;
    const keywords = formData.get('keywords') as string;
    const codeRaw = (formData.get('code') as string || '').trim();

    if (!file || !title || !keywords) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const uploadDateStr = formData.get('uploadDate') as string | null;
    let createdAt = new Date();
    if (uploadDateStr) {
      const parsed = new Date(uploadDateStr);
      if (!isNaN(parsed.getTime())) {
        createdAt = parsed;
      }
    }

    const fullYear = createdAt.getFullYear();
    const monthNum = createdAt.getMonth() + 1;

    let code: string | null = codeRaw || null;
    let year: number | null = fullYear;
    let month: number | null = monthNum;
    let seqNumber: number | null = null;

    if (code) {
      // Validate uniqueness
      const existing = await prisma.image.findUnique({
        where: { code },
      });

      if (existing) {
        return NextResponse.json(
          { error: `Image code "${code}" already exists in the system.` },
          { status: 409 }
        );
      }

      // Try parsing YYMM-Seq format e.g. 2608-123 or 2608-0123
      const parsedCode = parseImageCode(code);
      if (parsedCode) {
        year = parsedCode.year;
        month = parsedCode.month;
        seqNumber = parsedCode.seqNumber;
      }
    } else {
      // Auto-generate code based on highest sequence in that month and year
      const nextResult = await getNextImageCode(prisma, createdAt);
      code = nextResult.nextCode;
      year = nextResult.year;
      month = nextResult.month;
      seqNumber = nextResult.seqNumber;
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const uploadsDir = path.resolve(process.cwd(), 'public', 'uploads');
    
    // Ensure the uploads directory exists
    try {
      await fs.access(uploadsDir);
    } catch {
      await fs.mkdir(uploadsDir, { recursive: true });
    }

    const uniqueFilename = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
    const filePath = path.join(uploadsDir, uniqueFilename);
    
    await fs.writeFile(filePath, buffer);

    const category = (formData.get('category') as string || '').trim() || null;
    const tags = (formData.get('tags') as string || '').trim() || null;
    const notes = (formData.get('notes') as string || '').trim() || null;
    const ssId = (formData.get('ssId') as string || '').trim() || null;
    const asId = (formData.get('asId') as string || '').trim() || null;
    const vzId = (formData.get('vzId') as string || '').trim() || null;
    const ssDownloads = parseInt(formData.get('ssDownloads') as string || '0', 10);
    const asDownloads = parseInt(formData.get('asDownloads') as string || '0', 10);
    const vzDownloads = parseInt(formData.get('vzDownloads') as string || '0', 10);
    const validSsDownloads = isNaN(ssDownloads) ? 0 : ssDownloads;
    const validAsDownloads = isNaN(asDownloads) ? 0 : asDownloads;
    const validVzDownloads = isNaN(vzDownloads) ? 0 : vzDownloads;
    const totalDownloads = validSsDownloads + validAsDownloads + validVzDownloads;

    const initialStats: any[] = [];
    if (validSsDownloads > 0) {
      initialStats.push({ platform: 'Shutterstock', downloads: validSsDownloads, earnings: 0, date: createdAt });
    }
    if (validAsDownloads > 0) {
      initialStats.push({ platform: 'Adobe Stock', downloads: validAsDownloads, earnings: 0, date: createdAt });
    }
    if (validVzDownloads > 0) {
      initialStats.push({ platform: 'Vecteezy', downloads: validVzDownloads, earnings: 0, date: createdAt });
    }

    let newImage = await prisma.image.create({
      data: {
        code,
        year,
        month,
        seqNumber,
        title,
        keywords,
        category,
        tags,
        notes,
        filePath: filePath, // Storing absolute path for /api/image
        ssId,
        asId,
        vzId,
        ssDownloads: validSsDownloads,
        asDownloads: validAsDownloads,
        totalDownloads,
        status: 'uploaded',
        createdAt,
        ...(initialStats.length > 0
          ? {
              stats: {
                create: initialStats,
              },
            }
          : {}),
      },
    });

    if (newImage.asId || newImage.ssId || newImage.vzId) {
      await reconcileImageSales(prisma, newImage);

      // Auto-reconcile SERP rankings if rankings were crawled prior to upload
      try {
        const platformIds = [newImage.asId, newImage.ssId, newImage.vzId].filter(Boolean) as string[];
        if (platformIds.length > 0) {
          await prisma.serpItem.updateMany({
            where: { assetId: { in: platformIds } },
            data: { isMine: true, matchedImageId: newImage.id },
          });
        }
      } catch (_) {}

      newImage = (await prisma.image.findUnique({ where: { id: newImage.id } })) || newImage;
    }

    // Schedule debounced auto-backup after image creation
    scheduleAutoBackup();

    return NextResponse.json(newImage, { status: 201 });

  } catch (error: any) {
    console.error('Upload Error:', error);
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'Image code already exists in the system.' },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
