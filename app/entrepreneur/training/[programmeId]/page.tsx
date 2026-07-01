'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { notFound } from 'next/navigation';
import { CalendarDays, FileText, Layers3, PlayCircle } from 'lucide-react';
import { Breadcrumb } from '@/components/shared/Breadcrumb';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardHeader } from '@/components/shared/Card';
import { Button } from '@/components/shared/Button';
import { ModuleRow } from '@/components/entrepreneur/ModuleRow';
import { Badge } from '@/components/shared/Badge';
import { ProgressBar } from '@/components/shared/ProgressBar';
import { contentForModule, programById, modulesForProgram } from '@/lib/mock-data/programs';
import { moduleWithProgress } from '@/lib/training/progress';
import { routes } from '@/lib/routes';

export default function ProgrammeModulesPage({
  params,
}: {
  params: { programmeId: string };
}) {
  const router = useRouter();
  const program = programById(params.programmeId);
  if (!program) return notFound();
  const modules = modulesForProgram(program.id).map(moduleWithProgress);
  const completedCount = modules.filter((m) => m.status === 'completed').length;
  const progress = modules.length
    ? Math.round((completedCount / modules.length) * 100)
    : 0;
  const contentTotal = modules.reduce((sum, module) => sum + module.contentItemIds.length, 0);
  const nextModule = modules.find((module) => module.status !== 'completed') ?? modules[0];

  return (
    <>
      <Breadcrumb
        items={[
          { label: 'Training Library', href: routes.entrepreneur.training },
          { label: program.name },
        ]}
      />
      <PageHeader
        title={program.name}
        description={program.description ?? `${modules.length} modules · ${progress}% complete`}
      />

      <Card accent={program.accent} padding="lg">
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_280px]">
          <div>
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <Badge tone={program.status === 'active' ? 'green' : program.status === 'draft' ? 'amber' : 'neutral'}>
                {program.status === 'active' ? 'Active programme' : program.status === 'draft' ? 'Draft programme' : 'Completed programme'}
              </Badge>
              <span className="inline-flex items-center gap-1.5 text-sm text-ink-muted">
                <CalendarDays className="h-4 w-4" />
                {formatProgrammeDate(program.startDate)} - {formatProgrammeDate(program.endDate)}
              </span>
            </div>
            <h2 className="text-2xl font-semibold tracking-tight">Learning path</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-ink-muted">
              Complete modules in order, review the attached resources, and continue from your next open module.
            </p>
            <div className="mt-5">
              <ProgressBar value={progress} width="100%" className="h-2" />
              <div className="mt-2 text-sm text-ink-muted">{progress}% complete · {completedCount} of {modules.length} modules done</div>
            </div>
          </div>
          <div className="rounded-xl border border-black/[0.08] bg-white p-4">
            <div className="text-sm font-semibold">Programme contents</div>
            <div className="mt-3 grid grid-cols-3 gap-2 lg:grid-cols-1">
              <DetailMetric icon={Layers3} label="Modules" value={modules.length} />
              <DetailMetric icon={PlayCircle} label="Items" value={contentTotal} />
              <DetailMetric icon={FileText} label="Deliverables" value="Tracked" />
            </div>
            {nextModule && (
              <Button
                className="mt-4 w-full"
                onClick={() => router.push(routes.entrepreneur.trainingModule(program.id, nextModule.id))}
              >
                Continue learning
              </Button>
            )}
          </div>
        </div>
      </Card>

      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-[1fr_320px]">
        <Card>
          <CardHeader title="Modules" description="Work through the curriculum in sequence." />
          <div className="flex flex-col">
            {modules.map((module) => (
              <ModuleRow
                key={module.id}
                module={module}
                onClick={() => router.push(routes.entrepreneur.trainingModule(program.id, module.id))}
              />
            ))}
          </div>
        </Card>

        <Card>
          <CardHeader title="Content map" description="A quick scan of what each module contains." />
          <div className="space-y-3">
            {modules.map((module) => {
              const items = contentForModule(module.id);
              return (
                <div key={module.id} className="rounded-lg bg-surface-subtle p-3">
                  <div className="text-sm font-medium">{module.title}</div>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {items.map((item) => (
                      <Badge key={item.id} tone={item.type === 'video' ? 'brand' : item.type === 'pdf' ? 'blue' : 'green'}>
                        {item.type === 'video' ? 'Video' : item.type === 'pdf' ? 'PDF' : 'Tool'}
                      </Badge>
                    ))}
                    {items.length === 0 && <span className="text-sm text-ink-faint">No content yet</span>}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      <div className="mt-4">
        <Button variant="outline" onClick={() => router.push(routes.entrepreneur.training)}>
          Back to training library
        </Button>
      </div>
    </>
  );
}

const formatProgrammeDate = (date: string) =>
  new Date(date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });

function DetailMetric({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Layers3;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="rounded-lg bg-surface-subtle px-3 py-2">
      <div className="flex items-center gap-2 text-xs text-ink-muted">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
      <div className="mt-1 text-sm font-semibold">{value}</div>
    </div>
  );
}
