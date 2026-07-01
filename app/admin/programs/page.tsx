'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardHeader } from '@/components/shared/Card';
import { Badge } from '@/components/shared/Badge';
import { Button } from '@/components/shared/Button';
import { ProgressBar } from '@/components/shared/ProgressBar';
import { Tabs } from '@/components/shared/Tabs';
import {
  AlertTriangle,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  FileText,
  Layers3,
  PlayCircle,
  Users,
  type LucideIcon,
} from 'lucide-react';
import { ProgramModal } from '@/components/admin/ProgramModal';
import { ModuleModal } from '@/components/admin/ModuleModal';
import { ReuseModuleModal } from '@/components/admin/ReuseModuleModal';
import { ManageContentModal, AddContentItemModal } from '@/components/admin/ManageContentModal';
import { Modal } from '@/components/shared/Modal';
import { FormField, FormInput, FormSelect } from '@/components/shared/FormField';
import { Notice } from '@/components/shared/PageHeader';
import {
  DataTable,
  RowActions,
  TableFilterInput,
  TableFilterSelect,
  TablePagination,
  TableToolbar,
  type Column,
} from '@/components/shared/DataTable';
import { useAdminStore } from '@/lib/stores/admin-store';
import { contentItems } from '@/lib/mock-data/programs';
import { requiredDeliverableSchema, type RequiredDeliverableForm } from '@/lib/forms/schemas';
import { toast } from 'sonner';
import type { ContentItem, Module, Program } from '@/types';

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
  const [editTarget, setEditTarget] = React.useState<RequiredDeliverable | null>(null);
  const [query, setQuery] = React.useState('');
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(5);
  const addForm = useForm<RequiredDeliverableForm>({
    resolver: zodResolver(requiredDeliverableSchema),
    defaultValues: {
      name: '',
      due: 'Fixed date',
      requiredFor: 'All entrepreneurs in this programme',
    },
  });
  const editForm = useForm<RequiredDeliverableForm>({
    resolver: zodResolver(requiredDeliverableSchema),
    defaultValues: { name: '', due: '', requiredFor: '' },
  });

  const filteredRows = React.useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return rows;
    return rows.filter((row) =>
      [row.name, row.due, row.requiredFor, row.submitted]
        .join(' ')
        .toLowerCase()
        .includes(needle),
    );
  }, [query, rows]);

  React.useEffect(() => {
    setPage(1);
  }, [query, pageSize]);

  const pageRows = React.useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredRows.slice(start, start + pageSize);
  }, [filteredRows, page, pageSize]);

  const columns: Column<RequiredDeliverable>[] = [
    {
      key: 'actions',
      header: 'Action',
      cell: (deliverable) => (
        <RowActions
          actions={[
            {
              label: 'Edit deliverable',
              onSelect: () => {
                setEditTarget(deliverable);
                editForm.reset({
                  name: deliverable.name,
                  due: deliverable.due,
                  requiredFor: deliverable.requiredFor,
                });
              },
            },
          ]}
        />
      ),
      className: 'w-[84px]',
    },
    { key: 'name', header: 'Deliverable', cell: (d) => d.name },
    { key: 'due', header: 'Due', cell: (d) => d.due },
    { key: 'req', header: 'Required for', cell: (d) => d.requiredFor },
    { key: 'sub', header: 'Submitted so far', cell: (d) => d.submitted },
  ];

  return (
    <>
      <div className="mt-5">
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
        <TableToolbar>
          <div>
            <div className="text-sm font-medium text-ink">Search required deliverables</div>
            <div className="mt-0.5 text-sm text-ink-muted">
              Filter by deliverable, due rule, audience, or submission count.
            </div>
          </div>
          <div className="w-full sm:w-[320px]">
            <TableFilterInput
              icon
              placeholder="Search deliverables..."
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>
        </TableToolbar>
        <DataTable columns={columns} rows={pageRows} rowKey={(d) => d.id} emptyMessage="No required deliverables defined yet." />
        <TablePagination
          page={page}
          pageSize={pageSize}
          totalItems={filteredRows.length}
          pageSizeOptions={[5, 10, 25]}
          onPageChange={setPage}
          onPageSizeChange={(next) => {
            setPageSize(next);
            setPage(1);
          }}
        />
      </div>

      <Modal open={addOpen} onOpenChange={setAddOpen} title="Add deliverable type">
        <form
          onSubmit={addForm.handleSubmit((values) => {
            setRows((r) => [
              ...r,
              {
                id: `rd-${Date.now()}`,
                name: values.name,
                due: values.due,
                requiredFor: values.requiredFor.replace('in this programme', '').trim(),
                submitted: '0 / 0',
              },
            ]);
            toast.success('Deliverable type added!');
            addForm.reset({
              name: '',
              due: 'Fixed date',
              requiredFor: 'All entrepreneurs in this programme',
            });
            setAddOpen(false);
          })}
        >
          <FormField label="Deliverable name" error={addForm.formState.errors.name?.message}>
            <FormInput
              placeholder="e.g. Business Model Canvas, Pitch Deck"
              {...addForm.register('name')}
            />
          </FormField>
          <FormField label="Due" error={addForm.formState.errors.due?.message}>
            <FormSelect
              value={addForm.watch('due')}
              onValueChange={(value) => addForm.setValue('due', value, { shouldValidate: true })}
              options={[
                { value: 'Fixed date', label: 'Fixed date' },
                { value: 'Recurring (quarterly)', label: 'Recurring (quarterly)' },
                { value: 'Tied to module completion', label: 'Tied to module completion' },
              ]}
            />
          </FormField>
          <FormField label="Required for" error={addForm.formState.errors.requiredFor?.message}>
            <FormSelect
              value={addForm.watch('requiredFor')}
              onValueChange={(value) => addForm.setValue('requiredFor', value, { shouldValidate: true })}
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
          <Button type="submit" className="w-full">
            Add deliverable
          </Button>
        </form>
      </Modal>
      <Modal
        open={!!editTarget}
        onOpenChange={(open) => !open && setEditTarget(null)}
        title="Edit deliverable type"
      >
        <form
          onSubmit={editForm.handleSubmit((values) => {
            if (!editTarget) return;
            setRows((current) =>
              current.map((row) =>
                row.id === editTarget.id
                  ? { ...row, name: values.name, due: values.due, requiredFor: values.requiredFor }
                  : row,
              ),
            );
            setEditTarget(null);
            toast.success('Deliverable type updated');
          })}
        >
          <FormField label="Deliverable name" error={editForm.formState.errors.name?.message}>
            <FormInput {...editForm.register('name')} />
          </FormField>
          <FormField label="Due" error={editForm.formState.errors.due?.message}>
            <FormInput {...editForm.register('due')} />
          </FormField>
          <FormField label="Required for" error={editForm.formState.errors.requiredFor?.message}>
            <FormInput {...editForm.register('requiredFor')} />
          </FormField>
          <Button type="submit" className="w-full">
            Save deliverable
          </Button>
        </form>
      </Modal>
    </>
  );
}

