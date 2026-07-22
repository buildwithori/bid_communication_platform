'use client';

import { useDebouncedValue } from '@/lib/search';
import * as React from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  AlertTriangle,
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  FileText,
  GripVertical,
  Users,
} from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/shared/Badge';
import { Button } from '@/components/shared/Button';
import { Card, Skeleton, TableSkeleton } from '@/components/shared/Card';
import {
  DataTable,
  RowActions,
  TableFilterInput,
  TablePagination,
  TableToolbar,
  useSortableRow,
  type Column,
} from '@/components/shared/DataTable';
import {
  FormField,
  FormInput,
  FormTextarea,
} from '@/components/shared/FormField';
import { DestructiveActionModal } from '@/components/shared/DestructiveActionModal';
import { Modal } from '@/components/shared/Modal';
import { Notice, PageHeader } from '@/components/shared/PageHeader';
import { ProgressBar } from '@/components/shared/ProgressBar';
import { Tabs } from '@/components/shared/Tabs';
import { ProgramModal } from '@/components/admin/ProgramModal';
import { ModuleModal } from '@/components/admin/ModuleModal';
import { MoveModulePositionModal } from '@/components/admin/programmes/MoveModulePositionModal';
import { ProgrammeArchiveModal } from '@/components/admin/programmes/ProgrammeArchiveModal';
import { ProgrammeContentModal } from '@/components/admin/programmes/ProgrammeContentModal';
import {
  ProgrammeCoursePlayer,
  ProgrammeCoursePlayerSkeleton,
} from '@/components/learning/ProgrammeCoursePlayer';
import { RequiredDeliverablesSection } from '@/components/admin/programmes/BackendRequiredDeliverablesSection';
import {
  useArchiveProgrammeMutation,
  useDeleteProgrammeModuleMutation,
  useDeleteProgrammeMutation,
  useMoveProgrammeModuleMutation,
  useProgrammeDetailQuery,
  useProgrammeModulesPage,
  useProgrammePlayerQuery,
  usePublishProgrammeMutation,
  useRestoreProgrammeMutation,
  useUpdateProgrammeModuleMutation,
  type ProgrammeDetail,
  type ProgrammeLifecycle,
  type ProgrammeModuleRecord,
} from '@/lib/api/programmes';
import { moduleSchema, type ModuleForm } from '@/lib/forms/schemas';
import { routes } from '@/lib/routes';

type WorkspaceTab = 'curriculum' | 'preview' | 'deliverables' | 'readiness';

