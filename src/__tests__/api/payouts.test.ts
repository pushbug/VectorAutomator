import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET as getPayouts, POST as createPayout } from '@/app/api/payouts/route';
import { GET as getSinglePayout, PATCH as updatePayout, DELETE as deletePayout } from '@/app/api/payouts/[id]/route';
import { POST as batchPayouts } from '@/app/api/payouts/batch/route';
import { NextRequest } from 'next/server';

const {
  mockPayoutFindMany,
  mockPayoutCount,
  mockPayoutFindUnique,
  mockPayoutCreate,
  mockPayoutUpdate,
  mockPayoutDelete,
  mockPayoutDeleteMany,
  mockTransaction,
} = vi.hoisted(() => ({
  mockPayoutFindMany: vi.fn(),
  mockPayoutCount: vi.fn(),
  mockPayoutFindUnique: vi.fn(),
  mockPayoutCreate: vi.fn(),
  mockPayoutUpdate: vi.fn(),
  mockPayoutDelete: vi.fn(),
  mockPayoutDeleteMany: vi.fn(),
  mockTransaction: vi.fn(),
}));

vi.mock('@/lib/prisma', () => ({
  prisma: {
    payoutTransaction: {
      findMany: mockPayoutFindMany,
      count: mockPayoutCount,
      findUnique: mockPayoutFindUnique,
      create: mockPayoutCreate,
      update: mockPayoutUpdate,
      delete: mockPayoutDelete,
      deleteMany: mockPayoutDeleteMany,
    },
    $transaction: mockTransaction,
  },
}));

