'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { notFound } from 'next/navigation';
import { Breadcrumb } from '@/components/shared/Breadcrumb';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardHeader } from '@/components/shared/Card';
import { Button } from '@/components/shared/Button';
import { ModuleRow } from '@/components/entrepreneur/ModuleRow';
import { programById, modulesForProgram } from '@/lib/mock-data/programs';
import { moduleWithProgress } from '@/lib/training/progress';

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

  return (
    <>
      <Breadcrumb
        items={[
          { label: 'Training Library', href: '/training' },
          { label: program.name },
        ]}
      />
      <PageHeader
        title={program.name}
        description={`${modules.length} modules · ${progress}% complete`}
      />
      <Card>
        <CardHeader title="Modules" />
        <div className="flex flex-col">
          {modules.map((m) => (
            <ModuleRow
              key={m.id}
              module={m}
              onClick={() => router.push(`/training/${program.id}/${m.id}`)}
            />
          ))}
        </div>
      </Card>
      <div className="mt-3">
        <Button onClick={() => router.push('/training')}>
          Back to training library
        </Button>
      </div>
    </>
  );
}