export default function AdminProgrammeWorkspacePage() {
  const params = useParams<{ programId: string }>();
  const router = useRouter();
  const programmeId = params.programId;
  const [tab, setTab] = React.useState<WorkspaceTab>('curriculum');
  const [previewModuleId, setPreviewModuleId] = React.useState<string | null>(
    null,
  );
  const [moduleOpen, setModuleOpen] = React.useState(false);
  const [contentModule, setContentModule] =
    React.useState<ProgrammeModuleRecord | null>(null);
  const [editProgrammeOpen, setEditProgrammeOpen] = React.useState(false);
  const [editModule, setEditModule] =
    React.useState<ProgrammeModuleRecord | null>(null);
  const [moveModule, setMoveModule] =
    React.useState<ProgrammeModuleRecord | null>(null);
  const [archiveOpen, setArchiveOpen] = React.useState(false);
  const [deleteProgrammeOpen, setDeleteProgrammeOpen] = React.useState(false);
  const [deleteModuleTarget, setDeleteModuleTarget] =
    React.useState<ProgrammeModuleRecord | null>(null);
  const [moduleSearch, setModuleSearch] = React.useState('');
  const debouncedModuleSearch = useDebouncedValue(moduleSearch);
  const [pageSize, setPageSize] = React.useState(6);

  const detail = useProgrammeDetailQuery(programmeId);
  const player = useProgrammePlayerQuery(programmeId, tab === 'preview');
  const modules = useProgrammeModulesPage(programmeId, {
    search: debouncedModuleSearch.trim() || undefined,
    take: pageSize,
  });
  const publishProgramme = usePublishProgrammeMutation({
    onSuccess: () => toast.success('Programme published.'),
    onError: (error) => toast.error(error.message),
  });
  const restoreProgramme = useRestoreProgrammeMutation({
    onSuccess: () => toast.success('Programme restored.'),
    onError: (error) => toast.error(error.message),
  });
  const archiveProgramme = useArchiveProgrammeMutation({
    onSuccess: () => toast.success('Programme archived.'),
    onError: (error) => toast.error(error.message),
  });
  const deleteProgramme = useDeleteProgrammeMutation({
    onSuccess: () => {
      toast.success('Programme deleted.');
      router.replace(routes.admin.programs);
    },
    onError: (error) => toast.error(error.message),
  });
  const deleteModule = useDeleteProgrammeModuleMutation({
    onSuccess: (result) => {
      setDeleteModuleTarget(null);
      toast.success(result.name + ' removed from the programme.');
    },
    onError: (error) => toast.error(error.message),
  });
  const moveProgramme = useMoveProgrammeModuleMutation({
    onSuccess: () => toast.success('Module position updated.'),
    onError: (error) => toast.error(error.message),
  });
  const resetPagination = modules.resetPagination;

  React.useEffect(() => {
    resetPagination();
  }, [debouncedModuleSearch, pageSize, resetPagination]);

  const isArchived = detail.data?.lifecycle === 'archived';
  const canReorder =
    !isArchived &&
    debouncedModuleSearch.trim().length === 0;
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const handleDragEnd = React.useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (
        !over ||
        active.id === over.id ||
        !canReorder ||
        moveProgramme.isPending
      )
        return;
      const target = modules.rows.find((module) => module.id === over.id);
      if (!target) return;
      moveProgramme.mutate({
        programmeId,
        moduleId: String(active.id),
        position: target.position,
      });
    },
    [canReorder, modules.rows, moveProgramme, programmeId],
  );

  const moduleColumns = React.useMemo<Column<ProgrammeModuleRecord>[]>(
    () => [
      {
        key: 'reorder',
        header: 'Reorder',
        cell: (module) => (
          <ModuleReorderHandle
            module={module}
            disabled={!canReorder || moveProgramme.isPending}
          />
        ),
        className: 'min-w-[132px]',
      },
      {
        key: 'actions',
        header: 'Action',
        cell: (module) => (
          <RowActions
            actions={[
              {
                label: 'Preview module',
                onSelect: () => {
                  setPreviewModuleId(module.id);
                  setTab('preview');
                },
              },
              {
                label: 'Manage content',
                disabled: isArchived,
                onSelect: () => setContentModule(module),
              },
              {
                label: 'Edit module',
                disabled: isArchived,
                onSelect: () => setEditModule(module),
              },
              'separator',
              {
                label: 'Move to position',
                disabled: isArchived,
                onSelect: () => setMoveModule(module),
              },
              'separator',
              {
                label:
                  module.programmeUses > 1
                    ? 'Remove from programme'
                    : 'Delete module',
                destructive: true,
                disabled: deleteModule.isPending,
                onSelect: () => setDeleteModuleTarget(module),
              },
            ]}
          />
        ),
        className: 'w-[84px]',
      },
      {
        key: 'module',
        header: 'Module',
        cell: (module) => (
          <div className="max-w-[420px]">
            <button
              type="button"
              onClick={() => setEditModule(module)}
              disabled={isArchived}
              className="rounded-md text-left font-semibold text-ink transition-colors hover:text-bid focus:outline-none focus-visible:ring-2 focus-visible:ring-bid/20 disabled:cursor-default disabled:hover:text-ink"
            >
              {module.title}
            </button>
            {module.description ? (
              <div className="mt-1 line-clamp-2 text-xs leading-5 text-ink-muted">
                {module.description}
              </div>
            ) : null}
          </div>
        ),
        className: 'min-w-[320px]',
      },
      {
        key: 'content',
        header: 'Content coverage',
        cell: (module) => <ModuleContentSummary module={module} />,
        className: 'min-w-[260px]',
      },
      {
        key: 'reuse',
        header: 'Reuse',
        cell: (module) =>
          module.programmeUses > 1 ? (
            <Badge tone="blue">Used in {module.programmeUses} programmes</Badge>
          ) : (
            <span className="text-sm text-ink-muted">Single programme</span>
          ),
      },
      {
        key: 'readiness',
        header: 'Readiness',
        cell: (module) => <ModuleReadinessBadge module={module} />,
      },
    ],
    [
      canReorder,
      deleteModule.isPending,
      isArchived,
      moveProgramme.isPending,
      setContentModule,
    ],
  );

  if (detail.isLoading && !detail.data) {
    return <ProgrammeWorkspaceSkeleton />;
  }

  if (detail.isError || !detail.data) {
    return (
      <>
        <PageHeader
          title="Programme not found"
          description="This programme may have been removed or the link may be incorrect."
          actions={<BackToProgrammes />}
        />
        <Card>
          <Notice>
            {detail.error?.message ??
              'Choose a programme from the directory to open its workspace.'}
          </Notice>
        </Card>
      </>
    );
  }

  const programme = detail.data;
  return (
    <>
      <PageHeader
        title="Programme workspace"
        description="Manage curriculum, required submissions, content readiness, and learner progress."
        actions={<BackToProgrammes />}
      />

      <section className="space-y-4">
        <Card padding="lg">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
            <div className="min-w-0">
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <ProgrammeStatusBadge status={programme.lifecycle} />
                <Badge
                  tone={programme.accessType === 'free' ? 'blue' : 'brand'}
                >
                  {programme.accessType === 'free'
                    ? 'Free programme'
                    : 'Assigned programme'}
                </Badge>
                <span className="inline-flex items-center gap-1.5 text-sm text-ink-muted">
                  <CalendarDays className="h-4 w-4" />
                  {formatProgrammeDate(programme.startDate)} -{' '}
                  {formatProgrammeDate(programme.endDate)}
                </span>
              </div>
              <h1 className="text-2xl font-semibold tracking-tight text-ink">
                {programme.name}
              </h1>
              <p className="mt-2 max-w-4xl text-sm leading-6 text-ink-muted">
                {programme.description}
              </p>
            </div>
            <ProgrammeActions
              programme={programme}
              onEdit={() => setEditProgrammeOpen(true)}
              onNewModule={() => setModuleOpen(true)}
              onArchive={() => setArchiveOpen(true)}
              onDelete={() => setDeleteProgrammeOpen(true)}
              onPublish={() => publishProgramme.mutate(programme.id)}
              onRestore={() => restoreProgramme.mutate(programme.id)}
              publishing={publishProgramme.isPending}
              restoring={restoreProgramme.isPending}
              deleting={deleteProgramme.isPending}
            />
          </div>

          {programme.lifecycle === 'archived' ? (
            <div className="mt-5 rounded-xl border border-danger/20 bg-danger-light px-4 py-3">
              <div className="font-medium text-danger">
                This programme is archived
              </div>
              <p className="mt-1 text-sm leading-6 text-ink-muted">
                Editing and curriculum changes are disabled until it is
                restored.
              </p>
              {programme.archiveReason ? (
                <p className="mt-2 text-sm text-ink">
                  Archive reason:{' '}
                  <span className="font-medium">{programme.archiveReason}</span>
                </p>
              ) : null}
            </div>
          ) : null}

          <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
            <HealthCard
              label={programme.accessType === 'free' ? 'Access' : 'Enrollment'}
              value={
                programme.accessType === 'free'
                  ? 'All entrepreneurs'
                  : `${programme.enrollment.active}/${programme.enrollment.capacity}`
              }
              progress={
                programme.accessType === 'free'
                  ? undefined
                  : Math.round(
                      (programme.enrollment.active /
                        Math.max(programme.enrollment.capacity, 1)) *
                        100,
                    )
              }
            />
            <HealthCard
              label="Modules"
              value={programme.modules.total}
              helper={
                programme.modules.total === programme.modules.ready
                  ? 'All modules ready'
                  : `${programme.modules.total - programme.modules.ready} not ready yet`
              }
            />
            <HealthCard
              label="Content assets"
              value={programme.content.total}
              helper={`${programme.content.videos} videos, ${programme.content.pdfs} PDFs, ${programme.content.excels} Excel workbooks, ${programme.content.tools} tools`}
            />
            <HealthCard
              label="Readiness"
              value={`${programme.readiness}%`}
              progress={programme.readiness}
            />
            <HealthCard
              label="Learner progress"
              value={`${programme.learnerProgress.average}%`}
              progress={programme.learnerProgress.average}
            />
          </div>
        </Card>

        <Card>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="text-base font-semibold tracking-[-0.01em]">
                Programme workspace
              </div>
              <div className="mt-1 max-w-2xl text-sm leading-5 text-ink-muted">
                Manage the curriculum, required submissions, and launch
                readiness for this programme.
              </div>
            </div>
            <Tabs
              value={tab}
              onChange={setTab}
              tabs={[
                { value: 'curriculum', label: 'Curriculum' },
                { value: 'preview', label: 'Preview' },
                { value: 'deliverables', label: 'Deliverables' },
                { value: 'readiness', label: 'Readiness' },
              ]}
              className="mb-0 w-full overflow-x-auto sm:w-fit"
            />
          </div>

          {tab === 'curriculum' ? (
            <CurriculumTable
              modules={modules}
              columns={moduleColumns}
              query={moduleSearch}
              onQueryChange={setModuleSearch}
              pageSize={pageSize}
              onPageSizeChange={setPageSize}
              canReorder={canReorder}
              sensors={sensors}
              onDragEnd={handleDragEnd}
              emptyProgramme={programme.modules.total === 0}
            />
          ) : null}

          {tab === 'preview' ? (
            player.isLoading && !player.data ? (
              <div className="mt-5">
                <ProgrammeCoursePlayerSkeleton />
              </div>
            ) : player.isError || !player.data ? (
              <div className="mt-5">
                <Notice>
                  Programme preview could not be loaded. {player.error?.message}
                </Notice>
                <Button
                  type="button"
                  variant="outline"
                  className="mt-3"
                  onClick={() => void player.refetch()}
                >
                  Try again
                </Button>
              </div>
            ) : (
              <ProgrammeCoursePlayer
                data={player.data}
                initialContentId={
                  player.data.modules.find(
                    (module: { id: string }) => module.id === previewModuleId,
                  )?.items[0]?.id ?? null
                }
                className="mt-5"
              />
            )
          ) : null}

          {tab === 'deliverables' ? (
            <RequiredDeliverablesSection
              programmeId={programmeId}
              programName={programme.name}
              readOnly={isArchived}
            />
          ) : null}

          {tab === 'readiness' ? (
            <ReadinessView programme={programme} modules={modules.rows} />
          ) : null}
        </Card>
      </section>

      <ModuleModal
        open={moduleOpen}
        onOpenChange={setModuleOpen}
        programId={programme.id}
      />
      <ProgrammeContentModal
        open={Boolean(contentModule)}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) setContentModule(null);
        }}
        module={contentModule}
        readOnly={isArchived}
      />
      {editProgrammeOpen ? (
        <ProgramModal
          open
          onOpenChange={setEditProgrammeOpen}
          mode="edit"
          program={programme}
        />
      ) : null}
      <EditModuleModal
        programmeId={programme.id}
        module={editModule}
        onOpenChange={(open) => {
          if (!open) setEditModule(null);
        }}
      />
      <MoveModulePositionModal
        key={moveModule?.id ?? 'closed'}
        open={Boolean(moveModule)}
        onOpenChange={(open) => {
          if (!open) setMoveModule(null);
        }}
        module={moveModule}
        program={programme}
        currentPosition={moveModule?.position ?? 0}
        totalModules={programme.modules.total}
        isPending={moveProgramme.isPending}
        onMove={async (position) => {
          if (!moveModule) return;
          void (await moveProgramme.mutateAsync({
            programmeId: programme.id,
            moduleId: moveModule.id,
            position,
          }));
        }}
      />
      <ProgrammeArchiveModal
        open={archiveOpen}
        onOpenChange={setArchiveOpen}
        program={programme}
        isPending={archiveProgramme.isPending}
        onArchive={async (target, reason) => {
          void (await archiveProgramme.mutateAsync({
            id: target.id,
            reason,
          }));
        }}
      />
      <DestructiveActionModal
        open={Boolean(deleteModuleTarget)}
        onOpenChange={(open) => {
          if (!open) setDeleteModuleTarget(null);
        }}
        title="Delete module"
        resourceName={deleteModuleTarget?.title ?? ""}
        description={
          deleteModuleTarget && deleteModuleTarget.programmeUses > 1
            ? 'This removes the reusable module from this programme and clears learner records created here.'
            : 'This permanently deletes the module, its learner records, and content used only by this module.'
        }
        consequences={[
          "Learner module and content progress in this programme will be deleted.",
          "Deliverable rules tied to completing this module, including submissions and reviews, will be deleted.",
          deleteModuleTarget && deleteModuleTarget.programmeUses > 1
            ? "The reusable module and its content remain available in the other programmes using it."
            : "Videos and uploaded files used only by this module will be permanently removed. Content reused elsewhere will remain available there.",
        ]}
        confirmLabel={
          deleteModuleTarget && deleteModuleTarget.programmeUses > 1
            ? 'Remove module'
            : 'Delete module'
        }
        isPending={deleteModule.isPending}
        onConfirm={async () => {
          if (!deleteModuleTarget) return;
          await deleteModule.mutateAsync({
            programmeId: programme.id,
            moduleId: deleteModuleTarget.id,
            confirmation: deleteModuleTarget.title,
          });
        }}
      />
      <DestructiveActionModal
        open={deleteProgrammeOpen}
        onOpenChange={setDeleteProgrammeOpen}
        title="Delete programme"
        resourceName={programme.name}
        description="This permanently deletes the programme and all entrepreneur activity recorded specifically against it."
        consequences={[
          "Enrolments, learning progress, goals, updates, deliverables, submissions, reviews, and programme sessions will be deleted.",
          "Programme submission files, generated reports, and connected calendar events will also be permanently removed.",
          "Reusable modules and content-library media are preserved so other programmes are not damaged.",
        ]}
        confirmLabel="Delete programme"
        isPending={deleteProgramme.isPending}
        onConfirm={async () => {
          await deleteProgramme.mutateAsync({
            id: programme.id,
            confirmation: programme.name,
          });
        }}
      />
    </>
  );
}

