import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { SingleDatePicker } from '@/components/portfolio/SingleDatePicker';

describe('SingleDatePicker (UT-UI-DATE-01)', () => {
  it('renders trigger with formatted date', () => {
    render(<SingleDatePicker value="2026-08-14" onChange={() => {}} />);
    expect(screen.getByTestId('portfolio-add-date-picker-trigger')).toHaveTextContent('2026');
  });

  it('allows fast jumping to past year 2017 via Year and Month grid', () => {
    const handleChange = vi.fn();
    render(<SingleDatePicker value="2026-08-14" onChange={handleChange} />);

    // 1. Open popover
    fireEvent.click(screen.getByTestId('portfolio-add-date-picker-trigger'));
    expect(screen.getByTestId('portfolio-add-date-picker-popover')).toBeInTheDocument();

    // 2. Click Year button in header to enter Year Grid mode
    const yearHeaderBtn = screen.getByTestId('single-calendar-year-btn');
    expect(yearHeaderBtn).toHaveTextContent('2026');
    fireEvent.click(yearHeaderBtn);

    // 3. Select 2017 from Year Grid
    const year2017Btn = screen.getByTestId('single-calendar-year-2017');
    expect(year2017Btn).toBeInTheDocument();
    fireEvent.click(year2017Btn);

    // 4. Automatically transitions to Month Grid -> select Aug (index 7)
    const monthAugBtn = screen.getByTestId('single-calendar-month-7');
    expect(monthAugBtn).toBeInTheDocument();
    fireEvent.click(monthAugBtn);

    // 5. Transitions to Day Grid -> select day 21
    const day21Btn = screen.getByTestId('single-calendar-day-2017-08-21');
    expect(day21Btn).toBeInTheDocument();
    fireEvent.click(day21Btn);

    // 6. Verify date changed to 2017-08-21
    expect(handleChange).toHaveBeenCalledWith('2017-08-21');
  });

  it('allows navigating decades back and forth in year mode', () => {
    render(<SingleDatePicker value="2026-08-14" onChange={() => {}} />);

    fireEvent.click(screen.getByTestId('portfolio-add-date-picker-trigger'));
    fireEvent.click(screen.getByTestId('single-calendar-year-btn'));

    // Decade range is 2016 - 2027
    expect(screen.getByText(/2016\s*–\s*2027/)).toBeInTheDocument();

    // Click Prev to go to 2004 - 2015
    fireEvent.click(screen.getByTestId('single-calendar-prev-month'));
    expect(screen.getByText(/2004\s*–\s*2015/)).toBeInTheDocument();
    expect(screen.getByTestId('single-calendar-year-2010')).toBeInTheDocument();

    // Click Next to go back to 2016 - 2027
    fireEvent.click(screen.getByTestId('single-calendar-next-month'));
    expect(screen.getByText(/2016\s*–\s*2027/)).toBeInTheDocument();
  });

  it('selects today when clicking Today button', () => {
    const handleChange = vi.fn();
    render(<SingleDatePicker value="2017-08-21" onChange={handleChange} />);

    fireEvent.click(screen.getByTestId('portfolio-add-date-picker-trigger'));
    fireEvent.click(screen.getByText('Today'));

    expect(handleChange).toHaveBeenCalled();
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    expect(handleChange).toHaveBeenCalledWith(`${year}-${month}-${day}`);
  });
});
