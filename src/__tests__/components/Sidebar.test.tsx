import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import Sidebar from '@/components/Sidebar';

vi.mock('next/navigation', () => ({
  usePathname: () => '/portfolio',
}));

describe('Sidebar Component', () => {
  it('UT-UI-SIDEBAR-NEW-WINDOW-01: renders New Window button and invokes window.open', () => {
    const originalOpen = window.open;
    window.open = vi.fn();

    render(<Sidebar />);

    const newWindowBtn = screen.getByTestId('sidebar-new-window-btn');
    expect(newWindowBtn).toBeInTheDocument();

    fireEvent.click(newWindowBtn);

    expect(window.open).toHaveBeenCalledWith(
      '/portfolio',
      '_blank',
      'width=1280,height=800'
    );

    window.open = originalOpen;
  });

  it('UT-UI-SIDEBAR-SHORTCUT-01: invokes window.open when Cmd+Shift+N is pressed', () => {
    const originalOpen = window.open;
    window.open = vi.fn();

    const { unmount } = render(<Sidebar />);

    fireEvent.keyDown(window, {
      key: 'N',
      metaKey: true,
      shiftKey: true,
    });

    expect(window.open).toHaveBeenCalledWith(
      expect.stringContaining('http'),
      '_blank',
      'width=1280,height=800'
    );

    unmount();
    window.open = originalOpen;
  });

  it('UT-UI-SIDEBAR-BACKUP-01: invokes /api/system/backup on button click and shows success feedback', async () => {
    const originalFetch = global.fetch;
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true, filename: 'dev_20260912_153500.db.gz', size: 4500000 }),
    });

    render(<Sidebar />);

    const backupBtn = screen.getByTestId('sidebar-backup-btn');
    expect(backupBtn).toBeInTheDocument();

    fireEvent.click(backupBtn);

    expect(global.fetch).toHaveBeenCalledWith('/api/system/backup', { method: 'POST' });

    await waitFor(() => {
      expect(backupBtn).toHaveAttribute('title', expect.stringContaining('Saved dev_20260912_153500.db.gz'));
    });

    global.fetch = originalFetch;
  });

  it('UT-UI-SIDEBAR-BACKUP-02: shows error state when /api/system/backup fails or rejects', async () => {
    const originalFetch = global.fetch;
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ ok: false, error: 'Database locked' }),
    });

    render(<Sidebar />);

    const backupBtn = screen.getByTestId('sidebar-backup-btn');
    expect(backupBtn).toBeInTheDocument();

    fireEvent.click(backupBtn);

    await waitFor(() => {
      expect(backupBtn).toHaveAttribute('title', expect.stringContaining('Database locked'));
    });

    global.fetch = originalFetch;
  });
});