function CurriculumTable({
  modules,
  columns,
  query,
  onQueryChange,
  pageSize,
  onPageSizeChange,
  canReorder,
  sensors,
  onDragEnd,
  emptyProgramme,
}: {
  modules: ReturnType<typeof useProgrammeModulesPage>;
  columns: Column<ProgrammeModuleRecord>[];
  query: string;
  onQueryChange: (value: string) => void;
  pageSize: number;
  onPageSizeChange: (value: number) => void;
  canReorder: boolean;
  sensors: ReturnType<typeof useSensors>;
  onDragEnd: (event: DragEndEvent) => void;
  emptyProgramme: boolean;
}) {
  return (
    <div className="mt-5">
      <TableToolbar>
        <div>
          <div className="text-sm font-medium text-ink">
            Search modules and attached content
          </div>
          <div className="mt-0.5 text-sm text-ink-muted">
            {modules.totalItems} module{modules.totalItems === 1 ? '' : 's'} in
            this view
            {modules.isFetching ? ' · Updating...' : ''}
          </div>
        </div>
        <div className="w-full sm:w-[380px]">
          <TableFilterInput
            icon
            placeholder="Search modules..."
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
          />
        </div>
      </TableToolbar>
      {modules.isLoading && !modules.data ? (
        <TableSkeleton columns={6} rows={pageSize} />
      ) : modules.isError ? (
        <Notice>Modules could not be loaded. {modules.error.message}</Notice>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={onDragEnd}
        >
          <SortableContext
            items={modules.rows.map((module) => module.id)}
            strategy={verticalListSortingStrategy}
          >
            <DataTable
              columns={columns}
              rows={modules.rows}
              rowKey={(module) => module.id}
              sortableRows={canReorder}
              emptyMessage={
                emptyProgramme
                  ? 'No modules yet. Add a new module or reuse an existing module to start the curriculum.'
                  : 'No modules match this search.'
              }
              tableClassName="min-w-[980px]"
            />
          </SortableContext>
        </DndContext>
      )}
      <TablePagination
        page={modules.page}
        pageSize={pageSize}
        totalItems={modules.totalItems}
        pageSizeOptions={[6, 12, 24]}
        onPageChange={modules.setPage}
        onPageSizeChange={onPageSizeChange}
      />
    </div>
  );
}

