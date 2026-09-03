import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
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
});
