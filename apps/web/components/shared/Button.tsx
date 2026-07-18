'use client';

import * as React from 'react';
import { LoaderCircle } from 'lucide-react';
import { cva, type VariantProps } from 'class-variance-authority';
import { Slot } from '@radix-ui/react-slot';
import { cn } from '@/lib/utils';

/**
 * BID button. Variants mirror the `.bp / .bo / .bd / .bg2` classes from
 * the mockups, with larger sizing for production readability.
 */
const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bid focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 font-sans',
  {
    variants: {
      variant: {
        // .bp — primary brand button
        primary: 'bg-bid text-white hover:bg-bid-dark',
        // .bo — outline / ghost button
        outline:
          'border-[0.5px] border-line-strong bg-transparent text-ink-muted hover:border-bid/45 hover:bg-bid-light hover:text-bid',
        // .bd — info / blue button (download, add-to-programme)
        info: 'bg-info text-white hover:bg-info-dark',
        // .bg2 — success / green button (reports)
        success: 'bg-success text-white hover:bg-success-dark',
        // destructive — irreversible or negative action
        destructive: 'bg-danger text-white hover:bg-danger-dark focus-visible:ring-danger',
        // .btn text-only subtle
        ghost: 'bg-transparent text-ink-muted hover:bg-surface-subtle hover:text-ink',
      },
      size: {
        sm: 'h-8 px-3 text-xs',
        md: 'h-9 px-4 text-sm',
        lg: 'h-10 px-5 text-sm',
        icon: 'h-9 w-9 p-0',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  isLoading?: boolean;
  loadingLabel?: React.ReactNode;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, isLoading = false, loadingLabel, children, disabled, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp
        ref={ref}
        className={cn(buttonVariants({ variant, size }), className)}
        aria-busy={isLoading || undefined}
        disabled={asChild ? undefined : disabled || isLoading}
        {...props}
      >
        {asChild ? children : (<>
          {isLoading ? <InlineSpinner /> : null}
          {isLoading && loadingLabel ? loadingLabel : children}
        </>)}
      </Comp>
    );
  },
);
Button.displayName = 'Button';

export function InlineSpinner({ className }: { className?: string }) {
  return <LoaderCircle aria-hidden="true" className={cn('h-4 w-4 animate-spin', className)} />;
}

export { Button, buttonVariants };
