'use client';

import * as React from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  /** Renders a `.mo` (460px) or `.mo.wide` (620px) container. */
  width?: 'sm' | 'md' | 'wide';
  children: React.ReactNode;
}

const widthClass: Record<NonNullable<ModalProps['width']>, string> = {
  sm: 'w-[460px]',
  md: 'w-[500px]',
  wide: 'w-[620px]',
};

export function Modal({
  open,
  onOpenChange,
  title,
  width = 'sm',
  children,
}: ModalProps) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="modal-overlay fixed inset-0 z-50 bg-black/40 backdrop-blur-[1px]" />
        <DialogPrimitive.Content
          className={cn(
            'modal-content fixed left-1/2 top-1/2 z-50 flex max-h-[88vh] w-[calc(100vw-32px)] flex-col overflow-y-auto rounded-2xl border border-black/[0.08] bg-surface-panel p-6 shadow-[0_28px_90px_rgba(26,26,26,0.22)] outline-none',
            widthClass[width],
          )}
        >
          <div className="mb-4 flex items-center justify-between">
            <DialogPrimitive.Title className="text-lg font-semibold">
              {title}
            </DialogPrimitive.Title>
            <DialogPrimitive.Close
              aria-label="Close dialog"
              className="flex h-[26px] w-[26px] items-center justify-center rounded-md text-ink-faint transition-colors hover:bg-surface-subtle hover:text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-bid"
            >
              <X className="h-4 w-4" />
            </DialogPrimitive.Close>
          </div>
          {children}
          <DialogPrimitive.Description className="sr-only">
            {title}
          </DialogPrimitive.Description>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
