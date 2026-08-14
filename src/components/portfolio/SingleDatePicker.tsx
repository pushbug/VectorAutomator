'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';

interface SingleDatePickerProps {
  value: string; // YYYY-MM-DD
  onChange: (date: string) => void;
  label?: string;
  testId?: string;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const MONTH_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

export function SingleDatePicker({
  value,
  onChange,
  label,
  testId = 'portfolio-add-date-picker',
}: SingleDatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'day' | 'month' | 'year'>('day');
  const [yearRangeStart, setYearRangeStart] = useState(2016);
  const containerRef = useRef<HTMLDivElement>(null);

  // Helper to format Date to YYYY-MM-DD
  const formatDateStr = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Helper to format display string (e.g. "Thu, Aug 14, 2026")
  const formatDisplayDate = (dateStr: string) => {
    if (!dateStr) return 'Select date';
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const date = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
      return date.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    }
    return dateStr;
  };

  // Current view month
  const [viewDate, setViewDate] = useState(() => {
    if (value) {
      const d = new Date(value);
      if (!isNaN(d.getTime())) {
        return new Date(d.getFullYear(), d.getMonth(), 1);
      }
    }
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  // Sync viewDate when value changes from outside
  useEffect(() => {
    if (value) {
      const d = new Date(value);
      if (!isNaN(d.getTime())) {
        const newDate = new Date(d.getFullYear(), d.getMonth(), 1);
        setViewDate(newDate);
        setYearRangeStart(Math.floor(d.getFullYear() / 12) * 12);
      }
    }
  }, [value]);

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

  const handleDateClick = (dateStr: string) => {
    onChange(dateStr);
    setIsOpen(false);
    setViewMode('day');
  };

  const handleMonthSelect = (monthIndex: number) => {
    setViewDate(new Date(viewDate.getFullYear(), monthIndex, 1));
    setViewMode('day');
  };

  const handleYearSelect = (year: number) => {
    setViewDate(new Date(year, viewDate.getMonth(), 1));
    setViewMode('month');
  };

  const openYearMode = () => {
    setYearRangeStart(Math.floor(viewDate.getFullYear() / 12) * 12);
    setViewMode('year');
  };

  const renderDayCalendar = (monthDate: Date) => {
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

    const todayStr = formatDateStr(new Date());

    return (
      <div className="w-full">
        <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-muted mb-2">
          <span className="text-blue-500">Sun</span>
          <span>Mon</span>
          <span>Tue</span>
          <span>Wed</span>
          <span>Thu</span>
          <span>Fri</span>
          <span className="text-blue-500">Sat</span>
        </div>
        <div className="grid grid-cols-7 gap-1 text-center text-xs">
          {days.map((dateObj, idx) => {
            if (!dateObj) {
              return <div key={`empty-${idx}`} className="h-8" />;
            }

            const dateStr = formatDateStr(dateObj);
            const isSelected = value === dateStr;
            const isToday = todayStr === dateStr;

            let cellStyle = 'hover:bg-primary/20 text-foreground rounded-md';
            if (isSelected) {
              cellStyle = 'bg-primary text-primary-foreground font-semibold rounded-md shadow-sm';
            }

            return (
              <button
                key={dateStr}
                type="button"
                data-testid={`single-calendar-day-${dateStr}`}
                onClick={() => handleDateClick(dateStr)}
                className={`h-8 flex items-center justify-center transition-colors relative font-medium ${cellStyle} ${
                  isToday && !isSelected ? 'border border-primary/40' : ''
                }`}
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
      <div className="grid grid-cols-3 gap-2 py-2">
        {MONTH_SHORT.map((name, idx) => {
          const isSelected = currentMonth === idx;
          return (
            <button
              key={name}
              type="button"
              data-testid={`single-calendar-month-${idx}`}
              onClick={() => handleMonthSelect(idx)}
              className={`py-2.5 px-3 text-xs font-medium rounded-lg transition-colors cursor-pointer ${
                isSelected
                  ? 'bg-primary text-primary-foreground font-semibold shadow-sm'
                  : 'text-foreground hover:bg-primary/20 border border-border/50'
              }`}
            >
              {name}
            </button>
          );
        })}
      </div>
    );
  };

  const renderYearGrid = () => {
    const currentYear = viewDate.getFullYear();
    const years = Array.from({ length: 12 }, (_, i) => yearRangeStart + i);

    return (
      <div className="grid grid-cols-3 gap-2 py-2">
        {years.map((y) => {
          const isSelected = currentYear === y;
          return (
            <button
              key={y}
              type="button"
              data-testid={`single-calendar-year-${y}`}
              onClick={() => handleYearSelect(y)}
              className={`py-2.5 px-3 text-xs font-medium rounded-lg transition-colors cursor-pointer ${
                isSelected
                  ? 'bg-primary text-primary-foreground font-semibold shadow-sm'
                  : 'text-foreground hover:bg-primary/20 border border-border/50'
              }`}
            >
              {y}
            </button>
          );
        })}
      </div>
    );
  };

  return (
    <div className="relative" ref={containerRef}>
      {label && (
        <label className="block text-sm font-medium text-foreground mb-1">
          {label}
        </label>
      )}
      <div
        data-testid={`${testId}-trigger`}
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between gap-2 px-3 py-2 border border-border rounded-md bg-background text-foreground cursor-pointer hover:border-primary/60 transition-colors h-10 w-full"
      >
        <div className="flex items-center gap-2 text-sm truncate">
          <CalendarIcon size={16} className="text-primary shrink-0" />
          <span className={value ? 'text-foreground font-medium' : 'text-muted'}>
            {formatDisplayDate(value)}
          </span>
        </div>
      </div>

      {isOpen && (
        <div
          data-testid={`${testId}-popover`}
          className="absolute top-full left-0 mt-2 z-50 bg-surface border border-border rounded-xl shadow-xl p-4 w-72 sm:w-80"
        >
          {/* Header navigation */}
          <div className="flex items-center justify-between mb-3">
            <button
              type="button"
              data-testid="single-calendar-prev-month"
              onClick={handlePrev}
              className="p-1.5 rounded-lg border border-border hover:bg-background text-foreground transition-colors cursor-pointer"
            >
              <ChevronLeft size={16} />
            </button>

            {/* Interactive Month & Year selectors in header */}
            <div className="flex items-center gap-1 text-sm font-semibold text-foreground">
              {viewMode === 'day' && (
                <>
                  <button
                    type="button"
                    data-testid="single-calendar-month-btn"
                    onClick={() => setViewMode('month')}
                    className="px-2 py-1 rounded-md hover:bg-primary/10 text-foreground transition-colors cursor-pointer"
                  >
                    {MONTH_NAMES[viewDate.getMonth()]}
                  </button>
                  <button
                    type="button"
                    data-testid="single-calendar-year-btn"
                    onClick={openYearMode}
                    className="px-2 py-1 rounded-md hover:bg-primary/10 text-foreground transition-colors cursor-pointer"
                  >
                    {viewDate.getFullYear()}
                  </button>
                </>
              )}

              {viewMode === 'month' && (
                <button
                  type="button"
                  data-testid="single-calendar-year-btn"
                  onClick={openYearMode}
                  className="px-2 py-1 rounded-md hover:bg-primary/10 text-foreground transition-colors cursor-pointer"
                >
                  {viewDate.getFullYear()}
                </button>
              )}

              {viewMode === 'year' && (
                <span className="px-2 py-1 text-muted text-xs">
                  {yearRangeStart} – {yearRangeStart + 11}
                </span>
              )}
            </div>

            <button
              type="button"
              data-testid="single-calendar-next-month"
              onClick={handleNext}
              className="p-1.5 rounded-lg border border-border hover:bg-background text-foreground transition-colors cursor-pointer"
            >
              <ChevronRight size={16} />
            </button>
          </div>

          {/* Calendar Content View */}
          {viewMode === 'day' && renderDayCalendar(viewDate)}
          {viewMode === 'month' && renderMonthGrid()}
          {viewMode === 'year' && renderYearGrid()}

          {/* Footer actions */}
          <div className="mt-3 pt-3 border-t border-border flex items-center justify-between text-xs">
            <button
              type="button"
              onClick={() => {
                const today = new Date();
                const todayStr = formatDateStr(today);
                setViewDate(new Date(today.getFullYear(), today.getMonth(), 1));
                handleDateClick(todayStr);
              }}
              className="px-2.5 py-1.5 rounded border border-border hover:bg-background text-foreground transition-colors cursor-pointer"
            >
              Today
            </button>
            <button
              type="button"
              data-testid={`${testId}-done-btn`}
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
      )}
    </div>
  );
}