export default function AdminProgramsPage() {
  const { programs, modules } = useAdminStore();
  const [selectedProgram, setSelectedProgram] = React.useState<Program | null>(programs[0] ?? null);
  const [workspaceTab, setWorkspaceTab] = React.useState<'curriculum' | 'deliverables' | 'readiness'>('curriculum');
  const [addProgramOpen, setAddProgramOpen] = React.useState(false);
  const [editTarget, setEditTarget] = React.useState<Program | null>(null);
  const [moduleOpen, setModuleOpen] = React.useState(false);
  const [reuseOpen, setReuseOpen] = React.useState(false);
  const [manageContentModule, setManageContentModule] = React.useState<Module | null>(null);
  const [addContentOpen, setAddContentOpen] = React.useState(false);
  const [programQuery, setProgramQuery] = React.useState('');
  const [programStatus, setProgramStatus] = React.useState<'all' | Program['status']>('all');
  const [programPage, setProgramPage] = React.useState(1);
  const [programPageSize, setProgramPageSize] = React.useState(8);
  const [moduleQuery, setModuleQuery] = React.useState('');
  const [modulePage, setModulePage] = React.useState(1);
  const [modulePageSize, setModulePageSize] = React.useState(6);

  React.useEffect(() => {
    if (!selectedProgram && programs.length > 0) {
      setSelectedProgram(programs[0]);
    }
  }, [programs, selectedProgram]);

  const filteredPrograms = React.useMemo(() => {
    const needle = programQuery.trim().toLowerCase();
    return programs.filter((program) => {
      const matchesStatus = programStatus === 'all' || program.status === programStatus;
      const matchesQuery =
        !needle ||
        [
          program.name,
          program.description ?? '',
          program.status,
          String(program.entrepreneursCount),
          String(program.moduleIds.length),
        ]
          .join(' ')
          .toLowerCase()
          .includes(needle);
      return matchesStatus && matchesQuery;
    });
  }, [programQuery, programStatus, programs]);

  React.useEffect(() => {
    setProgramPage(1);
  }, [programQuery, programStatus, programPageSize]);

  const programPageRows = React.useMemo(() => {
    const start = (programPage - 1) * programPageSize;
    return filteredPrograms.slice(start, start + programPageSize);
  }, [filteredPrograms, programPage, programPageSize]);

  const programModules = React.useMemo(
    () =>
      selectedProgram
        ? modules
            .filter((module) => selectedProgram.moduleIds.includes(module.id))
            .sort((a, b) => a.order - b.order)
        : [],
    [modules, selectedProgram],
  );
  const filteredProgramModules = React.useMemo(() => {
    const needle = moduleQuery.trim().toLowerCase();
    if (!needle) return programModules;
    return programModules.filter((module) => {
      const attachedItems = module.contentItemIds
        .map((contentId) => contentItems.find((item) => item.id === contentId))
        .filter(Boolean) as ContentItem[];
      return [
        module.title,
        module.description ?? '',
        String(module.order),
        ...attachedItems.map((item) => `${item.title} ${item.type} ${item.durationLabel ?? ''}`),
      ]
        .join(' ')
        .toLowerCase()
        .includes(needle);
    });
  }, [moduleQuery, programModules]);
  React.useEffect(() => {
    setModulePage(1);
  }, [moduleQuery, modulePageSize, selectedProgram?.id]);
  const modulePageRows = React.useMemo(() => {
    const start = (modulePage - 1) * modulePageSize;
    return filteredProgramModules.slice(start, start + modulePageSize);
  }, [filteredProgramModules, modulePage, modulePageSize]);
  const selectedContentItems = programModules.flatMap((module) =>
    module.contentItemIds
      .map((contentId) => contentItems.find((item) => item.id === contentId))
      .filter(Boolean) as ContentItem[],
  );
  const contentTypeCounts = selectedContentItems.reduce<Record<ContentItem['type'], number>>(
    (acc, item) => ({ ...acc, [item.type]: acc[item.type] + 1 }),
    { video: 0, pdf: 0, tool: 0 },
  );
  const modulesWithoutContent = programModules.filter((module) => module.contentItemIds.length === 0);
  const capacityPercentage = selectedProgram
    ? Math.round((selectedProgram.entrepreneursCount / Math.max(selectedProgram.maxEntrepreneurs, 1)) * 100)
    : 0;
  const activePrograms = programs.filter((program) => program.status === 'active').length;
  const totalEntrepreneurs = programs.reduce((sum, program) => sum + program.entrepreneursCount, 0);
  const totalModules = programs.reduce((sum, program) => sum + program.moduleIds.length, 0);
  const avgProgress = Math.round(programs.reduce((sum, program) => sum + program.progress, 0) / Math.max(programs.length, 1));
  const readinessScore = programModules.length
    ? Math.round(((programModules.length - modulesWithoutContent.length) / programModules.length) * 100)
    : 0;

  const programColumns = React.useMemo<Column<Program>[]>(
    () => [
      {
        key: 'actions',
        header: 'Action',
        cell: (program) => (
          <RowActions
            actions={[
              {
                label: 'Open workspace',
                onSelect: () => {
                  setSelectedProgram(program);
                  setWorkspaceTab('curriculum');
                },
              },
              {
                label: 'Edit programme',
                onSelect: () => setEditTarget(program),
              },
              'separator',
              {
                label: 'Add module',
                onSelect: () => {
                  setSelectedProgram(program);
                  setWorkspaceTab('curriculum');
                  setModuleOpen(true);
                },
              },
            ]}
          />
        ),
        className: 'w-[84px]',
      },
      {
        key: 'program',
        header: 'Programme',
        cell: (program) => (
          <button
            type="button"
            onClick={() => {
              setSelectedProgram(program);
              setWorkspaceTab('curriculum');
            }}
            className="block max-w-[340px] text-left"
          >
            <span className="block text-sm font-semibold text-ink">{program.name}</span>
            <span className="mt-1 block line-clamp-2 text-xs leading-5 text-ink-muted">
              {program.description}
            </span>
          </button>
        ),
        className: 'min-w-[280px]',
      },
      {
        key: 'status',
        header: 'Status',
        cell: (program) => <StatusBadge status={program.status} />,
      },
      {
        key: 'enrollment',
        header: 'Enrollment',
        cell: (program) => {
          const percentage = Math.round((program.entrepreneursCount / Math.max(program.maxEntrepreneurs, 1)) * 100);
          return (
            <div className="min-w-[150px]">
              <div className="mb-1 flex items-center justify-between gap-2 text-xs text-ink-muted">
                <span>{program.entrepreneursCount} / {program.maxEntrepreneurs}</span>
                <span>{percentage}%</span>
              </div>
              <ProgressBar value={percentage} width="100%" className="h-1.5" />
            </div>
          );
        },
      },
      {
        key: 'modules',
        header: 'Modules',
        cell: (program) => program.moduleIds.length,
      },
      {
        key: 'content',
        header: 'Content',
        cell: (program) => getProgramContentItems(program, modules).length,
      },
      {
        key: 'progress',
        header: 'Progress',
        cell: (program) => (
          <div className="min-w-[140px]">
            <div className="mb-1 text-xs font-medium text-ink">{program.progress}%</div>
            <ProgressBar
              value={program.progress}
              width="100%"
              className="h-1.5"
              barClassName={program.accent === 'info' ? 'bg-info' : program.accent === 'success' ? 'bg-success' : 'bg-bid'}
            />
          </div>
        ),
      },
      {
        key: 'timeline',
        header: 'Timeline',
        cell: (program) => (
          <span className="whitespace-nowrap text-sm text-ink-muted">
            {formatProgramDate(program.startDate)} - {formatProgramDate(program.endDate)}
          </span>
        ),
      },
    ],
    [modules],
  );

  const moduleColumns = React.useMemo<Column<Module>[]>(
    () => [
      {
        key: 'actions',
        header: 'Action',
        cell: (module) => (
          <RowActions
            actions={[
              {
                label: 'Manage content',
                onSelect: () => setManageContentModule(module),
              },
              {
                label: 'Add content item',
                onSelect: () => {
                  setManageContentModule(module);
                  setAddContentOpen(true);
                },
              },
            ]}
          />
        ),
        className: 'w-[84px]',
      },
      {
        key: 'order',
        header: 'Order',
        cell: (module) => (
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-surface-subtle text-xs font-semibold text-ink-muted">
            {module.order}
          </span>
        ),
      },
      {
        key: 'module',
        header: 'Module',
        cell: (module) => (
          <div className="max-w-[420px]">
            <div className="font-semibold text-ink">{module.title}</div>
            {module.description && (
              <div className="mt-1 line-clamp-2 text-xs leading-5 text-ink-muted">{module.description}</div>
            )}
          </div>
        ),
        className: 'min-w-[320px]',
      },
      {
        key: 'content',
        header: 'Content coverage',
        cell: (module) => <ContentCoverage module={module} />,
        className: 'min-w-[280px]',
      },
      {
        key: 'reuse',
        header: 'Reuse',
        cell: (module) =>
          module.reuseCount ? (
            <Badge tone="blue">Used in {module.reuseCount} programmes</Badge>
          ) : (
            <span className="text-sm text-ink-muted">Single programme</span>
          ),
      },
      {
        key: 'readiness',
        header: 'Readiness',
        cell: (module) =>
          module.contentItemIds.length > 0 ? (
            <Badge tone="green">Ready</Badge>
          ) : (
            <Badge tone="amber">Needs content</Badge>
          ),
      },
    ],
    [],
  );

  return (
    <>
      <PageHeader
        title="Programmes"
        description="Build curricula, organize modules, and manage the learning content entrepreneurs will see."
        actions={<Button onClick={() => setAddProgramOpen(true)}>+ New programme</Button>}
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <ProgramMetric icon={BookOpen} label="Programmes" value={programs.length} subline={`${activePrograms} active`} />
        <ProgramMetric icon={Layers3} label="Modules" value={totalModules} subline="Across all programmes" />
        <ProgramMetric icon={Users} label="Entrepreneurs" value={totalEntrepreneurs} subline="Currently enrolled" />
        <ProgramMetric icon={PlayCircle} label="Avg. progress" value={`${avgProgress}%`} subline="Learner completion" />
      </div>

      <Card className="mt-4">
        <CardHeader
          title="Programme directory"
          description="Search, filter, and open the programme workspace from one scalable list."
          actions={<Button size="sm" onClick={() => setAddProgramOpen(true)}>New programme</Button>}
        />
        <TableToolbar>
          <div>
            <div className="text-sm font-medium text-ink">Find programmes</div>
            <div className="mt-0.5 text-sm text-ink-muted">
              {filteredPrograms.length} of {programs.length} programmes shown
            </div>
          </div>
          <div className="grid w-full gap-2 sm:w-auto sm:min-w-[460px] sm:grid-cols-[1fr_160px]">
            <TableFilterInput
              icon
              placeholder="Search by name, status, module count..."
              value={programQuery}
              onChange={(event) => setProgramQuery(event.target.value)}
            />
            <TableFilterSelect
              value={programStatus}
              onChange={(event) => setProgramStatus(event.target.value as typeof programStatus)}
            >
              <option value="all">All statuses</option>
              <option value="active">Active</option>
              <option value="draft">Draft</option>
              <option value="completed">Completed</option>
            </TableFilterSelect>
          </div>
        </TableToolbar>
        <DataTable
          columns={programColumns}
          rows={programPageRows}
          rowKey={(program) => program.id}
          rowClassName={(program) => (program.id === selectedProgram?.id ? 'bg-bid-light/40' : undefined)}
          emptyMessage="No programmes match this search."
          tableClassName="min-w-[1060px]"
        />
        <TablePagination
          page={programPage}
          pageSize={programPageSize}
          totalItems={filteredPrograms.length}
          pageSizeOptions={[8, 16, 32]}
          onPageChange={setProgramPage}
          onPageSizeChange={(next) => {
            setProgramPageSize(next);
            setProgramPage(1);
          }}
        />
      </Card>

      {selectedProgram && (
        <section className="mt-4 space-y-4">
          <Card accent={selectedProgram.accent} padding="lg">
            <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
              <div className="min-w-0">
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <StatusBadge status={selectedProgram.status} />
                  <span className="inline-flex items-center gap-1.5 text-sm text-ink-muted">
                    <CalendarDays className="h-4 w-4" />
                    {formatProgramDate(selectedProgram.startDate)} - {formatProgramDate(selectedProgram.endDate)}
                  </span>
                </div>
                <h2 className="text-2xl font-semibold tracking-tight text-ink">{selectedProgram.name}</h2>
                <p className="mt-2 max-w-4xl text-sm leading-6 text-ink-muted">
                  {selectedProgram.description}
                </p>
              </div>
              <div className="flex shrink-0 flex-wrap gap-2">
                <Button variant="outline" onClick={() => setEditTarget(selectedProgram)}>Edit programme</Button>
                <Button variant="outline" onClick={() => setReuseOpen(true)}>Reuse module</Button>
                <Button onClick={() => setModuleOpen(true)}>New module</Button>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
              <ProgrammeHealthCard label="Enrollment" value={`${selectedProgram.entrepreneursCount}/${selectedProgram.maxEntrepreneurs}`} progress={capacityPercentage} />
              <ProgrammeHealthCard label="Modules" value={programModules.length} helper={`${modulesWithoutContent.length} need content`} />
              <ProgrammeHealthCard label="Content assets" value={selectedContentItems.length} helper={`${contentTypeCounts.video} videos, ${contentTypeCounts.pdf} PDFs, ${contentTypeCounts.tool} tools`} />
              <ProgrammeHealthCard label="Readiness" value={`${readinessScore}%`} progress={readinessScore} />
              <ProgrammeHealthCard label="Learner progress" value={`${selectedProgram.progress}%`} progress={selectedProgram.progress} />
            </div>
          </Card>

          <Card>
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <div className="text-base font-semibold tracking-[-0.01em]">Programme workspace</div>
                <div className="mt-1 max-w-2xl text-sm leading-5 text-ink-muted">
                  Manage the curriculum, required submissions, and launch readiness for this programme.
                </div>
              </div>
              <Tabs
                value={workspaceTab}
                onChange={setWorkspaceTab}
                tabs={[
                  { value: 'curriculum', label: 'Curriculum' },
                  { value: 'deliverables', label: 'Deliverables' },
                  { value: 'readiness', label: 'Readiness' },
                ]}
                className="mb-0 w-full overflow-x-auto sm:w-fit"
              />
            </div>

            {workspaceTab === 'curriculum' && (
              <div className="mt-5">
                <TableToolbar>
                  <div>
                    <div className="text-sm font-medium text-ink">Search modules and attached content</div>
                    <div className="mt-0.5 text-sm text-ink-muted">
                      {filteredProgramModules.length} of {programModules.length} modules shown
                    </div>
                  </div>
                  <div className="w-full sm:w-[380px]">
                    <TableFilterInput
                      icon
                      placeholder="Search modules, content, or order..."
                      value={moduleQuery}
                      onChange={(event) => setModuleQuery(event.target.value)}
                    />
                  </div>
                </TableToolbar>
                <DataTable
                  columns={moduleColumns}
                  rows={modulePageRows}
                  rowKey={(module) => module.id}
                  emptyMessage={
                    programModules.length === 0
                      ? 'No modules yet. Add a new module or reuse an existing module to start the curriculum.'
                      : 'No modules match this search.'
                  }
                  tableClassName="min-w-[980px]"
                />
                <TablePagination
                  page={modulePage}
                  pageSize={modulePageSize}
                  totalItems={filteredProgramModules.length}
                  pageSizeOptions={[6, 12, 24]}
                  onPageChange={setModulePage}
                  onPageSizeChange={(next) => {
                    setModulePageSize(next);
                    setModulePage(1);
                  }}
                />
              </div>
            )}

            {workspaceTab === 'deliverables' && (
              <RequiredDeliverablesSection programName={selectedProgram.name} />
            )}

            {workspaceTab === 'readiness' && (
              <div className="mt-5 grid grid-cols-1 gap-4 xl:grid-cols-[1fr_320px]">
                <DataTable
                  columns={[
                    {
                      key: 'module',
                      header: 'Module',
                      cell: (module) => (
                        <div>
                          <div className="font-semibold">{module.title}</div>
                          <div className="mt-1 text-xs text-ink-muted">Order {module.order}</div>
                        </div>
                      ),
                      className: 'min-w-[260px]',
                    },
                    {
                      key: 'coverage',
                      header: 'Coverage',
                      cell: (module) => <ContentCoverage module={module} />,
                    },
                    {
                      key: 'status',
                      header: 'Launch status',
                      cell: (module) =>
                        module.contentItemIds.length > 0 ? (
                          <Badge tone="green">Ready for learners</Badge>
                        ) : (
                          <Badge tone="amber">Add learning content</Badge>
                        ),
                    },
                    {
                      key: 'actions',
                      header: 'Action',
                      cell: (module) => (
                        <RowActions
                          actions={[
                            {
                              label: 'Manage content',
                              onSelect: () => setManageContentModule(module),
                            },
                          ]}
                        />
                      ),
                      className: 'w-[84px]',
                    },
                  ]}
                  rows={programModules}
                  rowKey={(module) => module.id}
                  emptyMessage="No modules have been added to this programme yet."
                  tableClassName="min-w-[820px]"
                />
                <div className="space-y-3">
                  <ReadinessPanelItem
                    icon={modulesWithoutContent.length ? AlertTriangle : CheckCircle2}
                    title={modulesWithoutContent.length ? 'Content gaps' : 'Content coverage complete'}
                    description={
                      modulesWithoutContent.length
                        ? `${modulesWithoutContent.length} module${modulesWithoutContent.length === 1 ? '' : 's'} need learning content before launch.`
                        : 'Every module currently has at least one learning asset attached.'
                    }
                    tone={modulesWithoutContent.length ? 'warning' : 'success'}
                  />
                  <ReadinessPanelItem
                    icon={Users}
                    title="Enrollment capacity"
                    description={`${selectedProgram.entrepreneursCount} of ${selectedProgram.maxEntrepreneurs} entrepreneur seats are currently filled.`}
                  />
                  <ReadinessPanelItem
                    icon={FileText}
                    title="Required submissions"
                    description="Deliverable rules are managed in the Deliverables tab and surfaced on entrepreneur profiles."
                  />
                </div>
              </div>
            )}
          </Card>
        </section>
      )}

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

const formatProgramDate = (date: string) =>
  new Date(date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });

const getProgramContentItems = (program: Program, modules: Module[]) =>
  modules
    .filter((module) => program.moduleIds.includes(module.id))
    .flatMap((module) =>
      module.contentItemIds
        .map((contentId) => contentItems.find((item) => item.id === contentId))
        .filter(Boolean) as ContentItem[],
    );

const getModuleContentItems = (module: Module) =>
  module.contentItemIds
    .map((contentId) => contentItems.find((item) => item.id === contentId))
    .filter(Boolean) as ContentItem[];

function StatusBadge({ status }: { status: Program['status'] }) {
  return (
    <Badge tone={status === 'active' ? 'green' : status === 'draft' ? 'amber' : 'neutral'}>
      {status === 'active' ? 'Active' : status === 'draft' ? 'Draft' : 'Completed'}
    </Badge>
  );
}

function ProgramMetric({
  icon: Icon,
  label,
  value,
  subline,
}: {
  icon: LucideIcon;
  label: string;
  value: React.ReactNode;
  subline: string;
}) {
  return (
    <Card padding="sm">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-bid-light text-bid">
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <div className="text-xl font-semibold">{value}</div>
          <div className="text-sm font-medium text-ink">{label}</div>
          <div className="mt-0.5 text-xs text-ink-muted">{subline}</div>
        </div>
      </div>
    </Card>
  );
}

function ProgrammeHealthCard({
  label,
  value,
  helper,
  progress,
}: {
  label: string;
  value: React.ReactNode;
  helper?: string;
  progress?: number;
}) {
  return (
    <div className="rounded-xl border border-black/[0.08] bg-white px-3 py-3">
      <div className="text-xs font-medium uppercase tracking-[0.04em] text-ink-muted">{label}</div>
      <div className="mt-1 text-xl font-semibold text-ink">{value}</div>
      {typeof progress === 'number' ? (
        <ProgressBar value={progress} width="100%" className="mt-3 h-1.5" />
      ) : null}
      {helper ? <div className="mt-2 text-xs leading-5 text-ink-muted">{helper}</div> : null}
    </div>
  );
}

function ContentCoverage({ module }: { module: Module }) {
  const attachedItems = getModuleContentItems(module);
  const counts = attachedItems.reduce<Record<ContentItem['type'], number>>(
    (acc, item) => ({ ...acc, [item.type]: acc[item.type] + 1 }),
    { video: 0, pdf: 0, tool: 0 },
  );

  return (
    <div className="flex flex-wrap gap-1.5">
      <ContentPill icon={PlayCircle} label="Video" value={counts.video} />
      <ContentPill icon={FileText} label="PDF" value={counts.pdf} />
      <ContentPill icon={Layers3} label="Tool" value={counts.tool} />
      {attachedItems.length === 0 && (
        <span className="rounded-full bg-warning-light px-2.5 py-1 text-xs font-medium text-warning-dark">
          No content
        </span>
      )}
    </div>
  );
}

function ContentPill({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: number;
}) {
  if (value === 0) return null;

  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-surface-subtle px-2.5 py-1 text-xs text-ink-muted">
      <Icon className="h-3.5 w-3.5" />
      {value} {label}
    </span>
  );
}

function ReadinessPanelItem({
  icon: Icon,
  title,
  description,
  tone = 'neutral',
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  tone?: 'neutral' | 'success' | 'warning';
}) {
  return (
    <div className="rounded-xl border border-black/[0.08] bg-white p-4">
      <div className="flex items-start gap-3">
        <div
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
            tone === 'success'
              ? 'bg-success-light text-success-dark'
              : tone === 'warning'
                ? 'bg-warning-light text-warning-dark'
                : 'bg-surface-subtle text-ink-muted'
          }`}
        >
          <Icon className="h-4 w-4" />
        </div>
        <div>
          <div className="text-sm font-semibold text-ink">{title}</div>
          <p className="mt-1 text-sm leading-5 text-ink-muted">{description}</p>
        </div>
      </div>
    </div>
  );
}
