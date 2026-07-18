'use client';

import * as React from 'react';
import { ShieldCheck } from 'lucide-react';
import { BidLogo } from '@/components/shared/BidLogo';
import { AuthThemeToggle } from '@/components/auth/AuthThemeToggle';
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
    <main className="h-screen h-[100dvh] overflow-y-auto bg-background text-foreground transition-colors duration-200">
      <section className="flex min-h-full items-center justify-center px-5 py-8 sm:px-8">
        <div className={cn('w-full max-w-[500px]', className)}>
          <div className="mb-6 flex flex-col items-center text-center">
            <BidLogo size={76} variant="full" />
          </div>

          <div
            className={cn(
              'rounded-bid border border-border bg-card p-6 text-card-foreground shadow-[0_18px_45px_rgba(26,26,26,0.07)] transition-colors duration-200 dark:shadow-[0_20px_60px_rgba(0,0,0,0.32)] sm:p-8',
              cardClassName,
            )}
          >
            <div className="mb-5 flex items-center justify-between gap-3">
              <div className="inline-flex items-center gap-2 rounded-full bg-accent px-3 py-1 text-xs font-semibold text-accent-foreground">
                <ShieldCheck className="h-3.5 w-3.5" />
                Secure BID Hub access
              </div>
              <AuthThemeToggle />
            </div>

            <div className="mb-6">
              <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
              {description && (
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p>
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
