import React from 'react';
import { render } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ServerHeartbeat } from '@/components/common/ServerHeartbeat';

describe('ServerHeartbeat Component (UT-UI-HEARTBEAT-BEACON-01)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true }),
    });
  });

  it('UT-UI-HEARTBEAT-BEACON-01: sends initial heartbeat ping on mount and dispatches beacon on unload', () => {
    const originalSendBeacon = navigator.sendBeacon;
    navigator.sendBeacon = vi.fn().mockReturnValue(true);

    const { unmount } = render(<ServerHeartbeat />);

    // Verify initial ping was sent on mount
    expect(global.fetch).toHaveBeenCalledWith(
      '/api/system/heartbeat',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: expect.stringContaining('"action":"ping"'),
      })
    );

    // Trigger pagehide event
    window.dispatchEvent(new Event('pagehide'));

    expect(navigator.sendBeacon).toHaveBeenCalledWith(
      '/api/system/heartbeat',
      expect.any(Blob)
    );

    unmount();
    navigator.sendBeacon = originalSendBeacon;
  });
});
