'use client';

import * as React from 'react';
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

const weekdays = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const monthFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'long',
  year: 'numeric',
});

function parseDate(value?: string) {
  if (!value) return null;
  const [year, month, day] = value.split('-').map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day);
}

function toDateValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatDisplayDate(value?: string) {
  const date = parseDate(value);
  if (!date) return '';
  return new Intl.DateTimeFormat('en-US', {
    month: '2-digit',
    day: '2-digit',
    year: 'numeric',
  }).format(date);
}

function getCalendarDays(monthDate: Date) {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const firstOfMonth = new Date(year, month, 1);
  const start = new Date(year, month, 1 - firstOfMonth.getDay());

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return date;
  });
}

export interface DatePickerProps {
  value?: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export function DatePicker({
  value,
  onChange,
  onBlur,
  placeholder = 'Select date',
  disabled,
  className,
}: DatePickerProps) {
  const selectedDate = parseDate(value);
  const [open, setOpen] = React.useState(false);
  const [visibleMonth, setVisibleMonth] = React.useState<Date>(
    selectedDate ?? new Date(),
  );

  React.useEffect(() => {
    if (selectedDate) {
      setVisibleMonth(selectedDate);
    }
  }, [value]);

  const visibleDays = React.useMemo(
    () => getCalendarDays(visibleMonth),
    [visibleMonth],
  );

  const moveMonth = (offset: number) => {
    setVisibleMonth((current) => (
      new Date(current.getFullYear(), current.getMonth() + offset, 1)
    ));
  };

  const selectedValue = selectedDate ? toDateValue(selectedDate) : '';
  const displayValue = formatDisplayDate(value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          onBlur={onBlur}
          className={cn(
            'flex h-10 w-full items-center justify-between rounded-lg border border-black/[0.1] bg-surface-panel px-3 text-left text-sm font-normal shadow-sm outline-none transition hover:bg-surface-subtle focus:border-bid focus:ring-2 focus:ring-bid/10 disabled:pointer-events-none disabled:opacity-55',
            displayValue ? 'text-ink' : 'text-ink-faint',
            className,
          )}
        >
          <span>{displayValue || placeholder}</span>
          <CalendarDays className="h-4 w-4 text-ink-muted" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[292px] rounded-xl border-black/[0.08] bg-surface-panel p-3 shadow-xl">
        <div className="mb-3 flex items-center justify-between">
          <button
            type="button"
            onClick={() => moveMonth(-1)}
            className="grid h-8 w-8 place-items-center rounded-lg text-ink-muted transition hover:bg-surface-subtle hover:text-ink"
            aria-label="Previous month"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <div className="text-sm font-semibold text-ink">
            {monthFormatter.format(visibleMonth)}
          </div>
          <button
            type="button"
            onClick={() => moveMonth(1)}
            className="grid h-8 w-8 place-items-center rounded-lg text-ink-muted transition hover:bg-surface-subtle hover:text-ink"
            aria-label="Next month"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        <div className="grid grid-cols-7 gap-1 text-center">
          {weekdays.map((day) => (
            <div key={day} className="py-1 text-[11px] font-medium text-ink-faint">
              {day}
            </div>
          ))}
          {visibleDays.map((date) => {
            const dateValue = toDateValue(date);
            const isSelected = dateValue === selectedValue;
            const isOutsideMonth = date.getMonth() !== visibleMonth.getMonth();

            return (
              <button
                key={dateValue}
                type="button"
                onClick={() => {
                  onChange(dateValue);
                  setOpen(false);
                }}
                className={cn(
                  'grid h-8 place-items-center rounded-lg text-sm transition focus:outline-none focus:ring-2 focus:ring-bid/20',
                  isOutsideMonth
                    ? 'text-ink-faint hover:bg-surface-subtle'
                    : 'text-ink hover:bg-bid-light',
                  isSelected && 'bg-bid text-white hover:bg-bid',
                )}
              >
                {date.getDate()}
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
