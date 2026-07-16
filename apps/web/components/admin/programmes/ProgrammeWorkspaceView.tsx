'use client';

import * as React from 'react';
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
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  FileText,
  GripVertical,
  Users,
  type LucideIcon,
} from 'lucide-react';
import { Card } from '@/components/shared/Card';
import { Badge } from '@/components/shared/Badge';
import { Button } from '@/components/shared/Button';
import { ProgressBar } from '@/components/shared/ProgressBar';
import { Tabs } from '@/components/shared/Tabs';
import {
  DataTable,
  RowActions,
  TableFilterInput,
  TablePagination,
  TableToolbar,
  useSortableRow,
  type Column,
} from '@/components/shared/DataTable';
import { ModuleModal } from '@/components/admin/ModuleModal';
import { ManageContentModal, AddContentItemModal } from '@/components/admin/ManageContentModal';
import { ModuleDetailModal } from '@/components/admin/programmes/ModuleDetailModal';
import { MoveModulePositionModal } from '@/components/admin/programmes/MoveModulePositionModal';
import { ProgrammeArchiveModal } from '@/components/admin/programmes/ProgrammeArchiveModal';
import { RequiredDeliverablesSection } from '@/components/admin/programmes/BackendRequiredDeliverablesSection';
import {
  archiveProgrammePatch,
  publishProgrammePatch,
  restoreProgrammePatch,
} from '@/lib/programme-lifecycle';
import { contentItems } from '@/lib/mock-data/programs';
import { getProgrammeStatus, getProgrammeStatusLabel, getProgrammeStatusTone } from '@/lib/programme-status';
import { useAdminStore } from '@/lib/stores/admin-store';
import type { ContentItem, Module, Program } from '@/types';

type WorkspaceTab = 'curriculum' | 'deliverables' | 'readiness';

