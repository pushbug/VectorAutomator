import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { scheduleAutoBackup } from '@/lib/dbBackup';

export const DEFAULT_MONTHLY_GOAL = 50;
export const MIN_GOAL = 1;
export const MAX_GOAL = 100000;

export async function GET() {
  try {
    const setting = await prisma.setting.findUnique({
      where: { key: 'monthly_vector_goal' },
    });

    let goal = DEFAULT_MONTHLY_GOAL;
    if (setting?.value) {
      const parsed = parseInt(setting.value, 10);
      if (!Number.isNaN(parsed) && parsed >= MIN_GOAL && parsed <= MAX_GOAL) {
        goal = parsed;
      }
    }

    return NextResponse.json({
      monthlyVectorGoal: goal,
    });
  } catch (error) {
    console.error('Error in GET /api/settings:', error);
    return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const rawGoal = body?.monthlyVectorGoal;

    if (rawGoal === undefined || rawGoal === null) {
      return NextResponse.json(
        { error: 'monthlyVectorGoal is required' },
        { status: 400 }
      );
    }

    const goal = typeof rawGoal === 'number' ? rawGoal : parseInt(String(rawGoal), 10);

    if (Number.isNaN(goal) || !Number.isInteger(goal) || goal < MIN_GOAL || goal > MAX_GOAL) {
      return NextResponse.json(
        { error: `Monthly vector goal must be an integer between ${MIN_GOAL} and ${MAX_GOAL.toLocaleString()}.` },
        { status: 400 }
      );
    }

    await prisma.setting.upsert({
      where: { key: 'monthly_vector_goal' },
      update: { value: String(goal) },
      create: { key: 'monthly_vector_goal', value: String(goal) },
    });

    scheduleAutoBackup();

    return NextResponse.json({
      success: true,
      monthlyVectorGoal: goal,
    });
  } catch (error) {
    console.error('Error in PATCH /api/settings:', error);
    return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 });
  }
}
