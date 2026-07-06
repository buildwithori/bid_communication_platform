'use client';

import * as React from 'react';
import { ShieldCheck } from 'lucide-react';
import { BidLogo } from '@/components/shared/BidLogo';
import { cn } from '@/lib/utils';

export function AuthShell({
  title,
  description,
  children,
  footer,
  className,
  cardClassName,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
  cardClassName?: string;
}) {
  return (
    <main className="min-h-screen overflow-y-auto bg-surface text-ink">
      <section className="flex min-h-screen items-center justify-center px-5 py-8 sm:px-8">
        <div className={cn('w-full max-w-[500px]', className)}>
          <div className="mb-6 flex flex-col items-center text-center">
            <BidLogo size={76} variant="full" />
          </div>

          <div
            className={cn(
              'rounded-bid border border-line bg-white p-6 shadow-[0_18px_45px_rgba(26,26,26,0.07)] sm:p-8',
              cardClassName,
            )}
          >
            <div className="mb-5 inline-flex items-center gap-2 rounded-full bg-bid-light px-3 py-1 text-xs font-semibold text-bid-dark">
              <ShieldCheck className="h-3.5 w-3.5" />
              Secure BID Hub access
            </div>

            <div className="mb-6">
              <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
              {description && (
                <p className="mt-2 text-sm leading-6 text-ink-muted">{description}</p>
              )}
            </div>

            {children}
          </div>

          {footer && <div className="mt-5">{footer}</div>}
        </div>
      </section>
    </main>
  );
}