function EditModuleModal({
  programmeId,
  module,
  onOpenChange,
}: {
  programmeId: string;
  module: ProgrammeModuleRecord | null;
  onOpenChange: (open: boolean) => void;
}) {
  const updateModule = useUpdateProgrammeModuleMutation();
  const form = useForm<ModuleForm>({
    resolver: zodResolver(moduleSchema),
    values: {
      title: module?.title ?? '',
      description: module?.description ?? '',
    },
  });

  if (!module) return null;

  return (
    <Modal
      open
      onOpenChange={(open) => {
        if (!updateModule.isPending) onOpenChange(open);
      }}
      title="Edit module"
    >
      <form
        onSubmit={form.handleSubmit(async (values) => {
          try {
            await updateModule.mutateAsync({
              programmeId,
              moduleId: module.id,
              payload: values,
            });
            toast.success('Module updated.');
            onOpenChange(false);
          } catch (error) {
            toast.error(
              error instanceof Error
                ? error.message
                : 'Unable to update module.',
            );
          }
        })}
      >
        <FormField
          label="Module title"
          error={form.formState.errors.title?.message}
        >
          <FormInput {...form.register('title')} />
        </FormField>
        <FormField
          label="Description"
          optional
          error={form.formState.errors.description?.message}
        >
          <FormTextarea rows={3} {...form.register('description')} />
        </FormField>
        {module.programmeUses > 1 ? (
          <Notice>
            This reusable module appears in {module.programmeUses} programmes.
            Changes to its title and description apply everywhere it is used.
          </Notice>
        ) : null}
        <Button
          type="submit"
          className="w-full"
          isLoading={updateModule.isPending}
          loadingLabel="Saving module..."
        >
          Save changes
        </Button>
      </form>
    </Modal>
  );
}

