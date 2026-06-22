'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

/**
 * Form field primitives that match the `.frow / .flabel / .input / .select`
 * styling from the mockups. Each is react-hook-form friendly — pass a
 * `name` and they forward refs/value via `Controller` at the call site.
 */

const formRowBase = 'mb-[11px] block';

const labelBase =
  'mb-1 block text-[10px] font-medium text-ink-muted leading-tight';

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
        <span className="font-normal italic text-ink-faint"> (optional)</span>
      )}
    </Label>
  );
}

const inputClass =
  'h-[34px] rounded-[7px] border-[0.5px] border-line-strong bg-surface-panel px-2.5 text-[11px] text-ink placeholder:text-ink-faint focus-visible:border-bid focus-visible:ring-0 focus-visible:ring-offset-0';

const textareaClass =
  'rounded-[7px] border-[0.5px] border-line-strong bg-surface-panel px-2.5 py-2 text-[11px] text-ink placeholder:text-ink-faint focus-visible:border-bid focus-visible:ring-0 focus-visible:ring-offset-0';

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
        <p className="mt-1 text-[10px] text-danger" role="alert">
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
  options: { value: string; label: string }[];
  placeholder?: string;
  id?: string;
  className?: string;
}

export function FormSelect({
  value,
  onValueChange,
  options,
  placeholder,
  id,
  className,
}: FormSelectProps) {
  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger
        id={id}
        className={cn(
          'h-[34px] rounded-[7px] border-[0.5px] border-line-strong bg-surface-panel px-2.5 text-[11px] text-ink focus-visible:border-bid focus-visible:ring-0 focus-visible:ring-offset-0',
          className,
        )}
      >
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent className="text-[11px]">
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value} className="text-[11px]">
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
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
        'grid grid-cols-1 gap-2.5 sm:grid-cols-2',
        className,
      )}
    >
      {children}
    </div>
  );
}
