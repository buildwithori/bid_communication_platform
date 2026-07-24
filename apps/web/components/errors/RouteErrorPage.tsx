'use client';

import Link from 'next/link';
import { AlertTriangle, ArrowLeft, RefreshCw } from 'lucide-react';
import { BidLogo } from '@/components/shared/BidLogo';
import { Button } from '@/components/shared/Button';
import { ThemeToggle } from '@/components/theme/ThemeToggle';

export function RouteErrorPage({
  code,
  title,
  description,
  onRetry,
}: {
  code: string;
  title: string;
  description: string;
  onRetry?: () => void;
}) {
  return (
    <main className="h-screen overflow-y-auto bg-background text-foreground">
      <div className="flex min-h-full flex-col bg-[radial-gradient(circle_at_top,hsl(var(--primary)/0.12),transparent_34rem)]">
        <header className="mx-auto flex w-full max-w-7xl items-center justify-between px-5 py-5 sm:px-8">
          <Link href="/" aria-label="BID Hub home">
            <BidLogo size={48} variant="full" />
          </Link>
          <ThemeToggle className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary" />
        </header>
        <section className="mx-auto flex w-full max-w-3xl flex-1 items-center px-5 py-10 sm:px-8">
          <div className="w-full overflow-hidden rounded-2xl border border-border bg-card p-7 text-center shadow-[0_30px_90px_hsl(var(--foreground)/0.09)] sm:p-12">
            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-primary/15 bg-accent text-primary">
              <AlertTriangle className="h-7 w-7" />
            </span>
            <p className="mt-6 font-mono text-sm font-semibold tracking-[0.18em] text-primary">
              {code}
            </p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
              {title}
            </h1>
            <p className="mx-auto mt-4 max-w-xl text-sm leading-7 text-muted-foreground sm:text-base">
              {description}
            </p>
            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              {onRetry ? (
                <Button onClick={onRetry}>
                  <RefreshCw className="h-4 w-4" />
                  Try again
                </Button>
              ) : null}
              <Button asChild variant="outline">
                <Link href="/">
                  <ArrowLeft className="h-4 w-4" />
                  Return to BID Hub
                </Link>
              </Button>
            </div>
          </div>
        </section>
        <footer className="px-5 py-6 text-center text-xs text-muted-foreground">
          If the problem continues, contact{' '}
          <a className="font-medium text-primary" href="mailto:info@bidcpsme.com">
            info@bidcpsme.com
          </a>
          .
        </footer>
      </div>
    </main>
  );
}
