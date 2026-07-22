'use client';

import * as React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ChevronLeft, ChevronRight, MoreHorizontal, Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from '@/components/ui/select';
import { FormAutocomplete, type FormAutocompleteProps } from '@/components/shared/FormField';

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
  rowProps?: (row: T) => React.HTMLAttributes<HTMLTableRowElement> | undefined;
  sortableRows?: boolean;
  emptyMessage?: string;
  className?: string;
  tableClassName?: string;
}

interface SortableRowContextValue {
  attributes: Record<string, unknown>;
  listeners?: Record<string, unknown>;
  setActivatorNodeRef: (node: HTMLElement | null) => void;
  disabled: boolean;
  isDragging: boolean;
}

const SortableRowContext = React.createContext<SortableRowContextValue>({
  attributes: {},
  listeners: undefined,
  setActivatorNodeRef: () => undefined,
  disabled: true,
  isDragging: false,
});

export function useSortableRow() {
  return React.useContext(SortableRowContext);
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
  rowProps,
  sortableRows = false,
  emptyMessage = 'No rows yet.',
  className,
  tableClassName,
}: DataTableProps<T>) {
  return (
    <div
      className={cn(
        'data-table overflow-hidden rounded-xl border border-border bg-card',
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
          <tbody className="bg-card">
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
                <DataTableRow
                  key={rowKey(row)}
                  row={row}
                  rowId={rowKey(row)}
                  columns={columns}
                  rowClassName={rowClassName}
                  rowProps={rowProps}
                  sortable={sortableRows}
                />
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}


function DataTableRow<T>({
  row,
  rowId,
  columns,
  rowClassName,
  rowProps,
  sortable,
}: {
  row: T;
  rowId: string;
  columns: Column<T>[];
  rowClassName?: (row: T) => string | undefined;
  rowProps?: (row: T) => React.HTMLAttributes<HTMLTableRowElement> | undefined;
  sortable: boolean;
}) {
  const {
    attributes,
    listeners,
    setActivatorNodeRef,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: rowId,
    disabled: !sortable,
    transition: {
      duration: 220,
      easing: 'cubic-bezier(0.2, 0, 0, 1)',
    },
  });
  const extraRowProps = rowProps?.(row) ?? {};
  const { className: extraRowClassName, style: extraRowStyle, ...restRowProps } = extraRowProps;
  const isInteractive = Boolean(
    restRowProps.onClick ||
      restRowProps.onDoubleClick ||
      restRowProps.onKeyDown,
  );
  const rowContext = React.useMemo<SortableRowContextValue>(
    () => ({
      attributes: attributes as unknown as Record<string, unknown>,
      listeners: listeners as unknown as Record<string, unknown> | undefined,
      setActivatorNodeRef,
      disabled: !sortable,
      isDragging,
    }),
    [attributes, isDragging, listeners, setActivatorNodeRef, sortable],
  );

  return (
    <SortableRowContext.Provider value={rowContext}>
      <tr
        ref={setNodeRef}
        data-interactive={isInteractive ? 'true' : undefined}
        {...restRowProps}
        className={cn(
          'group transition-colors duration-150',
          isInteractive
            ? 'cursor-pointer hover:bg-bid-light/55 focus-within:bg-bid-light/55 focus-visible:bg-bid-light/55 active:bg-bid-light/80 focus-visible:outline-none'
            : 'hover:bg-surface-subtle/70',
          isDragging && 'relative z-10 bg-card shadow-xl',
          rowClassName?.(row),
          extraRowClassName,
        )}
        style={{
          ...extraRowStyle,
          transform: CSS.Transform.toString(transform),
          transition,
        }}
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
    </SortableRowContext.Provider>
  );
}

export function TableToolbar({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const items = React.Children.toArray(children);
  const [copy, ...actions] = items;
  const controlCount = actions.reduce<number>((count, action) => {
    if (!React.isValidElement<{ children?: React.ReactNode }>(action)) {
      return count + 1;
    }

    const childCount = React.Children.count(action.props.children);
    return count + Math.max(childCount, 1);
  }, 0);

  return (
    <div
      className={cn(
        'table-toolbar mb-4 flex flex-wrap items-start gap-3 rounded-xl border border-border bg-surface-subtle/70 p-3',
        className,
      )}
    >
      {copy ? <div className="table-toolbar-copy">{copy}</div> : null}
      {actions.length > 0 ? (
        <div className="table-toolbar-actions" data-control-count={controlCount}>
          {actions}
        </div>
      ) : null}
    </div>
  );
}

export const TableFilterInput = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement> & {
    icon?: boolean;
    onClear?: () => void;
  }
>(({ className, icon = false, onClear, value, disabled, ...props }, ref) => {
  const showClear = Boolean(onClear && String(value ?? '').length > 0);
  return (
    <div className="relative">
      {icon && (
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" />
      )}
      <input
        ref={ref}
        value={value}
        disabled={disabled}
        className={cn(
          'h-9 w-full rounded-lg border border-border bg-card px-3 text-sm font-normal text-ink shadow-sm outline-none transition placeholder:font-normal placeholder:text-ink-faint focus:border-bid focus:ring-2 focus:ring-bid/10',
          icon && 'pl-9',
          showClear && 'pr-9',
          className,
        )}
        {...props}
      />
      {showClear ? (
        <button
          type="button"
          disabled={disabled}
          onMouseDown={(event) => event.preventDefault()}
          onClick={onClear}
          className="absolute right-2 top-1/2 grid h-6 w-6 -translate-y-1/2 place-items-center rounded-md text-ink-faint transition hover:bg-bid-light hover:text-bid focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bid/25 disabled:pointer-events-none disabled:opacity-50"
          aria-label="Clear search"
          title="Clear search"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      ) : null}
    </div>
  );
});
TableFilterInput.displayName = 'TableFilterInput';

type TableFilterSelectProps = Omit<
  React.SelectHTMLAttributes<HTMLSelectElement>,
  'children' | 'defaultValue' | 'multiple' | 'size'
> & {
  children: React.ReactNode;
  placeholder?: React.ReactNode;
};

function getOptionData(children: React.ReactNode) {
  return React.Children.toArray(children).flatMap((child) => {
    if (!React.isValidElement<React.OptionHTMLAttributes<HTMLOptionElement>>(child)) {
      return [];
    }

    const value = child.props.value;
    if (value === undefined || value === null) return [];

    return [{
      value: String(value),
      label: child.props.children,
      disabled: child.props.disabled,
    }];
  });
}

export const TableFilterSelect = React.forwardRef<
  HTMLButtonElement,
  TableFilterSelectProps
>(({ className, children, value, onChange, disabled, id, name, placeholder, ...props }, ref) => {
  const options = getOptionData(children);
  const currentValue = String(value ?? options[0]?.value ?? '');
  const currentOption = options.find((option) => option.value === currentValue);

  return (
    <Select
      value={currentValue}
      disabled={disabled}
      name={name}
      onValueChange={(nextValue: string) => {
        onChange?.({
          target: { value: nextValue, name },
          currentTarget: { value: nextValue, name },
        } as React.ChangeEvent<HTMLSelectElement>);
      }}
    >
      <SelectTrigger
        ref={ref}
        id={id}
        className={cn(
          'h-9 w-full rounded-lg border border-border bg-card px-3 text-sm font-normal text-ink shadow-sm outline-none transition focus:border-bid focus:ring-2 focus:ring-bid/10 focus:ring-offset-0 [&>span]:truncate',
          className,
        )}
        aria-label={props['aria-label']}
      >
        <span className="block min-w-0 truncate">
          {currentOption?.label ?? placeholder ?? 'Select'}
        </span>
      </SelectTrigger>
      <SelectContent className="rounded-xl border-border bg-card p-1.5 text-sm shadow-xl">
        {options.map((option) => (
          <SelectItem
            key={option.value}
            value={option.value}
            disabled={option.disabled}
            className="rounded-lg py-2 pl-8 pr-2 text-sm text-ink focus:bg-bid-light focus:text-bid-dark"
          >
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
});
TableFilterSelect.displayName = 'TableFilterSelect';

export function TableFilterAutocomplete({
  className,
  popoverClassName,
  listClassName,
  ...props
}: FormAutocompleteProps) {
  return (
    <FormAutocomplete
      className={cn('h-9 bg-card', className)}
      popoverClassName={cn('min-w-[220px]', popoverClassName)}
      listClassName={cn('max-h-64', listClassName)}
      {...props}
    />
  );
}

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
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-card text-ink-muted shadow-sm transition hover:bg-surface-subtle hover:text-ink focus:outline-none focus:ring-2 focus:ring-bid/20"
          aria-label={label}
        >
          <MoreHorizontal className="h-4 w-4" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-[180px] rounded-xl border-border p-1.5 shadow-xl">
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
        'mt-4 flex flex-col gap-3 rounded-xl border border-border bg-card px-4 py-3 text-sm text-ink-muted sm:flex-row sm:items-center sm:justify-between',
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
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-card text-ink-muted transition hover:bg-surface-subtle disabled:pointer-events-none disabled:opacity-45"
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
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-card text-ink-muted transition hover:bg-surface-subtle disabled:pointer-events-none disabled:opacity-45"
            aria-label="Next page"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
