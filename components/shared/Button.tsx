'use client';

import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { Slot } from '@radix-ui/react-slot';
import { cn } from '@/lib/utils';

/**
 * BID button. Variants mirror the `.bp / .bo / .bd / .bg2` classes from
 * the mockups. Sizes default to the mockup's compact pill.
 */
const buttonVariants = cva(
  'inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bid focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 font-sans',
  {
    variants: {
      variant: {
        // .bp — primary brand button
        primary: 'bg-bid text-white hover:bg-bid-dark',
        // .bo — outline / ghost button
        outline:
          'border-[0.5px] border-line-strong bg-transparent text-ink-muted hover:bg-surface-subtle hover:text-ink',
        // .bd — info / blue button (download, add-to-programme)
        info: 'bg-info text-white hover:bg-info-dark',
        // .bg2 — success / green button (reports)
        success: 'bg-success text-white hover:bg-success-dark',
        // .btn text-only subtle
        ghost: 'bg-transparent text-ink-muted hover:bg-surface-subtle hover:text-ink',
      },
      size: {
        sm: 'px-2 py-0.5 text-[9px]',
        md: 'px-3.5 py-1.5 text-[11px]',
        lg: 'px-4 py-2 text-xs',
        icon: 'h-8 w-8 p-0',
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
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp
        ref={ref}
        className={cn(buttonVariants({ variant, size }), className)}
        {...props}
      />
    );
  },
);
Button.displayName = 'Button';

export { Button, buttonVariants };
