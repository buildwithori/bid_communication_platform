'use client';

import { PlayCircle, FileText, Wrench } from 'lucide-react';
import { Card } from '@/components/shared/Card';
import { ProgressBar } from '@/components/shared/ProgressBar';
import { cn } from '@/lib/utils';
import type { Program } from '@/types';

/**
 * Programme card as seen on the entrepreneur Training Library page.
 */
export function ProgramCard({
  program,
  onClick,
}: {
  program: Program;
  onClick?: () => void;
}) {
  const accentBg =
    program.accent === 'bid'
      ? 'bg-bid-light'
      : program.accent === 'info'
        ? 'bg-info-light'
        : 'bg-success-light';
  const stroke =
    program.accent === 'bid' ? 'text-bid' : program.accent === 'info' ? 'text-info' : 'text-success';

  return (
    <Card onClick={onClick} className={cn('cursor-pointer transition-colors hover:border-bid')}>
      <div
        className={cn('mb-3 flex h-[38px] w-[38px] items-center justify-center rounded-[9px]', accentBg)}
      >
        <PlayCircle className={cn('h-[18px] w-[18px]', stroke)} strokeWidth={1.5} />
      </div>
      <div className="mb-1 text-[13px] font-medium">{program.name}</div>
      <div className="mb-2.5 text-[10px] leading-relaxed text-ink-muted">
        {program.description}
      </div>
      <div className="flex items-center gap-2">
        <ProgressBar
          value={program.progress}
          width="100px"
          barClassName={
            program.accent === 'info'
              ? 'bg-info'
              : program.accent === 'success'
                ? 'bg-success'
                : 'bg-bid'
          }
        />
        <span className="text-[10px] text-ink-muted">
          {program.progress}% · {program.moduleIds.length} modules
        </span>
      </div>
    </Card>
  );
}

export const contentIcon = {
  video: PlayCircle,
  pdf: FileText,
  tool: Wrench,
} as const;