function ProgrammeActions({
  programme,
  onEdit,
  onNewModule,
  onArchive,
  onDelete,
  onPublish,
  onRestore,
  publishing,
  restoring,
  deleting,
}: {
  programme: ProgrammeDetail;
  onEdit: () => void;
  onNewModule: () => void;
  onArchive: () => void;
  onDelete: () => void;
  onPublish: () => void;
  onRestore: () => void;
  publishing: boolean;
  restoring: boolean;
  deleting: boolean;
}) {
  if (programme.lifecycle === 'archived') {
    return (
      <div className="flex shrink-0 flex-wrap gap-2">
        <Button
          onClick={onRestore}
          isLoading={restoring}
          loadingLabel="Restoring..."
        >
          Restore programme
        </Button>
        <Button
          variant="destructive"
          onClick={onDelete}
          isLoading={deleting}
          loadingLabel="Deleting..."
        >
          Delete programme
        </Button>
      </div>
    );
  }

  return (
    <div className="flex shrink-0 flex-wrap gap-2">
      <Button variant="outline" onClick={onEdit}>
        {programme.lifecycle === 'completed'
          ? 'Edit timeline'
          : 'Edit programme'}
      </Button>
      {programme.lifecycle === 'draft' ? (
        <Button
          variant="outline"
          onClick={onPublish}
          isLoading={publishing}
          loadingLabel="Publishing..."
        >
          Publish
        </Button>
      ) : null}
      {programme.lifecycle === 'completed' ? (
        <Button variant="destructive" onClick={onArchive}>
          Archive
        </Button>
      ) : null}
      {['draft', 'scheduled', 'active'].includes(programme.lifecycle) ? (
        <Button onClick={onNewModule}>New module</Button>
      ) : null}
      <Button
        variant="destructive"
        onClick={onDelete}
        isLoading={deleting}
        loadingLabel="Deleting..."
      >
        Delete programme
      </Button>
    </div>
  );
}

