'use client';

import * as React from 'react';
import { Search } from 'lucide-react';
import { Avatar } from '@/components/shared/Avatar';
import { Badge } from '@/components/shared/Badge';
import { Modal } from '@/components/shared/Modal';
import { cn } from '@/lib/utils';
import type { Trainer } from '@/types';

interface TrainerListProps {
  trainers: Trainer[];
  maxVisible?: number;
  emptyLabel?: string;
  className?: string;
  chipClassName?: string;
  modalTitle?: string;
}

export function TrainerList({
  trainers,
  maxVisible = 2,
  emptyLabel = 'No trainer yet',
  className,
  chipClassName,
  modalTitle = 'Programme trainers',
}: TrainerListProps) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState('');
  const visibleTrainers = trainers.slice(0, maxVisible);
  const hiddenCount = Math.max(trainers.length - visibleTrainers.length, 0);
  const filteredTrainers = React.useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return trainers;
    return trainers.filter((trainer) =>
      [trainer.fullName, trainer.email, trainer.role]
        .join(' ')
        .toLowerCase()
        .includes(needle),
    );
  }, [query, trainers]);

  if (trainers.length === 0) {
    return <span className="text-sm text-ink-faint">{emptyLabel}</span>;
  }

  return (
    <>
      <div className={cn('flex min-w-0 max-w-full flex-wrap items-center gap-1.5', className)}>
        {visibleTrainers.map((trainer) => (
          <Badge
            key={trainer.id}
            tone="neutral"
            className={cn('max-w-[220px] truncate', chipClassName)}
            title={`${trainer.fullName} (${trainer.role})`}
          >
            {trainer.fullName} ({trainer.role})
          </Badge>
        ))}
        {hiddenCount > 0 && (
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              setOpen(true);
            }}
            className="inline-flex items-center rounded-full bg-surface-subtle px-2.5 py-1 text-xs font-semibold leading-tight text-bid transition hover:bg-bid-light focus:outline-none focus-visible:ring-2 focus-visible:ring-bid/30"
          >
            +{hiddenCount} more
          </button>
        )}
      </div>

      <Modal open={open} onOpenChange={setOpen} title={modalTitle} width="wide">
        <div className="space-y-4">
          <div className="rounded-xl border border-line bg-surface-subtle px-4 py-3">
            <div className="text-sm font-semibold text-ink">
              {trainers.length} trainer{trainers.length === 1 ? '' : 's'} in this programme view
            </div>
            <div className="mt-1 text-sm text-ink-muted">
              Trainers are shown once, even when they support multiple learning assets.
            </div>
          </div>

          <label className="relative block">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search trainers..."
              className="h-10 w-full rounded-lg border border-line bg-white pl-9 pr-3 text-sm text-ink outline-none transition focus:border-bid focus:ring-2 focus:ring-bid/15"
            />
          </label>

          <div className="max-h-[360px] space-y-2 overflow-y-auto pr-1">
            {filteredTrainers.map((trainer) => (
              <div key={trainer.id} className="rounded-xl border border-line bg-white px-4 py-3">
                <div className="flex items-start gap-3">
                  <Avatar initials={trainer.initials} size={34} />
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-ink">{trainer.fullName}</div>
                    <div className="mt-1 truncate text-sm text-ink-muted" title={trainer.email}>
                      {trainer.email}
                    </div>
                  </div>
                  <Badge tone={trainer.accessLevel === 'guest' ? 'amber' : 'green'} className="shrink-0">
                    {trainer.role}
                  </Badge>
                </div>
              </div>
            ))}
            {filteredTrainers.length === 0 && (
              <div className="rounded-xl border border-dashed border-line px-4 py-8 text-center text-sm text-ink-muted">
                No trainer matches this search.
              </div>
            )}
          </div>
        </div>
      </Modal>
    </>
  );
}
