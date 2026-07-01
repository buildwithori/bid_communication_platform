'use client';

import * as React from 'react';
import { ChevronLeft, ChevronRight, MoreHorizontal, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export interface Column<T> {
  key: string;
  header: React.ReactNode;
  cell: (row: T) => React.ReactNode;
  className?: string;
  headerClassName?: string;
}

export interface DataTableProps<T> {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  rowClassName?: (row: T) => string | undefined;
  emptyMessage?: string;
  className?: string;
  tableClassName?: string;
}

export type RowAction = {
  label: string;
  onSelect: () => void;
  disabled?: boolean;
  destructive?: boolean;
};

export function DataTable<T>({
  columns,
  rows,
  rowKey,
  rowClassName,
  emptyMessage = 'No rows yet.',
  className,
  tableClassName,
}: DataTableProps<T>) {
  return (
    <div
      className={cn(
        'overflow-hidden rounded-xl border border-black/[0.08] bg-white',
        className,
      )}
    >
      <div className="overflow-x-auto">
        <table
          className={cn(
            'w-full min-w-[760px] border-separate border-spacing-0 text-sm',
            tableClassName,
          )}
        >
          <thead className="bg-surface-subtle/80">
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key}
                  scope="col"
                  className={cn(
                    'whitespace-nowrap border-b border-line px-4 py-3 text-left text-xs font-medium uppercase tracking-[0.04em] text-ink-muted first:pl-5 last:pr-5',
                    column.headerClassName,
                  )}
                >
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white">
            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-4 py-12 text-center text-sm text-ink-faint"
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr
                  key={rowKey(row)}
                  className={cn(
                    'group transition-colors hover:bg-surface-subtle/70',
                    rowClassName?.(row),
                  )}
                >
                  {columns.map((column) => (
                    <td
                      key={column.key}
                      className={cn(
                        'border-b border-line/80 px-4 py-4 align-middle text-ink first:pl-5 last:pr-5 group-last:border-b-0',
                        column.className,
                      )}
                    >
                      {column.cell(row)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function TableToolbar({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'mb-4 flex flex-col gap-3 rounded-xl border border-black/[0.08] bg-surface-subtle/70 p-3 sm:flex-row sm:items-center sm:justify-between',
        className,
      )}
    >
      {children}
    </div>
  );
}

export const TableFilterInput = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement> & { icon?: boolean }
>(({ className, icon = false, ...props }, ref) => (
  <div className="relative">
    {icon && (
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" />
    )}
    <input
      ref={ref}
      className={cn(
        'h-9 w-full rounded-lg border border-black/[0.1] bg-white px-3 text-sm font-normal text-ink shadow-sm outline-none transition placeholder:font-normal placeholder:text-ink-faint focus:border-bid focus:ring-2 focus:ring-bid/10',
        icon && 'pl-9',
        className,
      )}
      {...props}
    />
  </div>
));
TableFilterInput.displayName = 'TableFilterInput';

export const TableFilterSelect = React.forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement>
>(({ className, children, ...props }, ref) => (
  <select
    ref={ref}
    className={cn(
      'h-9 w-full rounded-lg border border-black/[0.1] bg-white px-3 text-sm font-normal text-ink shadow-sm outline-none transition focus:border-bid focus:ring-2 focus:ring-bid/10',
      className,
    )}
    {...props}
  >
    {children}
  </select>
));
TableFilterSelect.displayName = 'TableFilterSelect';

export function TableEmptyState({
  title,
  description,
  action,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-dashed border-line-strong bg-surface-subtle px-4 py-10 text-center">
      <div className="font-medium text-ink">{title}</div>
      {description && (
        <div className="mt-1 text-sm text-ink-muted">{description}</div>
      )}
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  );
}

export function RowActions({
  actions,
  label = 'Open row actions',
}: {
  actions: Array<RowAction | 'separator'>;
  label?: string;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-black/[0.08] bg-white text-ink-muted shadow-sm transition hover:bg-surface-subtle hover:text-ink focus:outline-none focus:ring-2 focus:ring-bid/20"
          aria-label={label}
        >
          <MoreHorizontal className="h-4 w-4" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-[180px] rounded-xl border-black/[0.08] p-1.5 shadow-xl">
        {actions.map((action, index) =>
          action === 'separator' ? (
            <DropdownMenuSeparator key={`separator-${index}`} />
          ) : (
            <DropdownMenuItem
              key={action.label}
              onSelect={action.onSelect}
              disabled={action.disabled}
              className={cn(
                'cursor-pointer rounded-lg px-2.5 py-2 text-sm',
                action.destructive && 'text-danger focus:text-danger',
              )}
            >
              {action.label}
            </DropdownMenuItem>
          ),
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function TablePagination({
  page,
  pageSize,
  totalItems,
  pageSizeOptions = [10, 25, 50],
  onPageChange,
  onPageSizeChange,
  className,
}: {
  page: number;
  pageSize: number;
  totalItems: number;
  pageSizeOptions?: number[];
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  className?: string;
}) {
  const totalPages = Math.max(Math.ceil(totalItems / pageSize), 1);
  const currentPage = Math.min(Math.max(page, 1), totalPages);
  const start = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const end = Math.min(currentPage * pageSize, totalItems);

  return (
    <div
      className={cn(
        'mt-4 flex flex-col gap-3 rounded-xl border border-black/[0.08] bg-white px-4 py-3 text-sm text-ink-muted sm:flex-row sm:items-center sm:justify-between',
        className,
      )}
    >
      <div>
        Showing <span className="font-medium text-ink">{start}-{end}</span> of{' '}
        <span className="font-medium text-ink">{totalItems}</span>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2">
          <span>Rows per page</span>
          <TableFilterSelect
            value={String(pageSize)}
            onChange={(event) => onPageSizeChange(Number(event.target.value))}
            className="h-8 w-[76px]"
          >
            {pageSizeOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </TableFilterSelect>
        </label>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage <= 1}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-black/[0.08] bg-white text-ink-muted transition hover:bg-surface-subtle disabled:pointer-events-none disabled:opacity-45"
            aria-label="Previous page"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="min-w-[72px] text-center">
            Page <span className="font-medium text-ink">{currentPage}</span> of {totalPages}
          </span>
          <button
            type="button"
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage >= totalPages}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-black/[0.08] bg-white text-ink-muted transition hover:bg-surface-subtle disabled:pointer-events-none disabled:opacity-45"
            aria-label="Next page"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
