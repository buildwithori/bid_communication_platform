'use client';

import * as React from 'react';
import { Check, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useDebouncedValue } from '@/lib/search';
import { InlineSpinner } from '@/components/shared/Button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from '@/components/ui/select';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

/**
 * Form field primitives that match the `.frow / .flabel / .input / .select`
 * styling from the mockups. Each is react-hook-form friendly — pass a
 * `name` and they forward refs/value via `Controller` at the call site.
 */

const formRowBase = 'mb-4 block min-w-0';

const labelBase =
  'mb-1.5 flex min-h-5 items-center gap-1.5 text-sm font-medium leading-5 text-ink-muted';

/** Renders a label with an italic muted `(optional)` hint. */
export function FieldLabel({
  children,
  optional,
  htmlFor,
}: {
  children: React.ReactNode;
  optional?: boolean;
  htmlFor?: string;
}) {
  return (
    <Label htmlFor={htmlFor} className={cn(labelBase)}>
      {children}
      {optional && (
        <span className="shrink-0 font-normal italic text-ink-faint">(optional)</span>
      )}
    </Label>
  );
}

const inputClass =
  'h-10 w-full rounded-lg border border-border bg-surface-panel px-3 text-sm font-normal text-ink shadow-sm placeholder:font-normal placeholder:text-ink-faint focus-visible:border-bid focus-visible:ring-2 focus-visible:ring-bid/10 focus-visible:ring-offset-0 disabled:border-border disabled:bg-muted disabled:text-muted-foreground disabled:opacity-100 disabled:shadow-none';

const textareaClass =
  'w-full rounded-lg border border-border bg-surface-panel px-3 py-2.5 text-sm font-normal text-ink shadow-sm placeholder:font-normal placeholder:text-ink-faint focus-visible:border-bid focus-visible:ring-2 focus-visible:ring-bid/10 focus-visible:ring-offset-0 disabled:border-border disabled:bg-muted disabled:text-muted-foreground disabled:opacity-100 disabled:shadow-none';

/** Field that owns its own label + error slot (simplest API for modals). */
export interface FormFieldProps {
  label: React.ReactNode;
  optional?: boolean;
  error?: string;
  htmlFor?: string;
  className?: string;
  children: React.ReactNode;
}

export function FormField({
  label,
  optional,
  error,
  htmlFor,
  className,
  children,
}: FormFieldProps) {
  return (
    <div className={cn(formRowBase, className)}>
      <FieldLabel optional={optional} htmlFor={htmlFor}>
        {label}
      </FieldLabel>
      {children}
      {error && (
        <p className="mt-1.5 text-xs text-danger" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

/** An input wired for direct field refs (register from react-hook-form). */
export const FormInput = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className, ...props }, ref) => (
  <Input ref={ref} className={cn(inputClass, className)} {...props} />
));
FormInput.displayName = 'FormInput';

export const FormTextarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <Textarea ref={ref} className={cn(textareaClass, className)} {...props} />
));
FormTextarea.displayName = 'FormTextarea';

/** A shadcn Select wrapper that matches the mockup's compact `.sel` style. */
export interface FormSelectProps {
  value: string;
  onValueChange: (value: string) => void;
  options: ReadonlyArray<{ value: string; label: string }>;
  placeholder?: string;
  id?: string;
  className?: string;
  disabled?: boolean;
  isLoading?: boolean;
}

