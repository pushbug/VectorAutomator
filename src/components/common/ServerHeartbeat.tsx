'use client';

import { useEffect } from 'react';

/**
 * ServerHeartbeat component
 * Emits telemetry pings every 5000ms while any window or tab is active.
 * Ensures the background server stays alive while any window is in use,
 * and enables graceful auto-shutdown 25s after all tabs/windows are closed.
 */
export function ServerHeartbeat() {
  useEffect(() => {
    // Generate or reuse unique tab ID
    let tabId = '';
    try {
      tabId = window.sessionStorage?.getItem('va_client_tab_id') || '';
      if (!tabId) {
        tabId = `tab_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
        window.sessionStorage?.setItem('va_client_tab_id', tabId);
      }
    } catch {
      tabId = `tab_${Date.now()}`;
    }

    const sendPing = () => {
      try {
        fetch('/api/system/heartbeat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tabId, action: 'ping' }),
          keepalive: true,
        }).catch(() => {
          // Network errors during shutdown are safe to ignore
        });
      } catch {
        // Ignored
      }
    };

    // Initial ping
    sendPing();

    // 5-second recurring beacon
    const interval = setInterval(sendPing, 5000);

    // Disconnect beacon when tab/window is closed
    const handleUnload = () => {
      try {
        if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
          navigator.sendBeacon(
            '/api/system/heartbeat',
            new Blob([JSON.stringify({ tabId, action: 'disconnect' })], {
              type: 'application/json',
            })
          );
        }
      } catch {
        // Ignored
      }
    };

    window.addEventListener('pagehide', handleUnload);
    window.addEventListener('beforeunload', handleUnload);

    return () => {
      clearInterval(interval);
      window.removeEventListener('pagehide', handleUnload);
      window.removeEventListener('beforeunload', handleUnload);
    };
  }, []);

  return null;
}
