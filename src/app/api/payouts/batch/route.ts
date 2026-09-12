import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  calculatePayoutDerivedFields,
  calculateBundledSplit,
  normalizeStockName,
  normalizePlatformName,
  normalizeDateToUTC,
} from '@/lib/payoutCalculations';
import { scheduleAutoBackup, createDbBackup } from '@/lib/dbBackup';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    // Action 1: Batch Create (for Smart Paste from Google Sheet)
    if (action === 'create_many') {
      const { items } = body;
      if (!Array.isArray(items) || items.length === 0) {
        return NextResponse.json({ error: 'No items provided for batch creation' }, { status: 400 });
      }

      const createdCount = await prisma.$transaction(async (tx) => {
        let count = 0;
        for (const raw of items) {
          if (!raw.stockName || !raw.stockWithdrawDate || raw.stockAmountUsd == null) continue;

          const derived = calculatePayoutDerivedFields({
            stockWithdrawDate: raw.stockWithdrawDate,
            stockAmountUsd: Number(raw.stockAmountUsd),
            platformDate: raw.platformDate,
            platformAmountUsd: raw.platformAmountUsd != null ? Number(raw.platformAmountUsd) : null,
            bankReceivedDate: raw.bankReceivedDate,
            exchangeRate: raw.exchangeRate != null ? Number(raw.exchangeRate) : null,
            netIncomeThb: raw.netIncomeThb != null ? Number(raw.netIncomeThb) : null,
          });

          const status = raw.status && raw.status !== 'auto' ? raw.status : derived.status;
          const stockName = normalizeStockName(raw.stockName);
          const platformName = normalizePlatformName(raw.platformName);

          await tx.payoutTransaction.create({
            data: {
              stockWithdrawDate: new Date(derived.stockWithdrawDate),
              stockName,
              stockAmountUsd: Number(raw.stockAmountUsd),
              platformDate: derived.platformDate ? new Date(derived.platformDate) : null,
              platformName,
              platformAmountUsd: raw.platformAmountUsd != null ? Number(raw.platformAmountUsd) : null,
              feeUsd: derived.feeUsd,
              bankReceivedDate: derived.bankReceivedDate ? new Date(derived.bankReceivedDate) : null,
              bankName: raw.bankName ? raw.bankName.trim() : null,
              exchangeRate: derived.exchangeRate,
              netIncomeThb: derived.netIncomeThb,
              status,
              taxYear: derived.taxYear,
              leadTimeDays: derived.leadTimeDays,
              notes: raw.notes ? raw.notes.trim() : null,
            },
          });
          count++;
        }
        return count;
      });

      // Immediate auto-backup after batch create
      try {
        await createDbBackup();
      } catch (err) {
        console.warn('Post-batch payout backup warning:', err);
      }

      return NextResponse.json({
        success: true,
        message: `Successfully created ${createdCount} payout transactions`,
        count: createdCount,
      });
    }

    // Action 2: Batch Delete
    if (action === 'delete') {
      const { ids } = body;
      if (!Array.isArray(ids) || ids.length === 0) {
        return NextResponse.json({ error: 'No IDs provided for batch deletion' }, { status: 400 });
      }

      const result = await prisma.payoutTransaction.deleteMany({
        where: { id: { in: ids } },
      });

      // Immediate auto-backup after batch delete
      try {
        await createDbBackup();
      } catch (err) {
        console.warn('Post-batch payout delete backup warning:', err);
      }

      return NextResponse.json({
        success: true,
        message: `Deleted ${result.count} payout transactions`,
        count: result.count,
      });
    }

    // Action 3: Bundled Bank Withdrawal (Transfer multiple holding payouts to Thai Bank)
    if (action === 'bundle_withdraw') {
      const { ids, bankReceivedDate, bankName, exchangeRate, totalNetIncomeThb, notes } = body;
      if (!Array.isArray(ids) || ids.length === 0) {
        return NextResponse.json({ error: 'No IDs provided for bundled withdrawal' }, { status: 400 });
      }

      const bankReceivedDateUtc = normalizeDateToUTC(bankReceivedDate) || new Date().toISOString();

      const existingRecords = await prisma.payoutTransaction.findMany({
        where: { id: { in: ids } },
      });

      if (existingRecords.length === 0) {
        return NextResponse.json({ error: 'No matching records found' }, { status: 404 });
      }

      const splitResults = calculateBundledSplit(
        existingRecords.map((r) => ({
          id: r.id,
          stockAmountUsd: r.stockAmountUsd,
          platformAmountUsd: r.platformAmountUsd,
        })),
        {
          exchangeRate: exchangeRate ? Number(exchangeRate) : undefined,
          totalNetIncomeThb: totalNetIncomeThb ? Number(totalNetIncomeThb) : undefined,
        }
      );

      const splitMap = new Map(splitResults.map((s) => [s.id, s]));

      await prisma.$transaction(async (tx) => {
        for (const record of existingRecords) {
          const split = splitMap.get(record.id);
          const rowRate = split?.exchangeRate ?? (exchangeRate ? Number(exchangeRate) : record.exchangeRate);
          const rowThb = split?.netIncomeThb ?? record.netIncomeThb;

          const derived = calculatePayoutDerivedFields({
            stockWithdrawDate: record.stockWithdrawDate,
            stockAmountUsd: record.stockAmountUsd,
            platformDate: record.platformDate,
            platformAmountUsd: record.platformAmountUsd,
            bankReceivedDate: bankReceivedDateUtc,
            exchangeRate: rowRate,
            netIncomeThb: rowThb,
          });

          await tx.payoutTransaction.update({
            where: { id: record.id },
            data: {
              bankReceivedDate: new Date(bankReceivedDateUtc),
              bankName: bankName ? bankName.trim() : record.bankName,
              exchangeRate: derived.exchangeRate,
              netIncomeThb: derived.netIncomeThb,
              status: 'completed',
              taxYear: derived.taxYear,
              leadTimeDays: derived.leadTimeDays,
              notes: notes !== undefined ? (notes ? notes.trim() : null) : record.notes,
            },
          });
        }
      });

      // Immediate auto-backup after bundled withdrawal
      try {
        await createDbBackup();
      } catch (err) {
        console.warn('Post-bundle payout backup warning:', err);
      }

      return NextResponse.json({
        success: true,
        message: `Successfully completed bundled withdrawal for ${existingRecords.length} transactions`,
        count: existingRecords.length,
      });
    }

    // Action 4: Batch Update Status (Mark multiple records as completed or in_platform)
    if (action === 'update_status') {
      const { ids, status } = body;
      if (!Array.isArray(ids) || ids.length === 0 || !status) {
        return NextResponse.json({ error: 'Missing required ids or status' }, { status: 400 });
      }

      const result = await prisma.payoutTransaction.updateMany({
        where: { id: { in: ids } },
        data: { status },
      });

      // Immediate auto-backup after batch status update
      try {
        await createDbBackup();
      } catch (err) {
        console.warn('Post-batch status update backup warning:', err);
      }

      return NextResponse.json({
        success: true,
        message: `Updated status to ${status} for ${result.count} transactions`,
        count: result.count,
      });
    }

    return NextResponse.json({ error: 'Invalid batch action' }, { status: 400 });
  } catch (error: any) {
    console.error('Error in batch payout operation:', error);
    return NextResponse.json({ error: 'Batch operation failed', details: error.message }, { status: 500 });
  }
}
