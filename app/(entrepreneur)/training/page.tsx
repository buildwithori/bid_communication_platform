'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { PlayCircle } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardHeader } from '@/components/shared/Card';
import { Modal } from '@/components/shared/Modal';
import { Button } from '@/components/shared/Button';
import { ProgramCard } from '@/components/entrepreneur/ProgramCard';
import { ContentRating } from '@/components/entrepreneur/ContentRating';
import { programs } from '@/lib/mock-data/programs';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface FreeResource {
  id: string;
  title: string;
  meta: string;
  accent: 'bid' | 'info' | 'success';
}

const freeResources: FreeResource[] = [
  { id: 'fr-pitch', title: 'Intro to Pitching Investors', meta: '12 min · Free for all entrepreneurs', accent: 'success' },
  { id: 'fr-captable', title: 'Understanding Cap Tables', meta: '8 min · Free for all entrepreneurs', accent: 'info' },
  { id: 'fr-bookkeeping', title: 'Basics of Bookkeeping', meta: '10 min · Free for all entrepreneurs', accent: 'bid' },
];

const accentBg = { bid: 'bg-bid-light', info: 'bg-info-light', success: 'bg-success-light' } as const;
const accentFg = { bid: 'text-bid', info: 'text-info', success: 'text-success-dark' } as const;

export default function TrainingLibraryPage() {
  const router = useRouter();
  const [activeResource, setActiveResource] = React.useState<FreeResource | null>(null);

  return (
    <>
      <PageHeader
        title="Training Library"
        description="Browse your programmes and complete training modules"
      />
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        {programs.map((p) => (
          <ProgramCard key={p.id} program={p} onClick={() => router.push(`/training/${p.id}`)} />
        ))}
      </div>

      <div className="mt-6">
        <div className="mb-1 text-xs font-medium">Free resources</div>
        <p className="mb-3 text-[11px] text-ink-muted">
          Standalone chapters available to everyone on the platform — not part of a specific programme.
        </p>
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
          {freeResources.map((r) => (
            <button
              key={r.id}
              onClick={() => setActiveResource(r)}
              className="group flex flex-col rounded-bid border border-line bg-surface-panel p-3.5 text-left transition-colors hover:border-bid"
            >
              <div className={cn('mb-2.5 flex h-8 w-8 items-center justify-center rounded-[7px]', accentBg[r.accent])}>
                <PlayCircle className={cn('h-4 w-4', accentFg[r.accent])} strokeWidth={1.5} />
              </div>
              <div className="text-xs font-medium leading-tight">{r.title}</div>
              <div className="mt-1 text-[10px] text-ink-muted">{r.meta}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Video modal for free resources */}
      <Modal
        open={!!activeResource}
        onOpenChange={(o) => !o && setActiveResource(null)}
        title={activeResource?.title ?? ''}
        width="wide"
      >
        {activeResource && (
          <>
            <div className={cn('mb-3.5 flex h-[200px] items-center justify-center rounded-lg', accentBg[activeResource.accent])}>
              <button
                onClick={() => toast.success('Video playing…')}
                className={cn('flex h-12 w-12 items-center justify-center rounded-full', accentBg[activeResource.accent], 'border-2', 'border-current', accentFg[activeResource.accent])}
                aria-label="Play video"
              >
                <PlayCircle className={cn('h-5 w-5', accentFg[activeResource.accent])} strokeWidth={1.5} />
              </button>
            </div>
            <div className="mb-4 text-[11px] text-ink-muted">{activeResource.meta}</div>
            <Button className="mb-4 w-full" onClick={() => toast.success('Playing…')}>
              ▶ Play video
            </Button>
            <ContentRating contentId={activeResource.id} onSaved={() => {}} />
          </>
        )}
      </Modal>
    </>
  );
}
