import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST as heartbeatPOST, GET as heartbeatGET } from '@/app/api/system/heartbeat/route';
import { POST as quitPOST } from '@/app/api/system/quit/route';
import {
  registerHeartbeat,
  unregisterTab,
  getWatchdogStatus,
  shutdownServer,
} from '@/lib/serverWatchdog';

vi.mock('@/lib/dbBackup', () => ({
  checkpointDatabase: vi.fn(() => true),
}));

describe('System Lifecycle & Watchdog Telemetry', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('UT-API-SYSTEM-HEARTBEAT-01: POST /api/system/heartbeat registers pings and disconnects', async () => {
    // 1. Send active ping from tab-alpha
    const pingReq = new NextRequest('http://localhost:3000/api/system/heartbeat', {
      method: 'POST',
      body: JSON.stringify({ tabId: 'tab-alpha', action: 'ping' }),
    });

    const pingRes = await heartbeatPOST(pingReq);
    expect(pingRes.status).toBe(200);
    const pingData = await pingRes.json();
    expect(pingData.ok).toBe(true);
    expect(pingData.activeTabsCount).toBeGreaterThanOrEqual(1);

    // 2. GET telemetry status
    const getRes = await heartbeatGET();
    const getData = await getRes.json();
    expect(getData.lastHeartbeat).toBeDefined();
    expect(getData.isGracePeriod).toBe(true);

    // 3. Send disconnect from tab-alpha
    const disconnectReq = new NextRequest('http://localhost:3000/api/system/heartbeat', {
      method: 'POST',
      body: JSON.stringify({ tabId: 'tab-alpha', action: 'disconnect' }),
    });

    const discRes = await heartbeatPOST(disconnectReq);
    expect(discRes.status).toBe(200);
    const discData = await discRes.json();
    expect(discData.action).toBe('disconnected');
  });

  it('UT-API-SYSTEM-WATCHDOG-01: serverWatchdog registers tabs and executes safe shutdown', async () => {
    const status1 = registerHeartbeat('tab-beta');
    expect(status1.activeTabsCount).toBeGreaterThanOrEqual(1);

    unregisterTab('tab-beta');
    const status2 = getWatchdogStatus();
    expect(status2.bootTime).toBeDefined();

    // Verify shutdownServer executes checkpointDatabase safely
    const quitSuccess = await shutdownServer('unit_test');
    expect(quitSuccess).toBe(true);

    // Verify /api/system/quit endpoint
    const quitRes = await quitPOST();
    expect(quitRes.status).toBe(200);
    const quitData = await quitRes.json();
    expect(quitData.ok).toBe(true);
  });
});
