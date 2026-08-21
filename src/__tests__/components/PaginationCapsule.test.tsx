import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { PaginationCapsule } from '@/components/common/PaginationCapsule';

describe('PaginationCapsule Component (UT-UI-PAGINATION-CAPSULE-01)', () => {
  it('renders nothing when totalPages is 1 or less', () => {
    const { container } = render(
      <PaginationCapsule page={1} totalPages={1} onPageChange={vi.fn()} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders capsule with prev/next buttons and page jump input', () => {
    const onPageChange = vi.fn();
    render(
      <PaginationCapsule
        page={2}
        totalPages={5}
        onPageChange={onPageChange}
        prevTestId="test-prev-btn"
        nextTestId="test-next-btn"
        inputTestId="test-page-input"
      />
    );

    expect(screen.getByText(/of 5/i)).toBeInTheDocument();
    const prevBtn = screen.getByTestId('test-prev-btn');
    const nextBtn = screen.getByTestId('test-next-btn');
    const input = screen.getByTestId('test-page-input') as HTMLInputElement;

    expect(input.value).toBe('2');
    expect(prevBtn).not.toBeDisabled();
    expect(nextBtn).not.toBeDisabled();

    fireEvent.click(prevBtn);
    expect(onPageChange).toHaveBeenCalledWith(1);

    fireEvent.click(nextBtn);
    expect(onPageChange).toHaveBeenCalledWith(3);
  });

  it('handles manual page input and clamps out-of-bound values on blur', () => {
    const onPageChange = vi.fn();
    render(
      <PaginationCapsule
        page={2}
        totalPages={10}
        onPageChange={onPageChange}
        inputTestId="test-page-input"
      />
    );

    const input = screen.getByTestId('test-page-input');

    // Valid jump to 7
    fireEvent.change(input, { target: { value: '7' } });
    fireEvent.blur(input);
    expect(onPageChange).toHaveBeenCalledWith(7);

    // Out of bound jump (99 -> clamped to 10)
    fireEvent.change(input, { target: { value: '99' } });
    fireEvent.blur(input);
    expect(onPageChange).toHaveBeenCalledWith(10);
  });

  it('disables prev button on page 1 and next button on last page', () => {
    const { rerender } = render(
      <PaginationCapsule
        page={1}
        totalPages={3}
        onPageChange={vi.fn()}
        prevTestId="test-prev"
        nextTestId="test-next"
      />
    );
    expect(screen.getByTestId('test-prev')).toBeDisabled();
    expect(screen.getByTestId('test-next')).not.toBeDisabled();

    rerender(
      <PaginationCapsule
        page={3}
        totalPages={3}
        onPageChange={vi.fn()}
        prevTestId="test-prev"
        nextTestId="test-next"
      />
    );
    expect(screen.getByTestId('test-prev')).not.toBeDisabled();
    expect(screen.getByTestId('test-next')).toBeDisabled();
  });
});