function ReadinessView({
  programme,
  modules,
}: {
  programme: ProgrammeDetail;
  modules: ProgrammeModuleRecord[];
}) {
  const needsContent = programme.modules.total - programme.modules.ready;
  const capacityPercentage = Math.round(
    (programme.enrollment.active / Math.max(programme.enrollment.capacity, 1)) *
      100,
  );
  return (
    <div className="mt-5 space-y-4">
      <div className="rounded-xl border border-border bg-surface-subtle px-4 py-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="text-base font-semibold text-ink">
                Launch readiness
              </div>
              <Badge tone={needsContent ? 'amber' : 'green'}>
                {needsContent ? 'Needs attention' : 'Ready to launch'}
              </Badge>
            </div>
            <p className="mt-1 max-w-3xl text-sm leading-6 text-ink-muted">
              Readiness is derived from ready learning content across the
              programme modules.
            </p>
          </div>
          <div className="w-full rounded-xl border border-border bg-card px-4 py-3 lg:w-[280px]">
            <div className="text-xs font-medium uppercase tracking-[0.04em] text-ink-muted">
              Readiness score
            </div>
            <div className="mt-1 text-3xl font-semibold leading-none text-ink">
              {programme.readiness}%
            </div>
            <ProgressBar
              value={programme.readiness}
              width="100%"
              className="mt-3 h-1.5"
            />
          </div>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
        <ReadinessItem
          icon={needsContent ? AlertTriangle : CheckCircle2}
          title="Content coverage"
          status={needsContent ? 'Not ready yet' : 'Complete'}
          description={
            needsContent
              ? `${needsContent} module${needsContent === 1 ? '' : 's'} still need ready learning content.`
              : 'Every module has ready learning content.'
          }
          warning={Boolean(needsContent)}
        />
        <ReadinessItem
          icon={Users}
          title={
            programme.accessType === 'free'
              ? 'Access model'
              : 'Enrollment capacity'
          }
          status={
            programme.accessType === 'free'
              ? 'Open to all'
              : capacityPercentage >= 90
                ? 'Nearly full'
                : 'Seats available'
          }
          description={
            programme.accessType === 'free'
              ? 'Every entrepreneur can access this programme.'
              : `${programme.enrollment.active} of ${programme.enrollment.capacity} seats are filled.`
          }
          warning={programme.accessType !== 'free' && capacityPercentage >= 90}
        />
        <ReadinessItem
          icon={FileText}
          title="Required submissions"
          status="Managed separately"
          description="Deliverable rules remain available in the Deliverables tab."
        />
      </div>
      <DataTable
        columns={[
          {
            key: 'module',
            header: 'Module',
            cell: (module) => (
              <div>
                <div className="font-semibold text-ink">{module.title}</div>
                <div className="mt-1 text-xs text-ink-muted">
                  Position {module.position}
                </div>
              </div>
            ),
          },
          {
            key: 'coverage',
            header: 'Coverage',
            cell: (module) => <ModuleContentSummary module={module} />,
          },
          {
            key: 'status',
            header: 'Launch status',
            cell: (module) => <ModuleReadinessBadge module={module} />,
          },
        ]}
        rows={modules}
        rowKey={(module) => module.id}
        emptyMessage="No modules have been added to this programme yet."
        tableClassName="min-w-[760px]"
      />
    </div>
  );
}