describe('Payouts API (UT-API-PAYOUT-01 & UT-API-PAYOUT-BATCH-02)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('GET /api/payouts returns paginated data and summary rollups', async () => {
    const mockData = [
      {
        id: 'p-1',
        stockWithdrawDate: new Date('2023-09-03T00:00:00.000Z'),
        stockName: 'Adobe Stock',
        stockAmountUsd: 2667.41,
        platformDate: new Date('2023-09-09T00:00:00.000Z'),
        platformName: 'Payoneer',
        platformAmountUsd: 2664.41,
        feeUsd: 3.00,
        bankReceivedDate: new Date('2023-09-10T00:00:00.000Z'),
        bankName: 'Kasikornbank',
        exchangeRate: 34.72,
        netIncomeThb: 92508.32,
        status: 'completed',
        taxYear: 2023,
      },
      {
        id: 'p-2',
        stockWithdrawDate: new Date('2024-01-15T00:00:00.000Z'),
        stockName: 'Vecteezy',
        stockAmountUsd: 45.68,
        platformDate: new Date('2024-01-15T00:00:00.000Z'),
        platformName: 'Payoneer',
        platformAmountUsd: 41.68,
        feeUsd: 4.00,
        status: 'in_platform',
        taxYear: 2024,
      },
    ];

    mockPayoutCount.mockResolvedValue(2);
    mockPayoutFindMany
      .mockResolvedValueOnce(mockData) // paginated list
      .mockResolvedValueOnce(mockData); // all matching for rollup

    const req = new NextRequest('http://localhost:3000/api/payouts?page=1&limit=50');
    const res = await getPayouts(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.data).toHaveLength(2);
    expect(json.pagination.total).toBe(2);
    expect(json.summary.totalStockUsd).toBe(2713.09);
    expect(json.summary.totalNetThb).toBe(92508.32);
    expect(json.summary.holdingUsd).toBe(41.68);
    expect(json.summary.availableYears).toEqual([2024, 2023]);
  });

  it('POST /api/payouts validates required fields and derives fees', async () => {
    mockPayoutCreate.mockResolvedValue({
      id: 'p-new',
      stockName: 'Shutterstock',
      stockAmountUsd: 548.04,
      platformAmountUsd: 539.26,
      feeUsd: 8.78,
      status: 'in_platform',
    });

    const req = new NextRequest('http://localhost:3000/api/payouts', {
      method: 'POST',
      body: JSON.stringify({
        stockName: 'Shutterstock',
        stockWithdrawDate: '2023-09-01',
        stockAmountUsd: 548.04,
        platformAmountUsd: 539.26,
        platformDate: '2023-09-07',
      }),
    });

    const res = await createPayout(req);
    const json = await res.json();

    expect(res.status).toBe(201);
    expect(json.success).toBe(true);
    expect(mockPayoutCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          stockName: 'Shutterstock',
          stockAmountUsd: 548.04,
          feeUsd: 8.78,
          status: 'in_platform',
        }),
      })
    );
  });

  it('PATCH /api/payouts/[id] updates payout and recalculates fields', async () => {
    mockPayoutFindUnique.mockResolvedValue({
      id: 'p-1',
      stockName: 'Adobe Stock',
      stockWithdrawDate: new Date('2023-09-03T00:00:00.000Z'),
      stockAmountUsd: 2667.41,
      platformAmountUsd: 2664.41,
      platformDate: new Date('2023-09-09T00:00:00.000Z'),
      status: 'in_platform',
    });

    mockPayoutUpdate.mockResolvedValue({
      id: 'p-1',
      status: 'completed',
      exchangeRate: 34.72,
      netIncomeThb: 92508.32,
    });

    const req = new NextRequest('http://localhost:3000/api/payouts/p-1', {
      method: 'PATCH',
      body: JSON.stringify({
        bankReceivedDate: '2023-09-10',
        exchangeRate: 34.72,
        bankName: 'Kasikornbank',
        notes: null,
      }),
    });

    const res = await updatePayout(req, { params: Promise.resolve({ id: 'p-1' }) });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(mockPayoutUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'p-1' },
        data: expect.objectContaining({
          status: 'completed',
          exchangeRate: 34.72,
          netIncomeThb: 92508.32,
          notes: null,
        }),
      })
    );
  });

  it('DELETE /api/payouts/[id] permanently removes transaction', async () => {
    mockPayoutDelete.mockResolvedValue({ id: 'p-1' });

    const req = new NextRequest('http://localhost:3000/api/payouts/p-1', { method: 'DELETE' });
    const res = await deletePayout(req, { params: Promise.resolve({ id: 'p-1' }) });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(mockPayoutDelete).toHaveBeenCalledWith({ where: { id: 'p-1' } });
  });

  it('POST /api/payouts/batch supports batch create_many (Smart Paste)', async () => {
    mockTransaction.mockImplementation(async (callback: any) => {
      const tx = { payoutTransaction: { create: vi.fn() } };
      return callback(tx);
    });

    const req = new NextRequest('http://localhost:3000/api/payouts/batch', {
      method: 'POST',
      body: JSON.stringify({
        action: 'create_many',
        items: [
          {
            stockName: 'Shutterstock',
            stockWithdrawDate: '2023-09-01',
            stockAmountUsd: 548.04,
            platformAmountUsd: 539.26,
          },
          {
            stockName: 'Adobe Stock',
            stockWithdrawDate: '2023-09-03',
            stockAmountUsd: 2667.41,
            platformAmountUsd: 2664.41,
          },
        ],
      }),
    });

    const res = await batchPayouts(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.count).toBe(2);
    expect(mockTransaction).toHaveBeenCalled();
  });

  it('POST /api/payouts/batch supports bundled bank withdrawal with proportional split', async () => {
    mockPayoutFindMany.mockResolvedValue([
      { id: 'p-1', stockAmountUsd: 2664.41, platformAmountUsd: 2664.41, stockWithdrawDate: new Date('2023-09-03') },
      { id: 'p-2', stockAmountUsd: 41.68, platformAmountUsd: 41.68, stockWithdrawDate: new Date('2023-09-13') },
    ]);

    mockTransaction.mockImplementation(async (callback: any) => {
      const tx = { payoutTransaction: { update: vi.fn() } };
      return callback(tx);
    });

    const req = new NextRequest('http://localhost:3000/api/payouts/batch', {
      method: 'POST',
      body: JSON.stringify({
        action: 'bundle_withdraw',
        ids: ['p-1', 'p-2'],
        bankReceivedDate: '2023-09-15',
        bankName: 'Kasikornbank',
        totalNetIncomeThb: 93955.44,
      }),
    });

    const res = await batchPayouts(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.count).toBe(2);
  });
});
