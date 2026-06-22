'use client';

import { cn } from '@/lib/utils';

/**
 * Generic table used across the admin console. Mirrors the styling of
 * the mockup's `<table>` element: hairline row borders, 10px header
 * font, hover-tinted rows, sticky nowrap headers.
 *
 * Columns are declared as render functions so each cell can compose
 * badges, avatars, action buttons, etc.
 */
export interface Column<T> {
  key: string;
  header: React.ReactNode;
  /** Render the cell contents for a row. */
  cell: (row: T) => React.ReactNode;
  className?: string;
  headerClassName?: string;
}

export interface DataTableProps<T> {
  columns: Column<T>[];
  rows: T[];
  /** Key extractor — must be stable per row. */
  rowKey: (row: T) => string;
  /** Optional per-row className. */
  rowClassName?: (row: T) => string | undefined;
  emptyMessage?: string;
  className?: string;
}

export function DataTable<T>({
  columns,
  rows,
  rowKey,
  rowClassName,
  emptyMessage = 'No rows yet.',
  className,
}: DataTableProps<T>) {
  return (
    <div className={cn('overflow-x-auto', className)}>
      <table className="w-full border-collapse text-[11px]">
        <thead>
          <tr>
            {columns.map((c) => (
              <th
                key={c.key}
                scope="col"
                className={cn(
                  'whitespace-nowrap border-b border-line px-2.5 py-1.5 text-left text-[10px] font-medium text-ink-muted',
                  c.headerClassName,
                )}
              >
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length}
                className="px-2.5 py-6 text-center text-[11px] text-ink-faint"
              >
                {emptyMessage}
              </td>
            </tr>
          ) : (
            rows.map((row) => (
              <tr
                key={rowKey(row)}
                className={cn(
                  'transition-colors hover:bg-surface-subtle',
                  rowClassName?.(row),
                )}
              >
                {columns.map((c) => (
                  <td
                    key={c.key}
                    className={cn(
                      'border-b border-line px-2.5 py-2 align-middle last:border-b-0',
                      c.className,
                    )}
                  >
                    {c.cell(row)}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