function ModuleReorderHandle({
  module,
  disabled,
}: {
  module: ProgrammeModuleRecord;
  disabled: boolean;
}) {
  const {
    attributes,
    listeners,
    setActivatorNodeRef,
    disabled: rowDisabled,
  } = useSortableRow();
  return (
    <div className="flex items-center gap-2">
      <button
        ref={setActivatorNodeRef}
        type="button"
        disabled={disabled || rowDisabled}
        {...attributes}
        {...listeners}
        className="inline-flex h-8 w-8 touch-none cursor-grab items-center justify-center rounded-lg border border-border bg-card text-ink-muted active:cursor-grabbing disabled:cursor-not-allowed disabled:opacity-45"
        aria-label={`Move ${module.title}`}
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <span className="text-xs text-ink-muted">Position {module.position}</span>
    </div>
  );
}

function ModuleContentSummary({ module }: { module: ProgrammeModuleRecord }) {
  if (module.content.total === 0) {
    return <span className="text-sm text-ink-muted">No content yet</span>;
  }
  return (
    <div className="flex flex-wrap gap-1.5">
      {module.content.videos ? (
        <Badge tone="blue">{module.content.videos} video</Badge>
      ) : null}
      {module.content.pdfs ? (
        <Badge tone="neutral">{module.content.pdfs} PDF</Badge>
      ) : null}
      {module.content.excels ? (
        <Badge tone="green">{module.content.excels} Excel</Badge>
      ) : null}
      {module.content.tools ? (
        <Badge tone="brand">{module.content.tools} tool</Badge>
      ) : null}
    </div>
  );
}

