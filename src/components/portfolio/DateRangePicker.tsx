'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, X } from 'lucide-react';

interface DateRangePickerProps {
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  onChange: (range: { startDate: string; endDate: string }) => void;
}

export function DateRangePicker({ startDate, endDate, onChange }: DateRangePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [hoverDate, setHoverDate] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Month currently displayed on the left (defaults to startDate or current date)
  const [viewDate, setViewDate] = useState(() => {
    if (startDate) {
      const d = new Date(startDate);
      if (!isNaN(d.getTime())) {
        return new Date(d.getFullYear(), d.getMonth(), 1);
      }
    }
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const prevMonth = () => {
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1));
  };

  const rightMonthDate = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1);

  const formatDateStr = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const formatDisplayDate = (dateStr: string) => {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const date = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
      return date.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      });
    }
    return dateStr;
  };

  const handleDateClick = (dateStr: string) => {
    if (!startDate || (startDate && endDate)) {
      // Start new selection
      onChange({ startDate: dateStr, endDate: '' });
    } else if (startDate && !endDate) {
      if (new Date(dateStr) < new Date(startDate)) {
        // Clicked earlier date, make it the new start date
        onChange({ startDate: dateStr, endDate: '' });
      } else {
        // Complete the range
        onChange({ startDate, endDate: dateStr });
      }
    }
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange({ startDate: '', endDate: '' });
  };

  const renderMonthCalendar = (monthDate: Date) => {
    const year = monthDate.getFullYear();
    const month = monthDate.getMonth();
    const monthName = monthDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

    const firstDayIndex = new Date(year, month, 1).getDay();
    const totalDays = new Date(year, month + 1, 0).getDate();

    const days: (Date | null)[] = [];
    // Blank padding before the 1st day
    for (let i = 0; i < firstDayIndex; i++) {
      days.push(null);
    }
    for (let d = 1; d <= totalDays; d++) {
      days.push(new Date(year, month, d));
    }

    return (
      <div className="flex-1 min-w-65">
        <div className="text-center font-semibold text-foreground mb-3 text-sm">
          {monthName}
        </div>
        <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-muted mb-2">
          <span className="text-blue-500">Sun</span>
          <span>Mon</span>
          <span>Tue</span>
          <span>Wed</span>
          <span>Thu</span>
          <span>Fri</span>
          <span className="text-blue-500">Sat</span>
        </div>
        <div className="grid grid-cols-7 gap-y-1 text-center text-xs">
          {days.map((dateObj, idx) => {
            if (!dateObj) {
              return <div key={`empty-${idx}`} className="h-8" />;
            }

            const dateStr = formatDateStr(dateObj);
            const isStart = startDate === dateStr;
            const isEnd = endDate === dateStr;

            // Range highlighting
            const currentEffectiveEnd = endDate || (startDate && hoverDate && new Date(hoverDate) > new Date(startDate) ? hoverDate : null);
            const inRange =
              startDate &&
              currentEffectiveEnd &&
              new Date(dateStr) >= new Date(startDate) &&
              new Date(dateStr) <= new Date(currentEffectiveEnd);

            const isToday = formatDateStr(new Date()) === dateStr;

            let cellStyle = 'hover:bg-primary/20 text-foreground rounded-md';
            if (isStart || isEnd) {
              cellStyle = 'bg-primary text-primary-foreground font-semibold rounded-md shadow-sm';
            } else if (inRange) {
              cellStyle = 'bg-primary/15 text-primary rounded-none';
              if (dateObj.getDay() === 0) cellStyle += ' rounded-l-md';
              if (dateObj.getDay() === 6) cellStyle += ' rounded-r-md';
            }

            return (
              <button
                key={dateStr}
                type="button"
                data-testid={`calendar-day-${dateStr}`}
                onClick={() => handleDateClick(dateStr)}
                onMouseEnter={() => setHoverDate(dateStr)}
                onMouseLeave={() => setHoverDate(null)}
                className={`h-8 flex items-center justify-center transition-colors relative font-medium ${cellStyle} ${isToday && !isStart && !isEnd ? 'border border-primary/40' : ''}`}
              >
                {dateObj.getDate()}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  const getSummaryText = () => {
    if (startDate && endDate) {
      const d1 = new Date(startDate);
      const d2 = new Date(endDate);
      const diffTime = Math.abs(d2.getTime() - d1.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
      return `${formatDisplayDate(startDate)} – ${formatDisplayDate(endDate)} (${diffDays} days)`;
    }
    if (startDate) {
      return `${formatDisplayDate(startDate)} – Select end date`;
    }
    return 'Select date range';
  };

  return (
    <div className="relative" ref={containerRef}>
      <label className="block text-sm font-medium text-foreground mb-1">Date Range</label>
      <div
        data-testid="portfolio-date-picker-trigger"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between gap-2 px-3 py-2 border border-border rounded-md bg-background text-foreground cursor-pointer hover:border-primary/60 transition-colors h-10.5 min-w-65"
      >
        <div className="flex items-center gap-2 text-sm truncate">
          <CalendarIcon size={16} className="text-primary shrink-0" />
          <span className={startDate ? 'text-foreground font-medium' : 'text-muted'}>
            {startDate && endDate
              ? `${formatDisplayDate(startDate)} – ${formatDisplayDate(endDate)}`
              : startDate
              ? `${formatDisplayDate(startDate)} – ...`
              : 'Select date range'}
          </span>
        </div>
        {startDate && (
          <button
            type="button"
            data-testid="portfolio-date-clear-btn"
            onClick={handleClear}
            className="text-muted hover:text-foreground p-1 rounded-full hover:bg-muted/10 transition-colors"
            title="Clear dates"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {isOpen && (
        <div
          data-testid="portfolio-date-picker-popover"
          className="absolute top-full left-0 mt-2 z-50 bg-surface border border-border rounded-xl shadow-xl p-4 w-80 md:w-150"
        >
          {/* Header navigation */}
          <div className="flex items-center justify-between mb-4">
            <button
              type="button"
              data-testid="calendar-prev-month"
              onClick={prevMonth}
              className="p-1.5 rounded-lg border border-border hover:bg-background text-foreground transition-colors cursor-pointer"
            >
              <ChevronLeft size={18} />
            </button>
            <div className="text-sm font-medium text-muted">
              {startDate && endDate ? `${formatDisplayDate(startDate)} – ${formatDisplayDate(endDate)}` : 'Select range'}
            </div>
            <button
              type="button"
              data-testid="calendar-next-month"
              onClick={nextMonth}
              className="p-1.5 rounded-lg border border-border hover:bg-background text-foreground transition-colors cursor-pointer"
            >
              <ChevronRight size={18} />
            </button>
          </div>

          {/* Calendars */}
          <div className="flex flex-col md:flex-row gap-6">
            {renderMonthCalendar(viewDate)}
            <div className="hidden md:block flex-1">
              {renderMonthCalendar(rightMonthDate)}
            </div>
          </div>

          {/* Footer summary & actions */}
          <div className="mt-4 pt-3 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <div className="text-muted font-medium truncate">
              {getSummaryText()}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => {
                  const todayStr = formatDateStr(new Date());
                  onChange({ startDate: todayStr, endDate: todayStr });
                }}
                className="px-2.5 py-1.5 rounded border border-border hover:bg-background text-foreground transition-colors cursor-pointer"
              >
                Today
              </button>
              {startDate && (
                <button
                  type="button"
                  onClick={handleClear}
                  className="px-2.5 py-1.5 rounded border border-border hover:bg-destructive/10 text-destructive transition-colors cursor-pointer"
                >
                  Reset
                </button>
              )}
              <button
                type="button"
                data-testid="calendar-done-btn"
                onClick={() => setIsOpen(false)}
                className="px-3 py-1.5 bg-primary text-primary-foreground font-medium rounded hover:bg-primary/90 transition-colors cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
