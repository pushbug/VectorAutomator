import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  calculatePayoutDerivedFields,
  normalizeDateToUTC,
  normalizeStockName,
  normalizePlatformName,
} from '@/lib/payoutCalculations';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.max(1, parseInt(searchParams.get('limit') || '50', 10));
    const stockName = searchParams.get('stockName');
    const platformName = searchParams.get('platformName');
    const status = searchParams.get('status');
    const taxYearStr = searchParams.get('taxYear');
    const search = searchParams.get('search');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const sortBy = searchParams.get('sortBy') || 'stockWithdrawDate';
    const sortOrder = searchParams.get('sortOrder') === 'asc' ? 'asc' : 'desc';

    const where: any = {};

    if (stockName && stockName !== 'all') {
      where.stockName = stockName;
    }

    if (platformName && platformName !== 'all') {
      where.platformName = platformName;
    }

    if (status && status !== 'all') {
      where.status = status;
    }

    if (taxYearStr && taxYearStr !== 'all') {
      const taxYear = parseInt(taxYearStr, 10);
      if (!isNaN(taxYear)) {
        where.taxYear = taxYear;
      }
    }

    if (search) {
      where.OR = [
        { stockName: { contains: search } },
        { platformName: { contains: search } },
        { bankName: { contains: search } },
        { notes: { contains: search } },
      ];
    }

    if (startDate || endDate) {
      where.stockWithdrawDate = {};
      if (startDate) {
        const startUtc = normalizeDateToUTC(startDate);
        if (startUtc) where.stockWithdrawDate.gte = new Date(startUtc);
      }
      if (endDate) {
        const endUtc = normalizeDateToUTC(endDate);
        if (endUtc) {
          const e = new Date(endUtc);
          e.setUTCHours(23, 59, 59, 999);
          where.stockWithdrawDate.lte = e;
        }
      }
    }

    let orderBy: any = { stockWithdrawDate: sortOrder };
    if (sortBy === 'stockAmountUsd') {
      orderBy = { stockAmountUsd: sortOrder };
    } else if (sortBy === 'platformAmountUsd') {
      orderBy = { platformAmountUsd: sortOrder };
    } else if (sortBy === 'netIncomeThb') {
      orderBy = { netIncomeThb: sortOrder };
    } else if (sortBy === 'exchangeRate') {
      orderBy = { exchangeRate: sortOrder };
    } else if (sortBy === 'feeUsd') {
      orderBy = { feeUsd: sortOrder };
    } else if (sortBy === 'status') {
      orderBy = { status: sortOrder };
    } else if (sortBy === 'taxYear') {
      orderBy = { taxYear: sortOrder };
    }

    const skip = (page - 1) * limit;

    const [total, transactions, allMatching] = await Promise.all([
      prisma.payoutTransaction.count({ where }),
      prisma.payoutTransaction.findMany({
        where,
        orderBy,
        skip,
        take: limit,
      }),
      // Fetch summary dataset for accurate rollups
      prisma.payoutTransaction.findMany({
        where,
        select: {
          stockAmountUsd: true,
          platformAmountUsd: true,
          feeUsd: true,
          netIncomeThb: true,
          status: true,
          taxYear: true,
          exchangeRate: true,
        },
      }),
    ]);

    // Compute Summary KPIs
    let totalStockUsd = 0;
    let totalPlatformUsd = 0;
    let totalFeeUsd = 0;
    let totalNetThb = 0;
    let holdingUsd = 0;
    let pendingUsd = 0;
    let completedPlatformUsd = 0;
    const taxYearMap: Record<number, { count: number; netIncomeThb: number; totalUsd: number; feeUsd: number }> = {};
    const yearSet = new Set<number>();

    for (const item of allMatching) {
      totalStockUsd += item.stockAmountUsd || 0;
      totalPlatformUsd += item.platformAmountUsd || 0;
      totalFeeUsd += item.feeUsd || 0;

      if (item.status === 'completed') {
        totalNetThb += item.netIncomeThb || 0;
        completedPlatformUsd += item.platformAmountUsd || item.stockAmountUsd || 0;
      } else if (item.status === 'in_platform') {
        holdingUsd += item.platformAmountUsd || item.stockAmountUsd || 0;
      } else if (item.status === 'pending') {
        pendingUsd += item.stockAmountUsd || 0;
      }

      if (item.taxYear) {
        yearSet.add(item.taxYear);
        if (!taxYearMap[item.taxYear]) {
          taxYearMap[item.taxYear] = { count: 0, netIncomeThb: 0, totalUsd: 0, feeUsd: 0 };
        }
        taxYearMap[item.taxYear].count += 1;
        taxYearMap[item.taxYear].netIncomeThb += item.netIncomeThb || 0;
        taxYearMap[item.taxYear].totalUsd += item.platformAmountUsd || item.stockAmountUsd || 0;
        taxYearMap[item.taxYear].feeUsd += item.feeUsd || 0;
      }
    }

    const averageRate = completedPlatformUsd > 0 ? Number((totalNetThb / completedPlatformUsd).toFixed(2)) : 0;
    const availableYears = Array.from(yearSet).sort((a, b) => b - a);

    return NextResponse.json({
      data: transactions,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
      summary: {
        totalTransactions: total,
        totalStockUsd: Number(totalStockUsd.toFixed(2)),
        totalPlatformUsd: Number(totalPlatformUsd.toFixed(2)),
        totalFeeUsd: Number(totalFeeUsd.toFixed(2)),
        totalNetThb: Number(totalNetThb.toFixed(2)),
        holdingUsd: Number(holdingUsd.toFixed(2)),
        pendingUsd: Number(pendingUsd.toFixed(2)),
        averageRate,
        availableYears,
        taxYearSummaries: taxYearMap,
      },
    });
  } catch (error: any) {
    console.error('Error fetching payout transactions:', error);
    return NextResponse.json({ error: 'Failed to fetch payouts', details: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.stockName || !body.stockWithdrawDate || body.stockAmountUsd == null) {
      return NextResponse.json(
        { error: 'Missing required fields: stockName, stockWithdrawDate, stockAmountUsd' },
        { status: 400 }
      );
    }

    const derived = calculatePayoutDerivedFields({
      stockWithdrawDate: body.stockWithdrawDate,
      stockAmountUsd: Number(body.stockAmountUsd),
      platformDate: body.platformDate,
      platformAmountUsd: body.platformAmountUsd != null ? Number(body.platformAmountUsd) : null,
      bankReceivedDate: body.bankReceivedDate,
      exchangeRate: body.exchangeRate != null ? Number(body.exchangeRate) : null,
      netIncomeThb: body.netIncomeThb != null ? Number(body.netIncomeThb) : null,
    });

    const status = body.status && body.status !== 'auto' ? body.status : derived.status;
    const stockName = normalizeStockName(body.stockName);
    const platformName = normalizePlatformName(body.platformName);

    const transaction = await prisma.payoutTransaction.create({
      data: {
        stockWithdrawDate: new Date(derived.stockWithdrawDate),
        stockName,
        stockAmountUsd: Number(body.stockAmountUsd),
        platformDate: derived.platformDate ? new Date(derived.platformDate) : null,
        platformName,
        platformAmountUsd: body.platformAmountUsd != null ? Number(body.platformAmountUsd) : null,
        feeUsd: derived.feeUsd,
        bankReceivedDate: derived.bankReceivedDate ? new Date(derived.bankReceivedDate) : null,
        bankName: body.bankName ? body.bankName.trim() : null,
        exchangeRate: derived.exchangeRate,
        netIncomeThb: derived.netIncomeThb,
        status,
        taxYear: derived.taxYear,
        leadTimeDays: derived.leadTimeDays,
        notes: body.notes ? body.notes.trim() : null,
      },
    });

    return NextResponse.json({ success: true, data: transaction }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating payout transaction:', error);
    return NextResponse.json({ error: 'Failed to create payout', details: error.message }, { status: 500 });
  }
}