function ModuleReadinessBadge({ module }: { module: ProgrammeModuleRecord }) {
  const presentation = {
    ready: { label: 'Ready', tone: 'green' },
    processing: { label: 'Processing', tone: 'blue' },
    needs_content: { label: 'Needs content', tone: 'amber' },
    needs_attention: { label: 'Needs attention', tone: 'red' },
  } as const;
  const state = presentation[module.readiness];
  const title =
    module.readiness === 'processing'
      ? `${module.processingContentCount} content item${module.processingContentCount === 1 ? '' : 's'} still processing`
      : undefined;

  return (
    <Badge tone={state.tone} title={title}>
      {state.label}
    </Badge>
  );
}

function HealthCard({
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
    <div className="rounded-xl border border-border bg-card px-4 py-3">
      <div className="text-xs font-medium uppercase tracking-[0.04em] text-ink-muted">
        {label}
      </div>
      <div className="mt-1 text-xl font-semibold text-ink">{value}</div>
      {helper ? (
        <div className="mt-1 text-xs text-ink-muted">{helper}</div>
      ) : null}
      {progress !== undefined ? (
        <ProgressBar value={progress} width="100%" className="mt-3 h-1.5" />
      ) : null}
    </div>
  );
}

function ReadinessItem({
  icon: Icon,
  title,
  status,
  description,
  warning = false,
}: {
  icon: typeof Users;
  title: string;
  status: string;
  description: string;
  warning?: boolean;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center gap-2">
        <Icon
          className={`h-5 w-5 ${warning ? 'text-warning' : 'text-success'}`}
        />
        <div className="font-semibold text-ink">{title}</div>
      </div>
      <Badge tone={warning ? 'amber' : 'neutral'} className="mt-3">
        {status}
      </Badge>
      <p className="mt-3 text-sm leading-6 text-ink-muted">{description}</p>
    </div>
  );
}

function ProgrammeStatusBadge({ status }: { status: ProgrammeLifecycle }) {
  const tones = {
    draft: 'neutral',
    scheduled: 'blue',
    active: 'green',
    completed: 'amber',
    archived: 'red',
  } as const;
  return (
    <Badge tone={tones[status]}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </Badge>
  );
}

function BackToProgrammes() {
  return (
    <Button asChild variant="outline">
      <Link href={routes.admin.programs}>
        <ArrowLeft className="h-4 w-4" />
        Back to programmes
      </Link>
    </Button>
  );
}

function ProgrammeWorkspaceSkeleton() {
  return (
    <>
      <PageHeader
        title="Programme workspace"
        description="Manage curriculum, required submissions, content readiness, and learner progress."
        actions={<BackToProgrammes />}
      />
      <Card padding="lg">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="mt-4 h-9 w-2/3" />
        <Skeleton className="mt-3 h-4 w-full max-w-3xl" />
        <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
          {Array.from({ length: 5 }, (_, index) => (
            <Skeleton key={index} className="h-24" />
          ))}
        </div>
      </Card>
      <div className="mt-4">
        <TableSkeleton columns={6} rows={6} />
      </div>
    </>
  );
}

const formatProgrammeDate = (date: string) =>
  new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    year: 'numeric',
  });
