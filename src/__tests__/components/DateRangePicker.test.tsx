import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DateRangePicker } from '@/components/portfolio/DateRangePicker';

describe('DateRangePicker Component', () => {
  it('UT-UI-DATE-RANGE-01: toggles popover, switches to year grid, and selects past year', () => {
    const handleChange = vi.fn();

    render(
      <DateRangePicker
        startDate=""
        endDate=""
        onChange={handleChange}
      />
    );

    // Open popover
    const trigger = screen.getByTestId('portfolio-date-picker-trigger');
    fireEvent.click(trigger);

    expect(screen.getByTestId('portfolio-date-picker-popover')).toBeInTheDocument();

    // Click year button in left calendar header
    const yearBtn = screen.getByTestId('range-calendar-year-btn');
    expect(yearBtn).toBeInTheDocument();
    fireEvent.click(yearBtn);

    // Should render year grid buttons (e.g. 2021, 2022, 2023)
    const year2023Btn = screen.getByTestId('range-calendar-year-2023');
    expect(year2023Btn).toBeInTheDocument();
    fireEvent.click(year2023Btn);

    // Should switch to month grid
    const monthFebBtn = screen.getByTestId('range-calendar-month-1'); // Feb is index 1
    expect(monthFebBtn).toBeInTheDocument();
    fireEvent.click(monthFebBtn);

    // Should switch back to day grid for Feb 2023
    expect(screen.getByTestId('calendar-day-2023-02-07')).toBeInTheDocument();

    // Click day 2023-02-07
    fireEvent.click(screen.getByTestId('calendar-day-2023-02-07'));
    expect(handleChange).toHaveBeenCalledWith({ startDate: '2023-02-07', endDate: '' });
  });
});
