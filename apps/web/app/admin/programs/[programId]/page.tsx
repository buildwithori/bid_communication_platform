'use client';

import * as React from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { Button } from '@/components/shared/Button';
import { Card } from '@/components/shared/Card';
import { ProgramModal } from '@/components/admin/ProgramModal';
import { ProgrammeWorkspaceView } from '@/components/admin/programmes/ProgrammeWorkspaceView';
import { useAdminStore } from '@/lib/stores/admin-store';
import { routes } from '@/lib/routes';
import type { Program } from '@/types';

export default function AdminProgrammeWorkspacePage() {
  const params = useParams<{ programId: string }>();
  const { programs, modules } = useAdminStore();
  const program = programs.find((item) => item.id === params.programId);
  const [editTarget, setEditTarget] = React.useState<Program | null>(null);

  if (!program) {
    return (
      <>
        <PageHeader
          title="Programme not found"
          description="This programme may have been removed or the link may be incorrect."
          actions={
            <Button asChild variant="outline">
              <Link href={routes.admin.programs}>
                <ArrowLeft className="h-4 w-4" />
                Back to programmes
              </Link>
            </Button>
          }
        />
        <Card>
          <p className="text-sm text-ink-muted">
            Choose a programme from the programme directory to open its workspace.
          </p>
        </Card>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Programme workspace"
        description="Manage curriculum, required submissions, content readiness, and learner progress."
        actions={
          <Button asChild variant="outline">
            <Link href={routes.admin.programs}>
              <ArrowLeft className="h-4 w-4" />
              Back to programmes
            </Link>
          </Button>
        }
      />

      <ProgrammeWorkspaceView
        program={program}
        modules={modules}
        onEditProgram={() => setEditTarget(program)}
      />

      {editTarget && (
        <ProgramModal
          open={!!editTarget}
          onOpenChange={(open) => !open && setEditTarget(null)}
          mode="edit"
          program={editTarget}
        />
      )}
    </>
  );
}
