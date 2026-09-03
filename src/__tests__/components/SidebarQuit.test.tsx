import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import Sidebar from '@/components/Sidebar';

vi.mock('next/navigation', () => ({
  usePathname: () => '/dashboard',
}));

describe('Sidebar Quit App (UT-UI-SIDEBAR-QUIT-01)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true }),
    });
  });

  it('UT-UI-SIDEBAR-QUIT-01: renders Quit App button, opens confirm dialog, and calls /api/system/quit', async () => {
    render(<Sidebar />);

    const quitBtn = screen.getByTestId('sidebar-quit-app-btn');
    expect(quitBtn).toBeInTheDocument();

    // Dialog should not be visible initially
    expect(screen.queryByTestId('quit-app-confirm-dialog')).not.toBeInTheDocument();

    // Click Quit App button
    fireEvent.click(quitBtn);

    // Dialog should now be visible
    expect(screen.getByTestId('quit-app-confirm-dialog')).toBeInTheDocument();
    expect(screen.getByText('Quit VectorAutomator?')).toBeInTheDocument();

    // Click Cancel
    const cancelBtn = screen.getByTestId('quit-app-cancel-btn');
    fireEvent.click(cancelBtn);

    // Dialog should close
    expect(screen.queryByTestId('quit-app-confirm-dialog')).not.toBeInTheDocument();
    expect(global.fetch).not.toHaveBeenCalled();

    // Open dialog again and confirm quit
    fireEvent.click(quitBtn);
    const confirmBtn = screen.getByTestId('quit-app-confirm-btn');
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/system/quit', { method: 'POST' });
    });
  });
});