export function FormSelect({
  value,
  onValueChange,
  options,
  placeholder,
  id,
  className,
  disabled,
  isLoading = false,
}: FormSelectProps) {
  const selectedOption = options.find((option) => option.value === value);

  return (
    <Select
      disabled={disabled}
      value={value}
      onValueChange={(nextValue: string) => {
        if (nextValue) onValueChange(nextValue);
      }}
    >
      <SelectTrigger
        id={id}
        loading={isLoading}
        aria-busy={isLoading}
        className={cn(
          'h-10 rounded-[7px] border border-line-strong bg-surface-panel px-3 text-sm text-ink focus-visible:border-bid focus-visible:ring-0 focus-visible:ring-offset-0 disabled:border-border disabled:bg-muted disabled:text-muted-foreground disabled:opacity-100 disabled:shadow-none',
          'h-10 w-full rounded-lg border-border font-normal shadow-sm focus-visible:ring-2 focus-visible:ring-bid/10 [&>span]:truncate',
          className,
        )}
      >
        <span className={cn('truncate', !selectedOption && 'text-ink-muted')}>
          {selectedOption?.label ?? placeholder}
        </span>
      </SelectTrigger>
      <SelectContent className="text-sm">
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value} className="text-sm">
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export interface FormAutocompleteProps {
  value: string;
  onValueChange: (value: string) => void;
  options: { value: string; label: string; description?: string | null }[];
  placeholder?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  className?: string;
  popoverClassName?: string;
  listClassName?: string;
  disabled?: boolean;
  isLoading?: boolean;
  loadingMessage?: string;
  onOpenChange?: (open: boolean) => void;
  onSearchChange?: (search: string) => void;
  hasMore?: boolean;
  onLoadMore?: () => void;
}

export function FormAutocomplete({
  value,
  onValueChange,
  options,
  placeholder = 'Select option',
  searchPlaceholder = 'Search...',
  emptyMessage = 'No results found.',
  className,
  popoverClassName,
  listClassName,
  disabled,
  isLoading = false,
  loadingMessage = 'Loading options...',
  onOpenChange,
  onSearchChange,
  hasMore = false,
  onLoadMore,
}: FormAutocompleteProps) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState('');
  const debouncedSearch = useDebouncedValue(search);
  const onSearchChangeRef = React.useRef(onSearchChange);
  const selected = options.find((option) => option.value === value);

  React.useEffect(() => {
    onSearchChangeRef.current = onSearchChange;
  }, [onSearchChange]);

  React.useEffect(() => {
    onSearchChangeRef.current?.(debouncedSearch);
  }, [debouncedSearch]);

  const handleListWheel = (event: React.WheelEvent<HTMLDivElement>) => {
    const list = event.currentTarget;
    if (list.scrollHeight <= list.clientHeight) return;

    event.stopPropagation();
    event.preventDefault();
    list.scrollTop += event.deltaY;
  };

  return (
    <Popover open={open} onOpenChange={(nextOpen: boolean) => {
      setOpen(nextOpen);
      if (!nextOpen) setSearch('');
      onOpenChange?.(nextOpen);
    }}>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          aria-busy={isLoading}
          className={cn(
            'flex h-10 w-full min-w-0 items-center justify-between rounded-lg border border-border bg-popover px-3 text-left text-sm font-normal text-popover-foreground shadow-sm outline-none transition hover:bg-accent focus:border-primary focus:ring-2 focus:ring-primary/10 disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground disabled:opacity-100 disabled:shadow-none disabled:hover:bg-muted',
            !selected && 'text-muted-foreground',
            className,
          )}
        >
          <span className="truncate">{selected?.label ?? placeholder}</span>
          {isLoading ? (
            <InlineSpinner className="ml-2 shrink-0 text-bid" />
          ) : (
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 text-muted-foreground" />
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className={cn('w-[var(--radix-popover-trigger-width)] p-0', popoverClassName)}>
        <Command shouldFilter={!onSearchChange}>
          <CommandInput
            value={search}
            placeholder={searchPlaceholder}
            onValueChange={setSearch}
          />
          <CommandList className={listClassName} onWheel={handleListWheel}>
            {!isLoading ? <CommandEmpty>{emptyMessage}</CommandEmpty> : null}
            <CommandGroup>
              {isLoading ? <AutocompleteLoadingRow message={loadingMessage} /> : null}
              {options.map((option) => (
                <CommandItem
                  key={option.value}
                  value={`${option.label} ${option.description ?? ''}`}
                  onSelect={() => {
                    onValueChange(option.value);
                    setOpen(false);
                  }}
                  className="flex items-start gap-2 px-3 py-2.5"
                >
                  <Check
                    className={cn(
                      'mt-0.5 h-4 w-4 shrink-0 text-bid',
                      option.value === value ? 'opacity-100' : 'opacity-0',
                    )}
                  />
                  <span className="min-w-0">
                    <span className="block truncate text-sm text-foreground">{option.label}</span>
                    {option.description && (
                      <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                        {option.description}
                      </span>
                    )}
                  </span>
                </CommandItem>
              ))}
              {hasMore && !isLoading ? (
                <CommandItem value="__load_more__" onSelect={() => onLoadMore?.()} className="justify-center text-bid">
                  Load more
                </CommandItem>
              ) : null}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

/** Two-column responsive grid used inside modals. */
export function FormRow2({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'grid grid-cols-1 gap-x-3 gap-y-0 sm:grid-cols-2',
        className,
      )}
    >
      {children}
    </div>
  );
}

export function AutocompleteLoadingRow({ message = 'Loading options...' }: { message?: string }) {
  return (
    <div className="flex items-center gap-2 px-3 py-3 text-sm text-ink-muted" role="status">
      <InlineSpinner className="text-bid" />
      <span>{message}</span>
    </div>
  );
}
