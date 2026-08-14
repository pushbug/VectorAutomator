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
    const dateStr = searchParams.get('date') || '';
    
    let targetDate = new Date();
    if (dateStr) {
      const parsed = new Date(dateStr);
      if (!isNaN(parsed.getTime())) {
        targetDate = parsed;
      }
    }

    const fullYear = targetDate.getFullYear();
    const yy = String(fullYear).slice(-2);
    const mm = String(targetDate.getMonth() + 1).padStart(2, '0');
    const month = targetDate.getMonth() + 1;

    // Find highest seqNumber for this year
    const highestImage = await prisma.image.findFirst({
      where: { year: fullYear },
      orderBy: { seqNumber: 'desc' },
      select: { seqNumber: true },
    });

    const nextSeq = (highestImage?.seqNumber ?? 0) + 1;
    const nextCode = `${yy}${mm}-${nextSeq}`;

    return NextResponse.json({
      nextCode,
      year: fullYear,
      month,
      seqNumber: nextSeq,
    });
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

    let code: string | null = codeRaw || null;
    let year: number | null = createdAt.getFullYear();
    let month: number | null = createdAt.getMonth() + 1;
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
      const match = code.match(/^(\d{2})(\d{2})-(\d+)$/);
      if (match) {
        const parsedYear = 2000 + parseInt(match[1], 10);
        const parsedMonth = parseInt(match[2], 10);
        const parsedSeq = parseInt(match[3], 10);
        year = parsedYear;
        month = parsedMonth;
        seqNumber = parsedSeq;
      }
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

    const ssDownloads = parseInt(formData.get('ssDownloads') as string || '0', 10);
    const asDownloads = parseInt(formData.get('asDownloads') as string || '0', 10);
    const totalDownloads = (isNaN(ssDownloads) ? 0 : ssDownloads) + (isNaN(asDownloads) ? 0 : asDownloads);

    const newImage = await prisma.image.create({
      data: {
        code,
        year,
        month,
        seqNumber,
        title,
        keywords,
        filePath: filePath, // Storing absolute path for /api/image
        ssDownloads: isNaN(ssDownloads) ? 0 : ssDownloads,
        asDownloads: isNaN(asDownloads) ? 0 : asDownloads,
        totalDownloads,
        status: 'uploaded',
        createdAt,
      },
    });

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