export function ProgrammeWorkspaceView({
  program,
  modules,
  onEditProgram,
}: {
  program: Program;
  modules: Module[];
  onEditProgram: () => void;
}) {
  const { updateProgram, reorderProgramModule, moveProgramModule, moveProgramModuleToPosition } = useAdminStore();
  const [workspaceTab, setWorkspaceTab] = React.useState<WorkspaceTab>('curriculum');
  const [moduleOpen, setModuleOpen] = React.useState(false);
  const [viewModule, setViewModule] = React.useState<Module | null>(null);
  const [manageContentModule, setManageContentModule] = React.useState<Module | null>(null);
  const [addContentModule, setAddContentModule] = React.useState<Module | null>(null);
  const [addContentOpen, setAddContentOpen] = React.useState(false);
  const [archiveTarget, setArchiveTarget] = React.useState<Program | null>(null);
  const [movePositionModule, setMovePositionModule] = React.useState<Module | null>(null);
  const [moduleQuery, setModuleQuery] = React.useState('');
  const [modulePage, setModulePage] = React.useState(1);
  const [modulePageSize, setModulePageSize] = React.useState(6);

  const programModules = React.useMemo(() => {
    const moduleById = new Map(modules.map((module) => [module.id, module]));
    return program.moduleIds
      .map((moduleId) => moduleById.get(moduleId))
      .filter((module): module is Module => Boolean(module));
  }, [modules, program.moduleIds]);
  const filteredProgramModules = React.useMemo(() => {
    const needle = moduleQuery.trim().toLowerCase();
    if (!needle) return programModules;
    return programModules.filter((module) => {
      const attachedItems = getModuleContentItems(module);
      return [
        module.title,
        module.description ?? '',
        String(programModules.findIndex((item) => item.id === module.id) + 1),
        ...attachedItems.map((item) => `${item.title} ${item.type} ${item.durationLabel ?? ''}`),
      ]
        .join(' ')
        .toLowerCase()
        .includes(needle);
    });
  }, [moduleQuery, programModules]);

  React.useEffect(() => {
    setModulePage(1);
  }, [moduleQuery, modulePageSize, program.id]);

  const modulePageRows = React.useMemo(() => {
    const start = (modulePage - 1) * modulePageSize;
    return filteredProgramModules.slice(start, start + modulePageSize);
  }, [filteredProgramModules, modulePage, modulePageSize]);
  const modulePageRowIds = React.useMemo(() => modulePageRows.map((module) => module.id), [modulePageRows]);
  const moduleReorderSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const selectedContentItems = programModules.flatMap((module) => getModuleContentItems(module));
  const contentTypeCounts = selectedContentItems.reduce<Record<ContentItem['type'], number>>(
    (acc, item) => ({ ...acc, [item.type]: acc[item.type] + 1 }),
    { video: 0, pdf: 0, tool: 0 },
  );
  const modulesWithoutContent = programModules.filter((module) => module.contentItemIds.length === 0);
  const capacityPercentage = Math.round((program.entrepreneursCount / Math.max(program.maxEntrepreneurs, 1)) * 100);
  const readinessScore = programModules.length
    ? Math.round(((programModules.length - modulesWithoutContent.length) / programModules.length) * 100)
    : 0;
  const readinessNeedsAttention = modulesWithoutContent.length > 0;
  const capacityNeedsAttention = program.accessType !== 'free' && capacityPercentage >= 90;
  const programmeStatus = getProgrammeStatus(program);
  const isArchived = programmeStatus === 'archived';
  const canReorderModules = !isArchived && moduleQuery.trim().length === 0;

  const openAddContent = React.useCallback((module: Module) => {
    setViewModule(null);
    setManageContentModule(null);
    setAddContentModule(module);
    setAddContentOpen(true);
  }, []);

  const openManageContent = React.useCallback((module: Module) => {
    setViewModule(null);
    setManageContentModule(module);
  }, []);

  const handleModuleDragEnd = React.useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (!canReorderModules || !over || active.id === over.id) return;
    reorderProgramModule(program.id, String(active.id), String(over.id));
  }, [canReorderModules, program.id, reorderProgramModule]);

  const moduleColumns = React.useMemo<Column<Module>[]>(
    () => [
      {
        key: 'reorder',
        header: 'Reorder',
        cell: (module) => {
          const modulePosition = programModules.findIndex((item) => item.id === module.id) + 1;
          return <ModuleReorderHandle module={module} position={modulePosition} />;
        },
        className: 'min-w-[132px]',
      },
      {
        key: 'actions',
        header: 'Action',
        cell: (module) => {
          const moduleIndex = programModules.findIndex((item) => item.id === module.id);
          return (
            <RowActions
              actions={[
                {
                  label: 'Manage content',
                  disabled: isArchived,
                  onSelect: () => openManageContent(module),
                },
                {
                  label: 'Add content item',
                  disabled: isArchived,
                  onSelect: () => openAddContent(module),
                },
                'separator',
                {
                  label: 'Move to position',
                  disabled: isArchived,
                  onSelect: () => setMovePositionModule(module),
                },
                {
                  label: 'Move up',
                  disabled: !canReorderModules || moduleIndex <= 0,
                  onSelect: () => moveProgramModule(program.id, module.id, 'up'),
                },
                {
                  label: 'Move down',
                  disabled: !canReorderModules || moduleIndex < 0 || moduleIndex >= programModules.length - 1,
                  onSelect: () => moveProgramModule(program.id, module.id, 'down'),
                },
              ]}
            />
          );
        },
        className: 'w-[84px]',
      },
      {
        key: 'module',
        header: 'Module',
        cell: (module) => (
          <div className="max-w-[420px]">
            <button
              type="button"
              onClick={() => setViewModule(module)}
              className="block rounded-md text-left font-semibold text-ink transition-colors hover:text-bid focus:outline-none focus-visible:ring-2 focus-visible:ring-bid/20"
            >
              {module.title}
            </button>
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
    [canReorderModules, isArchived, moveProgramModule, openAddContent, openManageContent, program.id, programModules],
  );


  return (
    <>
      <section className="space-y-4">
        <Card accent={program.accent} padding="lg">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
            <div className="min-w-0">
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <StatusBadge program={program} />
                <Badge tone={program.accessType === 'free' ? 'blue' : 'brand'}>
                  {program.accessType === 'free' ? 'Free programme' : 'Assigned programme'}
                </Badge>
                <span className="inline-flex items-center gap-1.5 text-sm text-ink-muted">
                  <CalendarDays className="h-4 w-4" />
                  {formatProgramDate(program.startDate)} - {formatProgramDate(program.endDate)}
                </span>
              </div>
              <h2 className="text-2xl font-semibold tracking-tight text-ink">{program.name}</h2>
              <p className="mt-2 max-w-4xl text-sm leading-6 text-ink-muted">
                {program.description}
              </p>
            </div>
            <div className="flex shrink-0 flex-wrap gap-2">
              {programmeStatus === 'draft' && (
                <>
                  <Button variant="outline" onClick={onEditProgram}>Edit programme</Button>
                  <Button variant="outline" onClick={() => updateProgram(program.id, publishProgrammePatch())}>Publish</Button>
                  <Button variant="destructive" onClick={() => setArchiveTarget(program)}>Archive</Button>
                </>
              )}
              {programmeStatus === 'scheduled' && (
                <>
                  <Button variant="outline" onClick={onEditProgram}>Edit programme</Button>
                  <Button variant="destructive" onClick={() => setArchiveTarget(program)}>Archive</Button>
                </>
              )}
              {programmeStatus === 'active' && (
                <>
                  <Button variant="outline" onClick={onEditProgram}>Edit programme</Button>
                  <Button variant="destructive" onClick={() => setArchiveTarget(program)}>Archive</Button>
                </>
              )}
              {programmeStatus === 'completed' && (
                <>
                  <Button variant="outline" onClick={onEditProgram}>Edit timeline</Button>
                  <Button variant="destructive" onClick={() => setArchiveTarget(program)}>Archive</Button>
                </>
              )}
              {programmeStatus === 'archived' && (
                <Button onClick={() => updateProgram(program.id, restoreProgrammePatch())}>Restore programme</Button>
              )}
              {['draft', 'scheduled', 'active'].includes(programmeStatus) && (
                <Button onClick={() => setModuleOpen(true)}>New module</Button>
              )}
            </div>
          </div>

          {isArchived && (
            <div className="mt-5 rounded-xl border border-danger/20 bg-danger-light px-4 py-3">
              <div className="font-medium text-danger">This programme is archived</div>
              <p className="mt-1 text-sm leading-6 text-ink-muted">
                It remains available for audit and reporting, but editing and new content changes are disabled until it is restored.
              </p>
              {program.archiveReason && (
                <p className="mt-2 text-sm text-ink">
                  Archive reason: <span className="font-medium">{program.archiveReason}</span>
                </p>
              )}
            </div>
          )}

          <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
            <ProgrammeHealthCard
              label={program.accessType === 'free' ? 'Access' : 'Enrollment'}
              value={program.accessType === 'free' ? 'All entrepreneurs' : `${program.entrepreneursCount}/${program.maxEntrepreneurs}`}
              progress={program.accessType === 'free' ? undefined : capacityPercentage}
            />
            <ProgrammeHealthCard label="Modules" value={programModules.length} helper={`${modulesWithoutContent.length} need content`} />
            <ProgrammeHealthCard label="Content assets" value={selectedContentItems.length} helper={`${contentTypeCounts.video} videos, ${contentTypeCounts.pdf} PDFs, ${contentTypeCounts.tool} tools`} />
            <ProgrammeHealthCard label="Readiness" value={`${readinessScore}%`} progress={readinessScore} />
            <ProgrammeHealthCard label="Learner progress" value={`${program.progress}%`} progress={program.progress} />
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
              <DndContext
                sensors={moduleReorderSensors}
                collisionDetection={closestCenter}
                onDragEnd={handleModuleDragEnd}
              >
                <SortableContext items={modulePageRowIds} strategy={verticalListSortingStrategy}>
                  <DataTable
                    columns={moduleColumns}
                    rows={modulePageRows}
                    rowKey={(module) => module.id}
                    sortableRows={canReorderModules}
                    emptyMessage={
                      programModules.length === 0
                        ? 'No modules yet. Add a new module or reuse an existing module to start the curriculum.'
                        : 'No modules match this search.'
                    }
                    tableClassName="min-w-[980px]"
                  />
                </SortableContext>
              </DndContext>
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
            <RequiredDeliverablesSection programmeId={program.id} programName={program.name} />
          )}

          {workspaceTab === 'readiness' && (
            <div className="mt-5 space-y-4">
              <div className="rounded-xl border border-black/[0.08] bg-surface-subtle px-4 py-4">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="text-base font-semibold text-ink">Launch readiness</div>
                      <Badge tone={readinessNeedsAttention ? 'amber' : 'green'}>
                        {readinessNeedsAttention ? 'Needs attention' : 'Ready to launch'}
                      </Badge>
                    </div>
                    <p className="mt-1 max-w-3xl text-sm leading-6 text-ink-muted">
                      Use this checklist before publishing or enrolling entrepreneurs. It confirms that modules have learning content, capacity is clear, and deliverable rules are easy to find.
                    </p>
                  </div>
                  <div className="w-full rounded-xl border border-black/[0.08] bg-white px-4 py-3 lg:w-[280px]">
                    <div className="flex items-end justify-between gap-3">
                      <div>
                        <div className="text-xs font-medium uppercase tracking-[0.04em] text-ink-muted">Readiness score</div>
                        <div className="mt-1 text-3xl font-semibold leading-none text-ink">{readinessScore}%</div>
                      </div>
                      <div className="text-right text-xs leading-5 text-ink-muted">
                        {programModules.length - modulesWithoutContent.length}/{programModules.length} modules ready
                      </div>
                    </div>
                    <ProgressBar value={readinessScore} width="100%" className="mt-3 h-1.5" />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
                <ReadinessPanelItem
                  icon={modulesWithoutContent.length ? AlertTriangle : CheckCircle2}
                  title="Content coverage"
                  status={modulesWithoutContent.length ? 'Needs content' : 'Complete'}
                  description={
                    modulesWithoutContent.length
                      ? `${modulesWithoutContent.length} module${modulesWithoutContent.length === 1 ? '' : 's'} still need at least one learning asset.`
                      : 'Every module currently has at least one learning asset attached.'
                  }
                  tone={modulesWithoutContent.length ? 'warning' : 'success'}
                />
                <ReadinessPanelItem
                  icon={Users}
                  title={program.accessType === 'free' ? 'Access model' : 'Enrollment capacity'}
                  status={
                    program.accessType === 'free'
                      ? 'Open to all'
                      : capacityNeedsAttention
                        ? 'Nearly full'
                        : 'Seats available'
                  }
                  description={
                    program.accessType === 'free'
                      ? 'Every entrepreneur can access this programme without manual enrollment.'
                      : `${program.entrepreneursCount} of ${program.maxEntrepreneurs} seats are currently filled.`
                  }
                  tone={capacityNeedsAttention ? 'warning' : 'neutral'}
                />
                <ReadinessPanelItem
                  icon={FileText}
                  title="Required submissions"
                  status="Managed separately"
                  description="Deliverable rules live in the Deliverables tab and appear in entrepreneur submission queues."
                  tone="neutral"
                />
              </div>

              <div>
                <div className="mb-3">
                  <div className="text-sm font-semibold text-ink">Module readiness</div>
                  <div className="mt-0.5 text-sm text-ink-muted">Review each module before entrepreneurs start learning.</div>
                </div>
                <DataTable
                  columns={[
                    {
                      key: 'module',
                      header: 'Module',
                      cell: (module) => (
                        <div>
                          <button
                            type="button"
                            onClick={() => setViewModule(module)}
                            className="block rounded-md text-left font-semibold text-ink transition-colors hover:text-bid focus:outline-none focus-visible:ring-2 focus-visible:ring-bid/20"
                          >
                            {module.title}
                          </button>
                          <div className="mt-1 text-xs text-ink-muted">Order {module.order}</div>
                        </div>
                      ),
                      className: 'min-w-[280px]',
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
                          <Badge tone="green">Ready</Badge>
                        ) : (
                          <Badge tone="amber">Needs content</Badge>
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
                              disabled: isArchived,
                              onSelect: () => openManageContent(module),
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
                  tableClassName="min-w-[840px]"
                />
              </div>
            </div>
          )}
        </Card>
      </section>

      <ModuleModal open={moduleOpen} onOpenChange={setModuleOpen} programId={program.id} />
      <ModuleDetailModal
        open={!!viewModule}
        onOpenChange={(open) => !open && setViewModule(null)}
        module={viewModule ?? undefined}
        program={program}
        onManageContent={openManageContent}
        onAddContent={openAddContent}
        readOnly={isArchived}
      />
      <ManageContentModal
        open={!!manageContentModule}
        onOpenChange={(open) => !open && setManageContentModule(null)}
        module={manageContentModule ?? undefined}
        onAddItem={openAddContent}
      />
      <AddContentItemModal
        open={addContentOpen}
        onOpenChange={(open) => {
          setAddContentOpen(open);
          if (!open) setAddContentModule(null);
        }}
        module={addContentModule ?? undefined}
        onAdded={(module) => setManageContentModule(module)}
      />

      <MoveModulePositionModal
        key={movePositionModule?.id ?? 'closed'}
        open={!!movePositionModule}
        onOpenChange={(open) => !open && setMovePositionModule(null)}
        module={movePositionModule}
        program={program}
        currentPosition={movePositionModule ? programModules.findIndex((module) => module.id === movePositionModule.id) + 1 : 0}
        totalModules={programModules.length}
        onMove={(position) => {
          if (movePositionModule) {
            moveProgramModuleToPosition(program.id, movePositionModule.id, position);
          }
        }}
      />
      <ProgrammeArchiveModal
        open={!!archiveTarget}
        onOpenChange={(open) => !open && setArchiveTarget(null)}
        program={archiveTarget ?? undefined}
        onArchive={(target, reason) => updateProgram(target.id, archiveProgrammePatch(reason))}
      />
    </>
  );
}

const formatProgramDate = (date: string) =>
  new Date(date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });

const getModuleContentItems = (module: Module) =>
  module.contentItemIds
    .map((contentId) => contentItems.find((item) => item.id === contentId))
    .filter(Boolean) as ContentItem[];

export function StatusBadge({ program }: { program: Program }) {
  const status = getProgrammeStatus(program);

  return (
    <Badge tone={getProgrammeStatusTone(status)}>
      {getProgrammeStatusLabel(status)}
    </Badge>
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


function ModuleReorderHandle({ module, position }: { module: Module; position: number }) {
  const { attributes, listeners, setActivatorNodeRef, disabled, isDragging } = useSortableRow();

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        ref={setActivatorNodeRef}
        disabled={disabled}
        className="inline-flex h-8 w-8 cursor-grab touch-none items-center justify-center rounded-lg border border-black/[0.08] bg-white text-ink-muted shadow-sm transition hover:bg-surface-subtle hover:text-ink active:cursor-grabbing disabled:cursor-not-allowed disabled:opacity-45"
        aria-label={`Reorder ${module.title}`}
        title={disabled ? 'Clear search to reorder modules' : 'Drag to reorder module'}
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <span className="inline-flex h-8 min-w-8 items-center justify-center rounded-lg bg-surface-subtle px-2 text-xs font-semibold text-ink-muted">
        {position}
      </span>
      {isDragging ? <span className="sr-only">Moving {module.title}</span> : null}
    </div>
  );
}

function ContentCoverage({ module }: { module: Module }) {
  const items = getModuleContentItems(module);
  const counts = items.reduce<Record<ContentItem['type'], number>>(
    (acc, item) => ({ ...acc, [item.type]: acc[item.type] + 1 }),
    { video: 0, pdf: 0, tool: 0 },
  );

  if (items.length === 0) return <Badge tone="amber">No content</Badge>;

  return (
    <div className="flex flex-wrap gap-1.5">
      {counts.video > 0 && <Badge tone="neutral">{counts.video} Video</Badge>}
      {counts.pdf > 0 && <Badge tone="neutral">{counts.pdf} PDF</Badge>}
      {counts.tool > 0 && <Badge tone="neutral">{counts.tool} Tool</Badge>}
    </div>
  );
}

function ReadinessPanelItem({
  icon: Icon,
  title,
  status,
  description,
  tone = 'neutral',
}: {
  icon: LucideIcon;
  title: string;
  status: string;
  description: string;
  tone?: 'neutral' | 'warning' | 'success';
}) {
  const badgeTone = tone === 'success' ? 'green' : tone === 'warning' ? 'amber' : 'neutral';

  return (
    <div className="rounded-xl border border-black/[0.08] bg-white px-4 py-4">
      <div className="flex items-start gap-3">
        <div
          className={
            tone === 'warning'
              ? 'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-warning-light text-warning-dark'
              : tone === 'success'
                ? 'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-success-light text-success-dark'
                : 'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-surface-subtle text-bid'
          }
        >
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="font-semibold text-ink">{title}</div>
            <Badge tone={badgeTone}>{status}</Badge>
          </div>
          <div className="mt-2 text-sm leading-5 text-ink-muted">{description}</div>
        </div>
      </div>
    </div>
  );
}
