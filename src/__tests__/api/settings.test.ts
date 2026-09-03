import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET, PATCH, DEFAULT_MONTHLY_GOAL } from '@/app/api/settings/route';

const { mockSettingFindUnique, mockSettingUpsert } = vi.hoisted(() => {
  return {
    mockSettingFindUnique: vi.fn(),
    mockSettingUpsert: vi.fn(),
  };
});

vi.mock('@/generated/prisma/client', () => {
  return {
    PrismaClient: class {
      setting = {
        findUnique: mockSettingFindUnique,
        upsert: mockSettingUpsert,
      };
    },
  };
});

describe('Settings API Route (UT-API-SETTINGS-01)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/settings', () => {
    it('returns stored monthly goal when present in database', async () => {
      mockSettingFindUnique.mockResolvedValueOnce({
        key: 'monthly_vector_goal',
        value: '75',
      });

      const res = await GET();
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.monthlyVectorGoal).toBe(75);
      expect(mockSettingFindUnique).toHaveBeenCalledWith({
        where: { key: 'monthly_vector_goal' },
      });
    });

    it('returns default 50 when no record is found in database', async () => {
      mockSettingFindUnique.mockResolvedValueOnce(null);

      const res = await GET();
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.monthlyVectorGoal).toBe(DEFAULT_MONTHLY_GOAL);
    });

    it('returns default 50 when stored value is invalid NaN or out of bounds', async () => {
      mockSettingFindUnique.mockResolvedValueOnce({
        key: 'monthly_vector_goal',
        value: 'not-a-number',
      });

      const res = await GET();
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.monthlyVectorGoal).toBe(DEFAULT_MONTHLY_GOAL);
    });

    it('returns 500 when database throws an unexpected error', async () => {
      mockSettingFindUnique.mockRejectedValueOnce(new Error('DB Error'));

      const res = await GET();
      const data = await res.json();

      expect(res.status).toBe(500);
      expect(data.error).toBe('Failed to fetch settings');
    });
  });

  describe('PATCH /api/settings', () => {
    it('successfully updates monthlyVectorGoal with valid integer', async () => {
      mockSettingUpsert.mockResolvedValueOnce({
        key: 'monthly_vector_goal',
        value: '100',
      });

      const req = new NextRequest('http://localhost:3000/api/settings', {
        method: 'PATCH',
        body: JSON.stringify({ monthlyVectorGoal: 100 }),
      });

      const res = await PATCH(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.monthlyVectorGoal).toBe(100);
      expect(mockSettingUpsert).toHaveBeenCalledWith({
        where: { key: 'monthly_vector_goal' },
        update: { value: '100' },
        create: { key: 'monthly_vector_goal', value: '100' },
      });
    });

    it('rejects update when monthlyVectorGoal is missing', async () => {
      const req = new NextRequest('http://localhost:3000/api/settings', {
        method: 'PATCH',
        body: JSON.stringify({}),
      });

      const res = await PATCH(req);
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.error).toBe('monthlyVectorGoal is required');
      expect(mockSettingUpsert).not.toHaveBeenCalled();
    });

    it('rejects zero or negative monthlyVectorGoal', async () => {
      const req = new NextRequest('http://localhost:3000/api/settings', {
        method: 'PATCH',
        body: JSON.stringify({ monthlyVectorGoal: 0 }),
      });

      const res = await PATCH(req);
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.error).toContain('must be an integer between');
      expect(mockSettingUpsert).not.toHaveBeenCalled();
    });

    it('rejects floating point numbers', async () => {
      const req = new NextRequest('http://localhost:3000/api/settings', {
        method: 'PATCH',
        body: JSON.stringify({ monthlyVectorGoal: 50.5 }),
      });

      const res = await PATCH(req);
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.error).toContain('must be an integer between');
      expect(mockSettingUpsert).not.toHaveBeenCalled();
    });

    it('rejects numbers exceeding 100,000', async () => {
      const req = new NextRequest('http://localhost:3000/api/settings', {
        method: 'PATCH',
        body: JSON.stringify({ monthlyVectorGoal: 100001 }),
      });

      const res = await PATCH(req);
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.error).toContain('must be an integer between');
      expect(mockSettingUpsert).not.toHaveBeenCalled();
    });

    it('returns 500 when database fails during upsert', async () => {
      mockSettingUpsert.mockRejectedValueOnce(new Error('Write failure'));

      const req = new NextRequest('http://localhost:3000/api/settings', {
        method: 'PATCH',
        body: JSON.stringify({ monthlyVectorGoal: 100 }),
      });

      const res = await PATCH(req);
      const data = await res.json();

      expect(res.status).toBe(500);
      expect(data.error).toBe('Failed to update settings');
    });
  });
});
