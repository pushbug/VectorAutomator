import { NextResponse } from 'next/server';
import { shutdownServer } from '@/lib/serverWatchdog';

export async function POST() {
  try {
    const success = await shutdownServer('user_quit');
    return NextResponse.json({ ok: success, message: 'Server shutdown initiated and port released.' });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error?.message || 'Shutdown failed' }, { status: 500 });
  }
}
