import type { ReactNode } from 'react';
import Link from 'next/link';
import { ArrowLeft, FileCheck2, Scale } from 'lucide-react';
import { BidLogo } from '@/components/shared/BidLogo';
import { ThemeToggle } from '@/components/theme/ThemeToggle';
import { PublicLegalFooter } from './PublicLegalFooter';

export type LegalSection = {
  id: string;
  title: string;
  content: ReactNode;
};

export function LegalPageShell({
  title,
  description,
  lastUpdated,
  sections,
}: {
  title: string;
  description: string;
  lastUpdated: string;
  sections: LegalSection[];
}) {
  return (
    <main className="h-screen overflow-y-auto bg-background text-foreground">
      <div className="min-h-full bg-[radial-gradient(circle_at_top_left,hsl(var(--primary)/0.10),transparent_30rem)]">
        <header className="border-b border-border bg-background/90 backdrop-blur-xl">
          <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-5 py-4 sm:px-8">
            <Link
              href="/auth/login"
              aria-label="BID Hub login"
              className="inline-flex items-center rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              <BidLogo size={46} variant="full" />
            </Link>
            <div className="flex items-center gap-2">
              <Link
                href="/auth/login"
                className="inline-flex h-9 items-center gap-2 rounded-lg border border-border bg-card px-3 text-sm font-medium text-muted-foreground transition-colors hover:border-primary/35 hover:text-primary"
              >
                <ArrowLeft className="h-4 w-4" />
                <span className="hidden sm:inline">Back to BID Hub</span>
                <span className="sm:hidden">Back</span>
              </Link>
              <ThemeToggle className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground transition-colors hover:border-primary/35 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary" />
            </div>
          </div>
        </header>

        <div className="mx-auto w-full max-w-7xl px-5 py-8 sm:px-8 sm:py-12">
          <section className="relative overflow-hidden rounded-2xl border border-border bg-card px-6 py-8 shadow-[0_24px_70px_hsl(var(--foreground)/0.06)] sm:px-10 sm:py-10">
            <div className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-primary/10 blur-3xl" />
            <div className="relative max-w-3xl">
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-primary/15 bg-accent px-3 py-1.5 text-xs font-semibold text-accent-foreground">
                <Scale className="h-3.5 w-3.5" />
                BID Hub legal
              </div>
              <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{title}</h1>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-muted-foreground sm:text-base">
                {description}
              </p>
              <div className="mt-6 inline-flex items-center gap-2 text-xs font-medium text-muted-foreground">
                <FileCheck2 className="h-4 w-4 text-primary" />
                Last updated {lastUpdated}
              </div>
            </div>
          </section>

          <nav
            aria-label={`${title} sections`}
            className="mt-5 rounded-xl border border-border bg-card p-4 lg:hidden"
          >
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              On this page
            </p>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {sections.map((section, index) => (
                <a
                  key={section.id}
                  href={`#${section.id}`}
                  className="whitespace-nowrap rounded-lg border border-border bg-secondary px-3 py-2 text-xs font-medium text-secondary-foreground transition-colors hover:border-primary/35 hover:text-primary"
                >
                  {index + 1}. {section.title}
                </a>
              ))}
            </div>
          </nav>

          <div className="mt-6 grid items-start gap-6 lg:grid-cols-[16rem_minmax(0,1fr)]">
            <aside className="sticky top-6 hidden rounded-xl border border-border bg-card p-4 lg:block">
              <p className="px-2 pb-3 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                On this page
              </p>
              <nav aria-label={`${title} table of contents`}>
                <ol className="space-y-1">
                  {sections.map((section, index) => (
                    <li key={section.id}>
                      <a
                        href={`#${section.id}`}
                        className="flex items-start gap-3 rounded-lg px-2 py-2 text-sm leading-5 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                      >
                        <span className="mt-0.5 w-5 shrink-0 font-mono text-[11px] text-primary">
                          {String(index + 1).padStart(2, '0')}
                        </span>
                        <span>{section.title}</span>
                      </a>
                    </li>
                  ))}
                </ol>
              </nav>
            </aside>

            <article className="space-y-4">
              {sections.map((section, index) => (
                <section
                  key={section.id}
                  id={section.id}
                  className="scroll-mt-6 rounded-xl border border-border bg-card p-5 shadow-[0_10px_35px_hsl(var(--foreground)/0.035)] sm:p-7"
                >
                  <div className="mb-4 flex items-start gap-3">
                    <span className="inline-flex h-7 min-w-7 items-center justify-center rounded-lg bg-accent px-2 font-mono text-xs font-semibold text-accent-foreground">
                      {String(index + 1).padStart(2, '0')}
                    </span>
                    <h2 className="pt-0.5 text-lg font-semibold tracking-tight">{section.title}</h2>
                  </div>
                  <div className="space-y-4 text-sm leading-7 text-muted-foreground [&_a]:font-medium [&_a]:text-primary [&_a]:underline [&_a]:underline-offset-4 [&_li]:pl-1 [&_strong]:font-semibold [&_strong]:text-foreground [&_ul]:ml-5 [&_ul]:list-disc [&_ul]:space-y-2">
                    {section.content}
                  </div>
                </section>
              ))}
            </article>
          </div>
        </div>

        <PublicLegalFooter />
      </div>
    </main>
  );
}
