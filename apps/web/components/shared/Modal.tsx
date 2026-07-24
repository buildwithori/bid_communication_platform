'use client';

import * as React from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  /** Controls the max modal width while preserving mobile gutters. */
  width?: 'sm' | 'md' | 'wide' | 'xl' | 'media';
  children: React.ReactNode;
}

const widthClass: Record<NonNullable<ModalProps['width']>, string> = {
  sm: 'w-[460px]',
  md: 'w-[500px]',
  wide: 'w-[620px]',
  xl: 'w-[min(960px,calc(100vw-32px))]',
  media: 'w-[min(1360px,calc(100vw-24px))]',
};

export function Modal({
  open,
  onOpenChange,
  title,
  width = 'sm',
  children,
}: ModalProps) {
  React.useEffect(() => {
    if (!open) return;

    const body = document.body;
    const currentCount = Number(body.dataset.modalOpenCount ?? '0') + 1;
    body.dataset.modalOpenCount = String(currentCount);
    body.dataset.modalOpen = 'true';

    return () => {
      const nextCount = Math.max(Number(body.dataset.modalOpenCount ?? '1') - 1, 0);
      if (nextCount === 0) {
        delete body.dataset.modalOpen;
        delete body.dataset.modalOpenCount;
      } else {
        body.dataset.modalOpenCount = String(nextCount);
      }
    };
  }, [open]);

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="modal-overlay fixed inset-0 z-50 bg-foreground/30 backdrop-blur-[2px] dark:bg-black/65" />
        <DialogPrimitive.Content
          className={cn(
            'modal-content fixed left-1/2 top-1/2 z-50 flex max-h-[88vh] w-[calc(100vw-32px)] flex-col overflow-x-hidden overflow-y-auto rounded-2xl border border-border bg-surface-panel p-6 shadow-[0_28px_90px_hsl(var(--shadow-color)/0.3)] outline-none',
            width === 'media' && 'max-h-[calc(100vh-24px)] p-4 sm:p-5',
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
