import Link from 'next/link';
import { ArrowRight, Briefcase, ShieldCheck } from 'lucide-react';
import { BidLogo } from '@/components/shared/BidLogo';

/**
 * Landing page — entry point. Lets a visitor pick the entrepreneur app
 * or the admin console. (Auth is stubbed: a real role check would gate
 * these routes in middleware — see the README's "next steps" section.)
 */
export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col bg-surface text-ink">
      <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col justify-center px-6 py-12">
        {/* Brand */}
        <header className="mb-10 flex flex-col items-center text-center">
          <BidLogo size={56} />
          <h1 className="mt-4 text-[26px] font-semibold tracking-tight">BID Hub</h1>
          <p className="mt-1 text-[13px] text-ink-muted">
            Entrepreneur &amp; Programme Management Platform
          </p>
        </header>

        <div className="grid gap-4 sm:grid-cols-2">
          {/* Entrepreneur portal */}
          <Link
            href="/dashboard"
            className="group relative overflow-hidden rounded-bid border border-line bg-surface-panel p-6 transition-all hover:border-bid hover:shadow-lg"
          >
            <div className="mb-4 flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-bid-light">
                <Briefcase className="h-5 w-5 text-bid" />
              </span>
              <div>
                <div className="text-[15px] font-semibold">Entrepreneur Hub</div>
                <div className="text-[11px] text-ink-muted">Training, deliverables &amp; tools</div>
              </div>
            </div>
            <p className="text-[12px] leading-relaxed text-ink-muted">
              Continue your programme, submit deliverables, book mentoring
              sessions and track your fundraising goal.
            </p>
            <div className="mt-5 inline-flex items-center gap-1 text-[12px] font-medium text-bid">
              Enter as entrepreneur
              <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
            </div>
          </Link>

          {/* Admin console */}
          <Link
            href="/admin/dashboard"
            className="group relative overflow-hidden rounded-bid border border-line bg-surface-panel p-6 transition-all hover:border-bid hover:shadow-lg"
          >
            <div className="mb-4 flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-bid">
                <ShieldCheck className="h-5 w-5 text-white" />
              </span>
              <div>
                <div className="text-[15px] font-semibold">Admin Console</div>
                <div className="text-[11px] text-ink-muted">Programmes, trainers &amp; reporting</div>
              </div>
            </div>
            <p className="text-[12px] leading-relaxed text-ink-muted">
              Manage entrepreneurs and trainers, build programmes from reusable
              modules, generate documents and view cohort analytics.
            </p>
            <div className="mt-5 inline-flex items-center gap-1 text-[12px] font-medium text-bid">
              Enter as admin
              <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
            </div>
          </Link>
        </div>

        <p className="mt-8 text-center text-[10px] text-ink-faint">
          Demo build — auth and persistence are stubbed. See README for the
          production-readiness checklist.
        </p>
      </div>
    </main>
  );
}
