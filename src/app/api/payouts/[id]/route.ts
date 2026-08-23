import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  calculatePayoutDerivedFields,
  normalizeStockName,
  normalizePlatformName,
} from '@/lib/payoutCalculations';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const transaction = await prisma.payoutTransaction.findUnique({
      where: { id },
    });

    if (!transaction) {
      return NextResponse.json({ error: 'Payout transaction not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: transaction });
  } catch (error: any) {
    console.error('Error fetching payout:', error);
    return NextResponse.json({ error: 'Failed to fetch payout', details: error.message }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const existing = await prisma.payoutTransaction.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Payout transaction not found' }, { status: 404 });
    }

    const stockWithdrawDate = body.stockWithdrawDate !== undefined ? body.stockWithdrawDate : existing.stockWithdrawDate;
    const stockAmountUsd = body.stockAmountUsd !== undefined ? Number(body.stockAmountUsd) : existing.stockAmountUsd;
    const platformDate = body.platformDate !== undefined ? body.platformDate : existing.platformDate;
    const platformAmountUsd = body.platformAmountUsd !== undefined ? (body.platformAmountUsd != null ? Number(body.platformAmountUsd) : null) : existing.platformAmountUsd;
    const bankReceivedDate = body.bankReceivedDate !== undefined ? body.bankReceivedDate : existing.bankReceivedDate;
    const exchangeRate = body.exchangeRate !== undefined ? (body.exchangeRate != null ? Number(body.exchangeRate) : null) : existing.exchangeRate;
    const netIncomeThb = body.netIncomeThb !== undefined ? (body.netIncomeThb != null ? Number(body.netIncomeThb) : null) : existing.netIncomeThb;

    const derived = calculatePayoutDerivedFields({
      stockWithdrawDate,
      stockAmountUsd,
      platformDate,
      platformAmountUsd,
      bankReceivedDate,
      exchangeRate,
      netIncomeThb,
    });

    const status = body.status && body.status !== 'auto' ? body.status : derived.status;
    const stockName = body.stockName ? normalizeStockName(body.stockName) : existing.stockName;
    const platformName = body.platformName ? normalizePlatformName(body.platformName) : existing.platformName;
    const bankName = body.bankName !== undefined ? (body.bankName ? body.bankName.trim() : null) : existing.bankName;
    const notes = body.notes !== undefined ? (body.notes ? body.notes.trim() : null) : existing.notes;

    const updated = await prisma.payoutTransaction.update({
      where: { id },
      data: {
        stockWithdrawDate: new Date(derived.stockWithdrawDate),
        stockName,
        stockAmountUsd,
        platformDate: derived.platformDate ? new Date(derived.platformDate) : null,
        platformName,
        platformAmountUsd,
        feeUsd: derived.feeUsd,
        bankReceivedDate: derived.bankReceivedDate ? new Date(derived.bankReceivedDate) : null,
        bankName,
        exchangeRate: derived.exchangeRate,
        netIncomeThb: derived.netIncomeThb,
        status,
        taxYear: derived.taxYear,
        leadTimeDays: derived.leadTimeDays,
        notes,
      },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error: any) {
    console.error('Error updating payout:', error);
    return NextResponse.json({ error: 'Failed to update payout', details: error.message }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await prisma.payoutTransaction.delete({
      where: { id },
    });

    return NextResponse.json({ success: true, message: 'Payout transaction deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting payout:', error);
    return NextResponse.json({ error: 'Failed to delete payout', details: error.message }, { status: 500 });
  }
}
