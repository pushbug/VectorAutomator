'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, X } from 'lucide-react';

interface DateRangePickerProps {
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  onChange: (range: { startDate: string; endDate: string }) => void;
  showLabel?: boolean;
  label?: string;
  testIdPrefix?: string;
  className?: string;
}


const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const MONTH_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

export function DateRangePicker({
  startDate,
  endDate,
  onChange,
  showLabel = true,
  label = 'Date Range',
  testIdPrefix = 'portfolio-date',
  className,
}: DateRangePickerProps) {

  const [isOpen, setIsOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'day' | 'month' | 'year'>('day');
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

  const [yearRangeStart, setYearRangeStart] = useState(() => {
    return Math.floor(viewDate.getFullYear() / 12) * 12;
  });

  // Sync viewDate when startDate changes externally
  useEffect(() => {
    if (startDate) {
      const d = new Date(startDate);
      if (!isNaN(d.getTime())) {
        setViewDate(new Date(d.getFullYear(), d.getMonth(), 1));
        setYearRangeStart(Math.floor(d.getFullYear() / 12) * 12);
      }
    }
  }, [startDate]);

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setViewMode('day');
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handlePrev = () => {
    if (viewMode === 'day') {
      setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1));
    } else if (viewMode === 'month') {
      setViewDate(new Date(viewDate.getFullYear() - 1, viewDate.getMonth(), 1));
    } else {
      setYearRangeStart((prev) => prev - 12);
    }
  };

  const handleNext = () => {
    if (viewMode === 'day') {
      setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1));
    } else if (viewMode === 'month') {
      setViewDate(new Date(viewDate.getFullYear() + 1, viewDate.getMonth(), 1));
    } else {
      setYearRangeStart((prev) => prev + 12);
    }
  };

  const handleMonthSelect = (monthIndex: number) => {
    setViewDate(new Date(viewDate.getFullYear(), monthIndex, 1));
    setViewMode('day');
  };

  const handleYearSelect = (year: number) => {
    setViewDate(new Date(year, viewDate.getMonth(), 1));
    setViewMode('month');
  };

  const openYearMode = (baseYear?: number) => {
    const targetYear = baseYear !== undefined ? baseYear : viewDate.getFullYear();
    setYearRangeStart(Math.floor(targetYear / 12) * 12);
    setViewMode('year');
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
        month: 'short',
        day: 'numeric',
        year: 'numeric',
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

  const renderMonthCalendar = (monthDate: Date, isRight = false) => {
    const year = monthDate.getFullYear();
    const month = monthDate.getMonth();

    const firstDayIndex = new Date(year, month, 1).getDay();
    const totalDays = new Date(year, month + 1, 0).getDate();

    const days: (Date | null)[] = [];
    for (let i = 0; i < firstDayIndex; i++) {
      days.push(null);
    }
    for (let d = 1; d <= totalDays; d++) {
      days.push(new Date(year, month, d));
    }

    return (
      <div className="flex-1 min-w-65">
        {/* Interactive Month & Year Buttons */}
        <div className="flex items-center justify-center gap-1.5 mb-3 text-sm">
          <button
            type="button"
            data-testid={isRight ? 'range-calendar-right-month-btn' : 'range-calendar-month-btn'}
            onClick={() => {
              if (isRight) setViewDate(monthDate);
              setViewMode('month');
            }}
            className="px-2 py-0.5 rounded-lg hover:bg-muted/10 font-bold text-foreground hover:text-primary transition-colors cursor-pointer"
          >
            {MONTH_NAMES[month]}
          </button>
          <button
            type="button"
            data-testid={isRight ? 'range-calendar-right-year-btn' : 'range-calendar-year-btn'}
            onClick={() => {
              if (isRight) setViewDate(monthDate);
              openYearMode(year);
            }}
            className="px-2 py-0.5 rounded-lg hover:bg-muted/10 font-bold text-foreground hover:text-primary transition-colors cursor-pointer"
          >
            {year}
          </button>
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
              cellStyle = 'bg-primary text-primary-foreground font-semibold rounded-md shadow-xs';
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

  const renderMonthGrid = () => {
    const currentMonth = viewDate.getMonth();
    return (
      <div className="w-full max-w-sm mx-auto py-2">
        <div className="grid grid-cols-3 gap-2.5">
          {MONTH_SHORT.map((name, idx) => {
            const isSelected = currentMonth === idx;
            return (
              <button
                key={name}
                type="button"
                data-testid={`range-calendar-month-${idx}`}
                onClick={() => handleMonthSelect(idx)}
                className={`py-3 px-4 text-xs font-semibold rounded-xl transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-primary text-primary-foreground font-bold shadow-xs'
                    : 'text-foreground hover:bg-primary/20 border border-border/60 hover:border-primary/40'
                }`}
              >
                {name}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  const renderYearGrid = () => {
    const currentYear = viewDate.getFullYear();
    const years = Array.from({ length: 12 }, (_, i) => yearRangeStart + i);

    return (
      <div className="w-full max-w-sm mx-auto py-2">
        <div className="grid grid-cols-3 gap-2.5">
          {years.map((y) => {
            const isSelected = currentYear === y;
            return (
              <button
                key={y}
                type="button"
                data-testid={`range-calendar-year-${y}`}
                onClick={() => handleYearSelect(y)}
                className={`py-3 px-4 text-xs font-semibold rounded-xl transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-primary text-primary-foreground font-bold shadow-xs'
                    : 'text-foreground hover:bg-primary/20 border border-border/60 hover:border-primary/40'
                }`}
              >
                {y}
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
    <div className={`relative ${className || 'w-full'}`} ref={containerRef}>
      {showLabel && <label className="block text-sm font-medium text-foreground mb-1">{label}</label>}
      <div
        data-testid={`${testIdPrefix}-picker-trigger`}
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between gap-2 px-3 py-2 border border-border rounded-md bg-background text-foreground cursor-pointer hover:border-primary/60 transition-colors h-10.5 w-full select-none"
      >
        <div className="flex items-center gap-2 text-xs truncate min-w-0 flex-1">
          <CalendarIcon size={15} className="text-primary shrink-0" />
          <span className={`truncate ${startDate ? 'text-foreground font-medium' : 'text-muted'}`}>
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
            data-testid={`${testIdPrefix}-clear-btn`}
            onClick={handleClear}
            className="text-muted hover:text-foreground p-1 rounded-full hover:bg-muted/10 transition-colors cursor-pointer shrink-0 ml-1"
            title="Clear dates"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {isOpen && (
        <div
          data-testid={`${testIdPrefix}-picker-popover`}
          className="absolute top-full left-0 mt-2 z-50 bg-surface border border-border rounded-xl shadow-xl p-4 w-80 md:w-150"
        >

          {/* Header navigation */}
          <div className="flex items-center justify-between mb-4">
            <button
              type="button"
              data-testid="calendar-prev-month"
              onClick={handlePrev}
              className="p-1.5 rounded-lg border border-border hover:bg-background text-foreground transition-colors cursor-pointer"
            >
              <ChevronLeft size={18} />
            </button>
            
            {/* Center Header Indicator */}
            {viewMode === 'day' && (
              <div className="text-sm font-medium text-muted">
                {startDate && endDate ? `${formatDisplayDate(startDate)} – ${formatDisplayDate(endDate)}` : 'Select range'}
              </div>
            )}
            {viewMode === 'month' && (
              <button
                type="button"
                onClick={() => openYearMode()}
                className="px-2.5 py-1 rounded-lg hover:bg-muted/10 text-sm font-bold text-foreground hover:text-primary transition-colors cursor-pointer"
              >
                {viewDate.getFullYear()}
              </button>
            )}
            {viewMode === 'year' && (
              <div className="text-sm font-bold text-foreground">
                {yearRangeStart} – {yearRangeStart + 11}
              </div>
            )}

            <button
              type="button"
              data-testid="calendar-next-month"
              onClick={handleNext}
              className="p-1.5 rounded-lg border border-border hover:bg-background text-foreground transition-colors cursor-pointer"
            >
              <ChevronRight size={18} />
            </button>
          </div>

          {/* Main Body depending on viewMode */}
          {viewMode === 'day' && (
            <div className="flex flex-col md:flex-row gap-6">
              {renderMonthCalendar(viewDate, false)}
              <div className="hidden md:block flex-1">
                {renderMonthCalendar(rightMonthDate, true)}
              </div>
            </div>
          )}

          {viewMode === 'month' && renderMonthGrid()}
          {viewMode === 'year' && renderYearGrid()}

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
                  setViewDate(new Date());
                  setViewMode('day');
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
                onClick={() => {
                  setIsOpen(false);
                  setViewMode('day');
                }}
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
