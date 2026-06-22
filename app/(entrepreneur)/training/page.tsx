'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/shared/PageHeader';
import { ProgramCard } from '@/components/entrepreneur/ProgramCard';
import { programs } from '@/lib/mock-data/programs';

export default function TrainingLibraryPage() {
  const router = useRouter();
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
    </>
  );
}
