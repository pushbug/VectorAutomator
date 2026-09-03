import { NextRequest, NextResponse } from 'next/server';
import { registerHeartbeat, unregisterTab, getWatchdogStatus } from '@/lib/serverWatchdog';

export async function POST(req: NextRequest) {
  try {
    let body: { tabId?: string; action?: string } = {};
    try {
      body = await req.json();
    } catch {
      // Body can be empty for beacon pings
    }

    if (body.action === 'disconnect' && body.tabId) {
      unregisterTab(body.tabId);
      return NextResponse.json({ ok: true, action: 'disconnected' });
    }

    const result = registerHeartbeat(body.tabId);
    return NextResponse.json({ ok: true, ...result });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error?.message || 'Heartbeat error' }, { status: 500 });
  }
}

export async function GET() {
  const status = getWatchdogStatus();
  return NextResponse.json(status);
}
