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
import { Modal } from '@/components/shared/Modal';
import { FormField, FormInput, FormSelect } from '@/components/shared/FormField';
import { Notice } from '@/components/shared/PageHeader';
import { DataTable, type Column } from '@/components/shared/DataTable';
import { useAdminStore } from '@/lib/stores/admin-store';
import { toast } from 'sonner';
import type { Module, Program } from '@/types';

interface RequiredDeliverable {
  id: string;
  name: string;
  due: string;
  requiredFor: string;
  submitted: string;
}

function RequiredDeliverablesSection({ programName }: { programName: string }) {
  const [rows, setRows] = React.useState<RequiredDeliverable[]>([
    { id: 'rd1', name: 'Business Model Canvas', due: 'After Module 2', requiredFor: 'All entrepreneurs', submitted: '14 / 18' },
    { id: 'rd2', name: 'Financial Statements (quarterly)', due: 'Recurring', requiredFor: 'All entrepreneurs', submitted: '11 / 18' },
    { id: 'rd3', name: 'Pitch Deck v2', due: 'Apr 28, 2025', requiredFor: 'Growth & Scale stage', submitted: '6 / 14' },
  ]);
  const [addOpen, setAddOpen] = React.useState(false);
  const [name, setName] = React.useState('');
  const [due, setDue] = React.useState('Fixed date');
  const [reqFor, setReqFor] = React.useState('All entrepreneurs in this programme');

  const columns: Column<RequiredDeliverable>[] = [
    { key: 'name', header: 'Deliverable', cell: (d) => d.name },
    { key: 'due', header: 'Due', cell: (d) => d.due },
    { key: 'req', header: 'Required for', cell: (d) => d.requiredFor },
    { key: 'sub', header: 'Submitted so far', cell: (d) => d.submitted },
    {
      key: 'actions',
      header: '',
      cell: () => (
        <Button variant="outline" size="sm" onClick={() => toast.success('Editing deliverable…')}>
          Edit
        </Button>
      ),
    },
  ];

  return (
    <>
      <Card className="mt-3">
        <CardHeader
          title={`Required deliverables — ${programName}`}
          actions={
            <Button size="sm" onClick={() => setAddOpen(true)}>
              + Add deliverable type
            </Button>
          }
        />
        <Notice>
          These are the deliverables entrepreneurs in this programme are asked to submit.
          They show up on each entrepreneur&apos;s profile and in their &quot;My
          Deliverables&quot; view, with due dates.
        </Notice>
        <DataTable columns={columns} rows={rows} rowKey={(d) => d.id} emptyMessage="No required deliverables defined yet." />
      </Card>

      <Modal open={addOpen} onOpenChange={setAddOpen} title="Add deliverable type">
        <FormField label="Deliverable name">
          <FormInput
            placeholder="e.g. Business Model Canvas, Pitch Deck"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </FormField>
        <FormField label="Due">
          <FormSelect
            value={due}
            onValueChange={setDue}
            options={[
              { value: 'Fixed date', label: 'Fixed date' },
              { value: 'Recurring (quarterly)', label: 'Recurring (quarterly)' },
              { value: 'Tied to module completion', label: 'Tied to module completion' },
            ]}
          />
        </FormField>
        <FormField label="Required for">
          <FormSelect
            value={reqFor}
            onValueChange={setReqFor}
            options={[
              { value: 'All entrepreneurs in this programme', label: 'All entrepreneurs in this programme' },
              { value: 'Growth & Scale stage only', label: 'Growth & Scale stage only' },
              { value: 'Idea stage only', label: 'Idea stage only' },
            ]}
          />
        </FormField>
        <Notice>
          Once added, entrepreneurs in this programme will see this deliverable in their
          profile with an upload prompt, and it&apos;ll count toward the &quot;Deliverables
          awaiting review&quot; total on your dashboard.
        </Notice>
        <Button
          className="w-full"
          onClick={() => {
            if (!name) return;
            setRows((r) => [
              ...r,
              { id: `rd-${Date.now()}`, name, due, requiredFor: reqFor.replace('in this programme', '').trim(), submitted: '0 / 0' },
            ]);
            toast.success('Deliverable type added!');
            setName('');
            setAddOpen(false);
          }}
        >
          Add deliverable
        </Button>
      </Modal>
    </>
  );
}

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
    ? modules.filter((m) => selectedProgram.moduleIds.includes(m.id)).sort((a, b) => a.order - b.order)
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
            <ProgressBar value={p.progress} width="100%" barClassName={p.accent === 'info' ? 'bg-info' : p.accent === 'success' ? 'bg-success' : 'bg-bid'} />
            <div className="mt-2 flex gap-1">
              <Button variant="outline" size="sm" onClick={() => setEditTarget(p)}>Edit</Button>
              <Button size="sm" onClick={() => setSelectedProgram(p)}>Manage modules</Button>
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
                <Button variant="outline" size="sm" onClick={() => setReuseOpen(true)}>+ Reuse existing module</Button>
                <Button size="sm" onClick={() => setModuleOpen(true)}>+ New module</Button>
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
                  <Button variant="outline" size="sm" onClick={() => setManageContentModule(m)}>Manage content</Button>
                </div>
                <div className="flex flex-wrap">
                  {m.contentItemIds.length === 0 && <span className="text-[9px] text-ink-faint">No content items yet.</span>}
                  {m.contentItemIds.map((cid) => (
                    <span key={cid} className="mr-1 mb-1 inline-flex items-center gap-1 rounded-full bg-surface-subtle px-2 py-0.5 text-[9px] text-ink-muted">{cid}</span>
                  ))}
                </div>
              </div>
            ))}
            {programModules.length === 0 && (
              <p className="py-4 text-center text-[11px] text-ink-faint">No modules yet — add or reuse one above.</p>
            )}
          </div>
        </Card>
      )}

      {selectedProgram && <RequiredDeliverablesSection programName={selectedProgram.name} />}

      <ProgramModal open={addProgramOpen} onOpenChange={setAddProgramOpen} mode="add" />
      {editTarget && (
        <ProgramModal open={!!editTarget} onOpenChange={(o) => !o && setEditTarget(null)} mode="edit" program={editTarget} />
      )}
      {selectedProgram && (
        <>
          <ModuleModal open={moduleOpen} onOpenChange={setModuleOpen} programId={selectedProgram.id} />
          <ReuseModuleModal open={reuseOpen} onOpenChange={setReuseOpen} programId={selectedProgram.id} />
        </>
      )}
      <ManageContentModal
        open={!!manageContentModule}
        onOpenChange={(o) => !o && setManageContentModule(null)}
        module={manageContentModule ?? undefined}
        onAddItem={() => setAddContentOpen(true)}
      />
      <AddContentItemModal open={addContentOpen} onOpenChange={setAddContentOpen} module={manageContentModule ?? undefined} />
    </>
  );
}
