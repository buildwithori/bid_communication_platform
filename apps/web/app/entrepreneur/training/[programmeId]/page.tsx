'use client';

import * as React from 'react';
import Link from 'next/link';
import type { Route } from 'next';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import {
  ArrowLeft,
  BookOpen,
  FileText,
  Layers3,
  PlayCircle,
  Wrench,
} from 'lucide-react';
import { Badge } from '@/components/shared/Badge';
import { Breadcrumb } from '@/components/shared/Breadcrumb';
import { Button } from '@/components/shared/Button';
import { Card } from '@/components/shared/Card';
import { ProgrammeCoursePlayer } from '@/components/learning/ProgrammeCoursePlayer';
import { ProgrammePlayerPageSkeleton } from '@/components/entrepreneur/training/TrainingLibrarySkeletons';
import { Notice, PageHeader } from '@/components/shared/PageHeader';
import { ProgressBar } from '@/components/shared/ProgressBar';
import {
  useProgrammePlayerQuery,
  type ProgrammePlayerPayload,
} from '@/lib/api/programmes';
import { routes } from '@/lib/routes';

export default function EntrepreneurProgrammePlayerPage() {
  const params = useParams<{ programmeId: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();
  const player = useProgrammePlayerQuery(params.programmeId);
  const requestedContentId = searchParams.get('content');
  const requestedModuleId = searchParams.get('module');

  if (player.isLoading && !player.data) {
    return <ProgrammePlayerPageSkeleton />;
  }

  if (player.isError || !player.data) {
    return (
      <>
        <Breadcrumb
          items={[
            { label: 'Training Library', href: routes.entrepreneur.training },
            { label: 'Programme' },
          ]}
        />
        <PageHeader
          title="Programme could not be loaded"
          description="The learning workspace is temporarily unavailable."
        />
        <Card>
          <Notice>
            {player.error?.message ??
              'Return to the training library and choose another programme.'}
          </Notice>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button type="button" onClick={() => void player.refetch()}>
              Try again
            </Button>
            <Button asChild variant="outline">
              <Link href={routes.entrepreneur.training}>
                Back to training library
              </Link>
            </Button>
          </div>
        </Card>
      </>
    );
  }

  const data: ProgrammePlayerPayload = player.data;
  const moduleFirstContent = requestedModuleId
    ? data.modules.find((module) => module.id === requestedModuleId)?.items[0]
        ?.id
    : null;
  const initialContentId = requestedContentId ?? moduleFirstContent ?? null;

  return (
    <>
      <Breadcrumb
        items={[
          { label: 'Training Library', href: routes.entrepreneur.training },
          { label: data.programme.name },
        ]}
      />
      <PageHeader
        title={data.programme.name}
        description={
          data.programme.description ||
          'Learn through the complete programme curriculum.'
        }
        actions={
          <Button asChild variant="outline">
            <Link href={routes.entrepreneur.training}>
              <ArrowLeft className="h-4 w-4" />
              Training library
            </Link>
          </Button>
        }
      />

      <ProgrammeSummary data={data} />

      <ProgrammeCoursePlayer
        data={data}
        initialContentId={initialContentId}
        onContentChange={(contentItemId) => {
          const next = new URLSearchParams(searchParams.toString());
          next.set('content', contentItemId);
          next.delete('module');
          router.replace(('?' + next.toString()) as Route, { scroll: false });
        }}
      />

      <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <Card>
          <h3 className="font-semibold text-ink">About this programme</h3>
          <p className="mt-2 max-w-4xl text-sm leading-6 text-ink-muted">
            {data.programme.description ||
              'This programme contains practical learning resources prepared by the BID team.'}
          </p>
        </Card>
        <Card>
          <h3 className="font-semibold text-ink">Programme work</h3>
          <p className="mt-2 text-sm leading-6 text-ink-muted">
            Deliverables linked to this programme remain in your dedicated work
            area.
          </p>
          <Button asChild variant="outline" className="mt-4 w-full">
            <Link href={routes.entrepreneur.deliverables}>
              <FileText className="h-4 w-4" />
              View deliverables
            </Link>
          </Button>
        </Card>
      </div>
    </>
  );
}

function ProgrammeSummary({ data }: { data: ProgrammePlayerPayload }) {
  const progress = data.progress?.progressPercent ?? 0;
  return (
    <Card padding="lg" accent="bid" className="mb-4">
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-center">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge
              tone={data.programme.accessType === 'free' ? 'blue' : 'brand'}
            >
              {data.programme.accessType === 'free'
                ? 'Free programme'
                : 'Programme access'}
            </Badge>
            <Badge
              tone={data.programme.lifecycle === 'active' ? 'green' : 'neutral'}
            >
              {data.programme.lifecycle}
            </Badge>
          </div>
          <div className="mt-4 flex items-center justify-between gap-3 text-sm">
            <span className="font-medium text-ink">Programme progress</span>
            <span className="font-semibold text-bid">{progress}% complete</span>
          </div>
          <ProgressBar value={progress} width="100%" className="mt-2 h-2.5" />
          <p className="mt-2 text-sm text-ink-muted">
            {data.progress?.completedContentCount ?? 0} of{' '}
            {data.progress?.totalContentCount ?? data.summary.contentItems}{' '}
            lessons completed
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <SummaryMetric
            icon={Layers3}
            label="Modules"
            value={data.summary.modules}
          />
          <SummaryMetric
            icon={PlayCircle}
            label="Videos"
            value={data.summary.videos}
          />
          <SummaryMetric
            icon={FileText}
            label="PDFs"
            value={data.summary.pdfs}
          />
          <SummaryMetric
            icon={Wrench}
            label="Tools"
            value={data.summary.tools}
          />
        </div>
      </div>
    </Card>
  );
}

function SummaryMetric({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof BookOpen;
  label: string;
  value: number;
}) {
  return (
    <div className="min-w-[104px] rounded-xl border border-line bg-surface-subtle px-3 py-3">
      <Icon className="h-4 w-4 text-bid" />
      <div className="mt-2 text-xl font-semibold text-ink">{value}</div>
      <div className="mt-0.5 text-xs text-ink-muted">{label}</div>
    </div>
  );
}
