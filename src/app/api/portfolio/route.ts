import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import fs from 'fs/promises';
import { reconcileImageSales } from '@/lib/salesReconciler';
import { parseImageCode, getNextImageCode } from '@/lib/imageCode';
import { parseKeywordsString } from '@/lib/keywordAnalytics';
import { calculatePlatformBreakdown } from '@/lib/formatters';
import { scheduleAutoBackup } from '@/lib/dbBackup';
import { saveImageFile, deleteOldImageFile, syncPhysicalUploadFiles } from '@/lib/fileStorage';



export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '100', 10);
    const sortBy = searchParams.get('sortBy') || 'createdAt';
    const sortOrder = searchParams.get('sortOrder') || 'desc';
    const search = searchParams.get('search') || '';
    const searchField = searchParams.get('searchField') || searchParams.get('field') || 'all';
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const idStatus = searchParams.get('idStatus') || 'all';

    // Safe auto-sync disk files on initial portfolio fetch (page 1, non-search)
    if (page === 1 && (!search || search.trim() === '')) {
      try {
        await syncPhysicalUploadFiles(prisma);
      } catch (syncErr) {
        console.error('Safe auto-sync disk files error:', syncErr);
      }
    }

    const skip = (page - 1) * limit;

    const getFieldConditions = (term: string) => {
      if (searchField === 'title') {
        return [
          { title: { contains: term } },
        ];
      }
      if (searchField === 'exactKeyword') {
        const trimmed = term.trim();
        const lower = trimmed.toLowerCase();
        return [
          { keywords: { equals: lower } },
          { keywords: { startsWith: `${lower},` } },
          { keywords: { contains: `, ${lower},` } },
          { keywords: { contains: `,${lower},` } },
          { keywords: { endsWith: `, ${lower}` } },
          { keywords: { endsWith: `,${lower}` } },
          { keywords: { equals: trimmed } },
          { keywords: { startsWith: `${trimmed},` } },
          { keywords: { contains: `, ${trimmed},` } },
          { keywords: { contains: `,${trimmed},` } },
          { keywords: { endsWith: `, ${trimmed}` } },
          { keywords: { endsWith: `,${trimmed}` } },
        ];
      }
      if (searchField === 'keywords' || searchField === 'keyword') {
        return [
          { keywords: { contains: term } },
        ];
      }
      if (searchField === 'code') {
        return [
          { code: { contains: term } },
        ];
      }
      if (searchField === 'ids' || searchField === 'id') {
        return [
          { asId: { contains: term } },
          { ssId: { contains: term } },
          { vzId: { contains: term } },
        ];
      }
      return [
        { title: { contains: term } },
        { keywords: { contains: term } },
        { category: { contains: term } },
        { code: { contains: term } },
        { tags: { contains: term } },
        { notes: { contains: term } },
        { asId: { contains: term } },
        { ssId: { contains: term } },
        { vzId: { contains: term } },
      ];
    };

    const getIdStatusCondition = (status: string) => {
      switch (status) {
        case 'has_asId':
          return {
            AND: [
              { asId: { not: null } },
              { NOT: { asId: '' } },
            ],
          };
        case 'missing_asId':
          return {
            OR: [
              { asId: null },
              { asId: '' },
            ],
          };
        case 'has_ssId':
          return {
            AND: [
              { ssId: { not: null } },
              { NOT: { ssId: '' } },
            ],
          };
        case 'missing_ssId':
          return {
            OR: [
              { ssId: null },
              { ssId: '' },
            ],
          };
        case 'has_vzId':
          return {
            AND: [
              { vzId: { not: null } },
              { NOT: { vzId: '' } },
            ],
          };
        case 'missing_vzId':
          return {
            OR: [
              { vzId: null },
              { vzId: '' },
            ],
          };
        case 'missing_any_id':
          return {
            OR: [
              { asId: null },
              { asId: '' },
              { ssId: null },
              { ssId: '' },
            ],
          };
        case 'missing_all_ids':
          return {
            AND: [
              { OR: [{ asId: null }, { asId: '' }] },
              { OR: [{ ssId: null }, { ssId: '' }] },
            ],
          };
        case 'has_all_ids':
          return {
            AND: [
              { asId: { not: null } },
              { NOT: { asId: '' } },
              { ssId: { not: null } },
              { NOT: { ssId: '' } },
            ],
          };
        case 'missing_image_file':
          return {
            filePath: '',
          };
        case 'has_image_file':
          return {
            filePath: { not: '' },
          };
        case 'all':

        default:
          return null;
      }
    };

    const searchTerms = searchField === 'exactKeyword' 
      ? [search.trim()].filter(Boolean)
      : search.trim().split(/\s+/).filter(Boolean);
    const searchCondition = searchTerms.length === 1
      ? {
          OR: getFieldConditions(searchTerms[0]),
        }
      : searchTerms.length > 1
      ? {
          AND: searchTerms.map((term) => ({
            OR: getFieldConditions(term),
          })),
        }
      : {};

    const andClauses: any[] = [];
    if (Object.keys(searchCondition).length > 0) {
      andClauses.push(searchCondition);
    }

    if (startDate || endDate) {
      const dateClause: any = {};
      if (startDate) {
        dateClause.gte = new Date(startDate);
      }
      if (endDate) {
        // To include the entire end date, set time to 23:59:59.999
        const end = new Date(endDate);
        end.setUTCHours(23, 59, 59, 999);
        dateClause.lte = end;
      }
      andClauses.push({ createdAt: dateClause });
    }

    const idStatusClause = getIdStatusCondition(idStatus);
    if (idStatusClause) {
      andClauses.push(idStatusClause);
    }

    const where: any = andClauses.length === 0
      ? {}
      : andClauses.length === 1
      ? andClauses[0]
      : { AND: andClauses };


    let orderByClause: any;
    if (sortBy === 'createdAt') {
      orderByClause = [
        { year: sortOrder },
        { month: sortOrder },
        { seqNumber: sortOrder },
        { createdAt: sortOrder },
      ];
    } else if (sortBy === 'totalDownloads') {
      orderByClause = [
        { totalDownloads: sortOrder },
        { year: 'desc' },
        { month: 'desc' },
        { seqNumber: 'desc' },
        { createdAt: 'desc' },
      ];
    } else if (sortBy === 'earnings' || sortBy === 'totalEarnings') {
      orderByClause = [
        { totalDownloads: sortOrder },
        { year: 'desc' },
        { month: 'desc' },
        { seqNumber: 'desc' },
        { createdAt: 'desc' },
      ];
    } else {
      const allowedFields = ['title', 'code', 'category', 'status', 'totalDownloads'];
      if (allowedFields.includes(sortBy)) {
        orderByClause = [
          { [sortBy]: sortOrder },
          { createdAt: 'desc' },
        ];
      } else {
        orderByClause = [
          { year: sortOrder },
          { month: sortOrder },
          { seqNumber: sortOrder },
          { createdAt: sortOrder },
        ];
      }
    }

    const isFiltered = Boolean(search || (idStatus && idStatus !== 'all') || startDate || endDate);

    const [images, totalCount, allMatchingImages, globalBenchmarkImages] = await Promise.all([
      prisma.image.findMany({
        where,
        skip,
        take: limit,

        orderBy: orderByClause,
        include: {
          stats: {
            orderBy: { date: 'desc' },
          },
        },
      }),
      prisma.image.count({ where }),
      prisma.image.findMany({
        where,
        select: {
          ...(searchField === 'exactKeyword' ? { keywords: true } : {}),
          totalDownloads: true,
          createdAt: true,
          stats: {
            select: {
              earnings: true,
              downloads: true,
              date: true,
            },
          },
        },
      }),
      ...(isFiltered
        ? [
            prisma.image.findMany({
              select: {
                totalDownloads: true,
                createdAt: true,
                stats: {
                  select: {
                    earnings: true,
                    downloads: true,
                    date: true,
                  },
                },
              },
            }),
          ]
        : []),
    ]);

    let enrichedImages = images.map((img: any) => {
      const { totalEarnings, platformBreakdown } = calculatePlatformBreakdown(img.stats);
      return {
        ...img,
        totalEarnings,
        platformBreakdown,
      };
    });

    if (sortBy === 'earnings') {
      enrichedImages = enrichedImages.sort((a, b) => {
        const diff = (b.totalEarnings || 0) - (a.totalEarnings || 0);
        if (diff !== 0) return sortOrder === 'asc' ? -diff : diff;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
    }

    let matchingCandidates = allMatchingImages || [];
    let finalTotalCount = totalCount;

    if (searchField === 'exactKeyword') {
      const target = search.trim().toLowerCase();
      matchingCandidates = (allMatchingImages || []).filter((img: any) =>
        parseKeywordsString(img.keywords).some((k) => k.toLowerCase() === target)
      );
      finalTotalCount = matchingCandidates.length;
      enrichedImages = enrichedImages.filter((img: any) =>
        parseKeywordsString(img.keywords).some((k) => k.toLowerCase() === target)
      );
    }

    const totalDownloads = matchingCandidates.reduce(
      (sum: number, img: any) => sum + (img.totalDownloads || 0),
      0
    );
    const totalEarnings = matchingCandidates.reduce(
      (sum: number, img: any) =>
        sum + (img.stats || []).reduce((sSum: number, s: any) => sSum + (s.earnings || 0), 0),
      0
    );

    // Calculate Global Benchmarks across the full portfolio
    const benchmarkSource = isFiltered && globalBenchmarkImages ? globalBenchmarkImages : allMatchingImages || [];

    const distinctMonthsSet = new Set<string>();
    benchmarkSource.forEach((img: any) => {
      (img.stats || []).forEach((s: any) => {
        if (s.date) {
          const d = new Date(s.date);
          if (!isNaN(d.getTime())) {
            distinctMonthsSet.add(`${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`);
          }
        }
      });
    });
    const totalActiveMonths = Math.max(1, distinctMonthsSet.size);

    const candidateTotals = benchmarkSource.map((img: any) => {
      const imgEarnings = (img.stats || []).reduce((sum: number, s: any) => sum + (s.earnings || 0), 0);
      const imgDownloads = img.totalDownloads || 0;
      return {
        earnings: imgEarnings,
        downloads: imgDownloads,
      };
    });

    const globalEarnings = candidateTotals.reduce((sum: number, c: any) => sum + c.earnings, 0);
    const globalDownloads = candidateTotals.reduce((sum: number, c: any) => sum + c.downloads, 0);

    // Sort by earnings descending to extract Top 100 Best Sellers
    const sortedByEarnings = [...candidateTotals].sort((a, b) => b.earnings - a.earnings);
    const top100Candidates = sortedByEarnings.slice(0, 100);
    const top100Count = Math.max(1, top100Candidates.length);

    const top100TotalEarnings = top100Candidates.reduce((sum, c) => sum + c.earnings, 0);
    const top100TotalDownloads = top100Candidates.reduce((sum, c) => sum + c.downloads, 0);

    const top100AvgMonthlyEarnings = (top100TotalEarnings / top100Count) / totalActiveMonths;
    const top100AvgMonthlyDownloads = (top100TotalDownloads / top100Count) / totalActiveMonths;

    const totalGlobalAssetCount = Math.max(1, benchmarkSource.length);
    const portfolioAvgMonthlyEarnings = (globalEarnings / totalGlobalAssetCount) / totalActiveMonths;
    const portfolioAvgMonthlyDownloads = (globalDownloads / totalGlobalAssetCount) / totalActiveMonths;

    return NextResponse.json({
      data: enrichedImages,
      meta: {
        total: finalTotalCount,
        page,
        limit,
        totalPages: Math.ceil(finalTotalCount / limit) || 1,
      },
      summary: {
        totalImages: finalTotalCount,
        totalDownloads,
        totalEarnings,
        top100AvgMonthlyEarnings,
        top100AvgMonthlyDownloads,
        portfolioAvgMonthlyEarnings,
        portfolioAvgMonthlyDownloads,
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

    if (uploadDate !== undefined) {
      const parsedDate = new Date(uploadDate);
      if (!isNaN(parsedDate.getTime())) {
        dataToUpdate.createdAt = parsedDate;
      }
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
        const parsedCode = parseImageCode(cleanedCode);
        if (parsedCode) {
          dataToUpdate.year = parsedCode.year;
          dataToUpdate.month = parsedCode.month;
          dataToUpdate.seqNumber = parsedCode.seqNumber;
        }
      } else if (!currentImage.code) {
        // Auto-generate code for image that does not have one
        const targetDate = dataToUpdate.createdAt || currentImage.createdAt || new Date();
        const { nextCode, year, month, seqNumber } = await getNextImageCode(prisma, targetDate);
        dataToUpdate.code = nextCode;
        dataToUpdate.year = year;
        dataToUpdate.month = month;
        dataToUpdate.seqNumber = seqNumber;
      } else {
        dataToUpdate.code = null;
      }
    } else if (!currentImage.code && dataToUpdate.createdAt) {
      // Auto-generate code when date is updated for an image with no code
      const { nextCode, year, month, seqNumber } = await getNextImageCode(prisma, dataToUpdate.createdAt);
      dataToUpdate.code = nextCode;
      dataToUpdate.year = year;
      dataToUpdate.month = month;
      dataToUpdate.seqNumber = seqNumber;
    }

    if (file) {
      const finalCode = (dataToUpdate.code || currentImage.code || `img-${Date.now()}`).trim();
      const saved = await saveImageFile(file, finalCode);

      if (currentImage.filePath && currentImage.filePath !== saved.dbFilePath) {
        await deleteOldImageFile(currentImage.filePath);
      }

      dataToUpdate.filePath = saved.dbFilePath;
      dataToUpdate.status = 'uploaded';
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

    let updatedImage = await prisma.image.update({
      where: { id },
      data: dataToUpdate,
      include: {
        stats: {
          orderBy: { date: 'desc' },
        },
      },
    });

    // Auto-reconcile unlinked sales if platform IDs exist/changed
    if (updatedImage.asId || updatedImage.ssId || updatedImage.vzId) {
      await reconcileImageSales(prisma, updatedImage);

      // Auto-reconcile SERP rankings if platform IDs exist/changed
      try {
        const platformIds = [updatedImage.asId, updatedImage.ssId, updatedImage.vzId].filter(Boolean) as string[];
        if (platformIds.length > 0) {
          await prisma.serpItem.updateMany({
            where: {
              assetId: { in: platformIds },
            },
            data: {
              isMine: true,
              matchedImageId: updatedImage.id,
            },
          });
        }
      } catch (_) {}

      // Re-fetch to get updated rollups & stats if reconcile modified records
      const reFetched = await prisma.image.findUnique({
        where: { id },
        include: {
          stats: {
            orderBy: { date: 'desc' },
          },
        },
      });
      if (reFetched) {
        updatedImage = reFetched;
      }
    }

    const { totalEarnings, platformBreakdown } = calculatePlatformBreakdown((updatedImage as any).stats);

    // Schedule debounced auto-backup after mutation
    scheduleAutoBackup();

    return NextResponse.json({
      ...updatedImage,
      totalEarnings,
      platformBreakdown,
    });

  } catch (error: any) {
    console.error('Failed to update portfolio data:', error);
    if (error.code === 'P2002') {
      return NextResponse.json({ error: 'Image code already exists in the system.' }, { status: 409 });
    }
    return NextResponse.json({ error: error?.message || 'Internal Server Error' }, { status: 500 });
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
    await deleteOldImageFile(image.filePath);


    // Delete image from database (cascades platformStats)
    await prisma.image.delete({
      where: { id },
    });

    // Schedule debounced auto-backup after mutation
    scheduleAutoBackup();

    return NextResponse.json({ success: true, deletedId: id });
  } catch (error) {
    console.error('Failed to delete image:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
