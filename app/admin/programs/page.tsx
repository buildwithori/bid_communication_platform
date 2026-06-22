'use client';

import * as React from 'react';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardHeader } from '@/components/shared/Card';
import { Badge } from '@/components/shared/Badge';
import { Button } from '@/components/shared/Button';
import { ProgressBar } from '@/components/shared/ProgressBar';
import { EmptyStateCard } from '@/components/shared/EmptyStateCard';
import { ProgramModal } from '@/components/admin/ProgramModal';
import { ModuleModal } from '@/components/admin/ModuleModal';
import { ReuseModuleModal } from '@/components/admin/ReuseModuleModal';
import { ManageContentModal, AddContentItemModal } from '@/components/admin/ManageContentModal';
import { useAdminStore } from '@/lib/stores/admin-store';
import type { Module, Program } from '@/types';

export default function AdminProgramsPage() {
  const { programs, modules } = useAdminStore();
  const [selectedProgram, setSelectedProgram] = React.useState<Program | null>(programs[0] ?? null);
  const [addProgramOpen, setAddProgramOpen] = React.useState(false);
  const [editTarget, setEditTarget] = React.useState<Program | null>(null);
  const [moduleOpen, setModuleOpen] = React.useState(false);
  const [reuseOpen, setReuseOpen] = React.useState(false);
  const [manageContentModule, setManageContentModule] = React.useState<Module | null>(null);
  const [addContentOpen, setAddContentOpen] = React.useState(false);

  const programModules = selectedProgram
    ? modules
        .filter((m) => selectedProgram.moduleIds.includes(m.id))
        .sort((a, b) => a.order - b.order)
    : [];

  return (
    <>
      <PageHeader
        title="Programs"
        description="Build programmes from modules, and modules from content"
        actions={<Button onClick={() => setAddProgramOpen(true)}>+ New program</Button>}
      />

      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
        {programs.map((p) => (
          <Card key={p.id} accent={p.accent}>
            <div className="mb-2 flex items-start justify-between">
              <div>
                <div className="text-xs font-medium">{p.name}</div>
                <div className="mt-0.5 text-[10px] text-ink-muted">
                  {new Date(p.startDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })} –{' '}
                  {new Date(p.endDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                </div>
              </div>
              <Badge tone="green">
                {p.status === 'active' ? 'Active' : p.status === 'completed' ? 'Completed' : 'Draft'}
              </Badge>
            </div>
            <div className="mb-2 text-[10px] text-ink-muted">
              Entrepreneurs: <strong>{p.entrepreneursCount}</strong> · Modules: <strong>{p.moduleIds.length}</strong>
            </div>
            <ProgressBar
              value={p.progress}
              width="100%"
              barClassName={
                p.accent === 'info' ? 'bg-info' : p.accent === 'success' ? 'bg-success' : 'bg-bid'
              }
            />
            <div className="mt-2 flex gap-1">
              <Button variant="outline" size="sm" onClick={() => setEditTarget(p)}>
                Edit
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  setSelectedProgram(p);
                }}
              >
                Manage modules
              </Button>
            </div>
          </Card>
        ))}
        <EmptyStateCard label="New program" onClick={() => setAddProgramOpen(true)} />
      </div>

      {selectedProgram && (
        <Card className="mt-3">
          <CardHeader
            title={`Modules — ${selectedProgram.name}`}
            actions={
              <>
                <Button variant="outline" size="sm" onClick={() => setReuseOpen(true)}>
                  + Reuse existing module
                </Button>
                <Button size="sm" onClick={() => setModuleOpen(true)}>
                  + New module
                </Button>
              </>
            }
          />
          <div className="flex flex-col gap-2">
            {programModules.map((m) => (
              <div key={m.id} className="rounded-lg border border-line p-2.5">
                <div className="mb-1.5 flex items-center justify-between">
                  <div className="text-[11px] font-medium">
                    {m.order}. {m.title}
                    {m.reuseCount ? (
                      <span className="ml-1.5 rounded-full bg-surface-subtle px-1.5 py-0.5 text-[9px] text-ink-muted">
                        used in {m.reuseCount} programmes
                      </span>
                    ) : null}
                  </div>
                  <Button variant="outline" size="sm" onClick={() => setManageContentModule(m)}>
                    Manage content
                  </Button>
                </div>
                <div className="flex flex-wrap">
                  {m.contentItemIds.length === 0 && (
                    <span className="text-[9px] text-ink-faint">No content items yet.</span>
                  )}
                  {m.contentItemIds.map((cid) => {
                    // Lookup content label is omitted for brevity; chip shows id-derived tag.
                    return (
                      <span
                        key={cid}
                        className="mr-1 mb-1 inline-flex items-center gap-1 rounded-full bg-surface-subtle px-2 py-0.5 text-[9px] text-ink-muted"
                      >
                        {cid}
                      </span>
                    );
                  })}
                </div>
              </div>
            ))}
            {programModules.length === 0 && (
              <p className="py-4 text-center text-[11px] text-ink-faint">
                No modules yet — add or reuse one above.
              </p>
            )}
          </div>
        </Card>
      )}

      <ProgramModal open={addProgramOpen} onOpenChange={setAddProgramOpen} mode="add" />
      {editTarget && (
        <ProgramModal
          open={!!editTarget}
          onOpenChange={(o) => !o && setEditTarget(null)}
          mode="edit"
          program={editTarget}
        />
      )}
      {selectedProgram && (
        <>
          <ModuleModal
            open={moduleOpen}
            onOpenChange={setModuleOpen}
            programId={selectedProgram.id}
          />
          <ReuseModuleModal
            open={reuseOpen}
            onOpenChange={setReuseOpen}
            programId={selectedProgram.id}
          />
        </>
      )}
      <ManageContentModal
        open={!!manageContentModule}
        onOpenChange={(o) => !o && setManageContentModule(null)}
        module={manageContentModule ?? undefined}
        onAddItem={() => setAddContentOpen(true)}
      />
      <AddContentItemModal
        open={addContentOpen}
        onOpenChange={setAddContentOpen}
        module={manageContentModule ?? undefined}
      />
    </>
  );
}
