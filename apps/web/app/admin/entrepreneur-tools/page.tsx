'use client';

import * as React from 'react';
import { CalendarDays, ExternalLink, FileText, Globe2, LayoutGrid, Plus, Star, Timer, Upload, Wrench } from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader, Notice } from '@/components/shared/PageHeader';
import { MetricGrid } from '@/components/shared/MetricGrid';
import { StatCard } from '@/components/shared/StatCard';
import { Card, CardHeader } from '@/components/shared/Card';
import { Badge } from '@/components/shared/Badge';
import { Button } from '@/components/shared/Button';
import { Modal } from '@/components/shared/Modal';
import { FormAutocomplete, FormField, FormInput, FormSelect, FormTextarea } from '@/components/shared/FormField';
import {
  DataTable,
  RowActions,
  TableFilterAutocomplete,
  TableFilterInput,
  TableFilterSelect,
  TablePagination,
  TableToolbar,
  type Column,
  type RowAction,
} from '@/components/shared/DataTable';
import { tools as seedTools } from '@/lib/mock-data';
import { programs } from '@/lib/mock-data/programs';
import { entrepreneurs } from '@/lib/mock-data/entrepreneurs';
import { sectorById, stageById } from '@/lib/mock-data/definitions';
import {
  describeToolAudience,
  getToolStatus,
  getToolVisibility,
  toolStatusLabels,
  toolVisibilityLabels,
} from '@/lib/tool-access';
import { toolAreaOptions } from '@/lib/tool-areas';
import { cn } from '@/lib/utils';
import type { BadgeTone, Entrepreneur, Program, Tool, ToolStatus, ToolType, ToolVisibility } from '@/types';

const iconOptions: Array<{ value: Tool['iconKey']; label: string }> = [
  { value: 'canvas', label: 'Canvas' },
  { value: 'document', label: 'Document' },
  { value: 'timer', label: 'Timer' },
  { value: 'star', label: 'Checklist' },
  { value: 'plus', label: 'Calculator' },
  { value: 'calendar', label: 'Calendar' },
];

const typeOptions: Array<{ value: ToolType; label: string }> = [
  { value: 'pdf', label: 'PDF resource' },
  { value: 'embed', label: 'Online tool' },
];

const visibilityOptions: Array<{ value: ToolVisibility; label: string }> = [
  { value: 'all-entrepreneurs', label: 'All entrepreneurs' },
  { value: 'programmes', label: 'Selected programmes' },
  { value: 'entrepreneurs', label: 'Selected entrepreneurs' },
];

const statusOptions: Array<{ value: ToolStatus; label: string }> = [
  { value: 'draft', label: 'Draft' },
  { value: 'published', label: 'Published' },
  { value: 'archived', label: 'Archived' },
];

const statusTone: Record<ToolStatus, BadgeTone> = {
  draft: 'amber',
  published: 'green',
  archived: 'neutral',
};

const visibilityTone: Record<ToolVisibility, BadgeTone> = {
  'all-entrepreneurs': 'green',
  programmes: 'blue',
  entrepreneurs: 'brand',
};

const typeTone: Record<ToolType, BadgeTone> = {
  pdf: 'blue',
  embed: 'green',
};

const iconMap = {
  canvas: LayoutGrid,
  document: FileText,
  timer: Timer,
  star: Star,
  plus: Plus,
  calendar: CalendarDays,
};

function formatDate(value?: string) {
  if (!value) return 'Not updated';
  return new Date(value).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function sourceLabel(tool: Tool) {
  if (tool.type === 'pdf') return tool.pdfFileName ?? (tool.pdfUrl ? 'PDF attached' : 'No PDF attached');
  return tool.embedUrl ? 'Embed link added' : 'No tool link added';
}

function toolAreaLabel(tool: Tool) {
  return tool.toolArea || 'No tool area';
}

function normaliseTool(tool: Tool): Tool {
  return {
    ...tool,
    status: getToolStatus(tool),
    visibility: getToolVisibility(tool),
  };
}

export default function AdminEntrepreneurToolsPage() {
  const [toolRows, setToolRows] = React.useState<Tool[]>(() => seedTools.map(normaliseTool));
  const [query, setQuery] = React.useState('');
  const [typeFilter, setTypeFilter] = React.useState<'all' | ToolType>('all');
  const [toolAreaFilter, setToolAreaFilter] = React.useState('all');
  const [statusFilter, setStatusFilter] = React.useState<'all' | ToolStatus>('all');
  const [visibilityFilter, setVisibilityFilter] = React.useState<'all' | ToolVisibility>('all');
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(10);
  const [activeTool, setActiveTool] = React.useState<Tool | null>(null);
  const [editingTool, setEditingTool] = React.useState<Tool | null>(null);
  const [editorOpen, setEditorOpen] = React.useState(false);

  const saveTool = (tool: Tool) => {
    setToolRows((current) => {
      const exists = current.some((item) => item.id === tool.id);
      if (exists) return current.map((item) => (item.id === tool.id ? tool : item));
      return [tool, ...current];
    });
    toast.success(getToolStatus(tool) === 'published' ? 'Tool saved and published' : 'Tool saved');
  };

  const updateTool = (id: string, patch: Partial<Tool>, message: string) => {
    setToolRows((current) =>
      current.map((tool) =>
        tool.id === id ? { ...tool, ...patch, updatedAt: new Date().toISOString() } : tool,
      ),
    );
    toast.success(message);
  };

  const openCreate = () => {
    setEditingTool(null);
    setEditorOpen(true);
  };

  const openEdit = (tool: Tool) => {
    setEditingTool(tool);
    setEditorOpen(true);
  };

  const filteredTools = React.useMemo(() => {
    const needle = query.trim().toLowerCase();
    return toolRows.filter((tool) => {
      const audience = describeToolAudience(tool, programs, entrepreneurs);
      const matchesQuery =
        !needle ||
        [tool.name, tool.description, tool.type, toolAreaLabel(tool), sourceLabel(tool), audience.label, audience.detail]
          .join(' ')
          .toLowerCase()
          .includes(needle);
      const matchesType = typeFilter === 'all' || tool.type === typeFilter;
      const matchesToolArea = toolAreaFilter === 'all' || tool.toolArea === toolAreaFilter;
      const matchesStatus = statusFilter === 'all' || getToolStatus(tool) === statusFilter;
      const matchesVisibility = visibilityFilter === 'all' || getToolVisibility(tool) === visibilityFilter;
      return matchesQuery && matchesType && matchesToolArea && matchesStatus && matchesVisibility;
    });
  }, [query, statusFilter, toolAreaFilter, toolRows, typeFilter, visibilityFilter]);

  React.useEffect(() => {
    setPage(1);
  }, [query, statusFilter, toolAreaFilter, typeFilter, visibilityFilter, pageSize]);

  const pageRows = React.useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredTools.slice(start, start + pageSize);
  }, [filteredTools, page, pageSize]);

  const published = toolRows.filter((tool) => getToolStatus(tool) === 'published').length;
  const globalTools = toolRows.filter((tool) => getToolVisibility(tool) === 'all-entrepreneurs').length;
  const targetedTools = toolRows.filter((tool) => getToolVisibility(tool) !== 'all-entrepreneurs').length;
  const drafts = toolRows.filter((tool) => getToolStatus(tool) === 'draft').length;

  const getActions = (tool: Tool): Array<RowAction | 'separator'> => {
    const status = getToolStatus(tool);
    return [
      { label: 'View tool', onSelect: () => setActiveTool(tool) },
      { label: 'Edit tool', onSelect: () => openEdit(tool) },
      'separator',
      {
        label: status === 'published' ? 'Move to draft' : 'Publish tool',
        onSelect: () =>
          updateTool(
            tool.id,
            { status: status === 'published' ? 'draft' : 'published' },
            status === 'published' ? 'Tool moved to draft' : 'Tool published',
          ),
      },
      {
        label: status === 'archived' ? 'Restore as draft' : 'Archive tool',
        destructive: status !== 'archived',
        onSelect: () =>
          updateTool(
            tool.id,
            { status: status === 'archived' ? 'draft' : 'archived' },
            status === 'archived' ? 'Tool restored as draft' : 'Tool archived',
          ),
      },
    ];
  };

  const columns: Column<Tool>[] = [
    {
      key: 'action',
      header: 'Action',
      cell: (tool) => <RowActions actions={getActions(tool)} />,
      className: 'w-[84px]',
    },
    {
      key: 'tool',
      header: 'Tool',
      cell: (tool) => {
        const Icon = iconMap[tool.iconKey] ?? Wrench;
        return (
          <button
            type="button"
            onClick={() => setActiveTool(tool)}
            className="flex min-w-[280px] max-w-[520px] items-start gap-3 rounded-lg text-left outline-none transition hover:text-bid focus-visible:ring-2 focus-visible:ring-bid/20"
          >
            <span className={cn('mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl', tool.type === 'pdf' ? 'bg-info-light text-info' : 'bg-bid-light text-bid')}>
              <Icon className="h-5 w-5" />
            </span>
            <span className="min-w-0">
              <span className="block font-semibold text-ink transition group-hover:text-bid">{tool.name}</span>
              <span className="mt-1 line-clamp-2 text-sm leading-5 text-ink-muted">{tool.description}</span>
            </span>
          </button>
        );
      },
    },
    {
      key: 'type',
      header: 'Type',
      cell: (tool) => <Badge tone={typeTone[tool.type]}>{tool.type === 'pdf' ? 'PDF resource' : 'Online tool'}</Badge>,
    },
    {
      key: 'toolArea',
      header: 'Tool area',
      cell: (tool) => <Badge tone="neutral">{toolAreaLabel(tool)}</Badge>,
    },
    {
      key: 'audience',
      header: 'Who can see it',
      cell: (tool) => {
        const audience = describeToolAudience(tool, programs, entrepreneurs);
        const visibility = getToolVisibility(tool);
        return (
          <div className="min-w-[240px] max-w-[360px]">
            <Badge tone={visibilityTone[visibility]}>{toolVisibilityLabels[visibility]}</Badge>
            <div className="mt-2 line-clamp-2 text-sm leading-5 text-ink-muted">{audience.detail}</div>
          </div>
        );
      },
    },
    {
      key: 'source',
      header: 'Source',
      cell: (tool) => <div className="min-w-[160px] text-sm text-ink-muted">{sourceLabel(tool)}</div>,
    },
    {
      key: 'status',
      header: 'Status',
      cell: (tool) => <Badge tone={statusTone[getToolStatus(tool)]}>{toolStatusLabels[getToolStatus(tool)]}</Badge>,
    },
    {
      key: 'updated',
      header: 'Updated',
      cell: (tool) => <div className="min-w-[120px] text-sm text-ink-muted">{formatDate(tool.updatedAt)}</div>,
    },
  ];

  return (
    <>
      <PageHeader
        title="Entrepreneur tools"
        description="Manage downloadable PDF resources and online tools entrepreneurs can open from their workspace."
        actions={<Button onClick={openCreate}>+ Add tool</Button>}
      />
      <Notice>
        Use global visibility for broad self-serve tools, programme visibility for tools tied to a curriculum or cohort,
        and individual visibility only when a tool is meant for specific entrepreneurs.
      </Notice>

      <MetricGrid className="mb-4">
        <StatCard label="Published tools" value={published} subline="Visible when access rules match" dotColor="success" accent="success" />
        <StatCard label="Global tools" value={globalTools} subline="Available to every entrepreneur" dotColor="bid" accent="bid" />
        <StatCard label="Targeted tools" value={targetedTools} subline="Programme or entrepreneur-specific" dotColor="info" accent="info" />
        <StatCard label="Drafts" value={drafts} subline="Not visible yet" dotColor="warning" accent="warning" />
      </MetricGrid>

      <Card>
        <CardHeader
          title="Tool library"
          description={`${filteredTools.length} tool${filteredTools.length === 1 ? '' : 's'} in this view`}
        />
        <TableToolbar>
          <div>
            <div className="text-sm font-medium text-ink">Filter entrepreneur tools</div>
            <div className="mt-0.5 text-sm text-ink-muted">Search by tool name, tool area, audience, source, or description.</div>
          </div>
          <div className="grid w-full gap-2 lg:w-auto lg:grid-cols-[240px_170px_190px_170px_200px]">
            <TableFilterInput
              icon
              placeholder="Search tools..."
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
            <TableFilterSelect value={typeFilter} onChange={(event) => setTypeFilter(event.target.value as typeof typeFilter)}>
              <option value="all">All types</option>
              <option value="pdf">PDF resources</option>
              <option value="embed">Online tools</option>
            </TableFilterSelect>
            <TableFilterAutocomplete
              value={toolAreaFilter}
              onValueChange={setToolAreaFilter}
              options={[{ value: 'all', label: 'All tool areas' }, ...toolAreaOptions]}
              placeholder="All tool areas"
              searchPlaceholder="Search tool areas..."
              emptyMessage="No tool area found."
            />
            <TableFilterSelect value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)}>
              <option value="all">All statuses</option>
              {statusOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </TableFilterSelect>
            <TableFilterSelect value={visibilityFilter} onChange={(event) => setVisibilityFilter(event.target.value as typeof visibilityFilter)}>
              <option value="all">All audiences</option>
              {visibilityOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </TableFilterSelect>
          </div>
        </TableToolbar>
        <DataTable
          columns={columns}
          rows={pageRows}
          rowKey={(tool) => tool.id}
          emptyMessage="No tools match this view."
          tableClassName="min-w-[1080px]"
        />
        <TablePagination
          page={page}
          pageSize={pageSize}
          totalItems={filteredTools.length}
          pageSizeOptions={[10, 25, 50]}
          onPageChange={setPage}
          onPageSizeChange={(next) => {
            setPageSize(next);
            setPage(1);
          }}
        />
      </Card>

      <ToolEditorModal
        open={editorOpen}
        tool={editingTool}
        onOpenChange={setEditorOpen}
        onSave={saveTool}
      />
      <ToolDetailsModal
        tool={activeTool}
        onClose={() => setActiveTool(null)}
        onEdit={(tool) => {
          setActiveTool(null);
          openEdit(tool);
        }}
      />
    </>
  );
}

type ToolDraft = {
  name: string;
  description: string;
  type: ToolType;
  toolArea: string;
  status: ToolStatus;
  visibility: ToolVisibility;
  iconKey: Tool['iconKey'];
  pdfFileName: string;
  embedUrl: string;
};

function ToolEditorModal({
  open,
  tool,
  onOpenChange,
  onSave,
}: {
  open: boolean;
  tool: Tool | null;
  onOpenChange: (open: boolean) => void;
  onSave: (tool: Tool) => void;
}) {
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [draft, setDraft] = React.useState<ToolDraft>(() => emptyDraft());
  const [selectedProgrammeIds, setSelectedProgrammeIds] = React.useState<string[]>([]);
  const [selectedEntrepreneurIds, setSelectedEntrepreneurIds] = React.useState<string[]>([]);
  const [errors, setErrors] = React.useState<Record<string, string>>({});

  React.useEffect(() => {
    if (!open) return;
    setDraft(toolToDraft(tool));
    setSelectedProgrammeIds(tool?.programmeIds ?? []);
    setSelectedEntrepreneurIds(tool?.entrepreneurIds ?? []);
    setErrors({});
  }, [open, tool]);

  const setField = <K extends keyof ToolDraft>(key: K, value: ToolDraft[K]) => {
    setDraft((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: '' }));
  };

  const toggleProgramme = (id: string) => {
    setSelectedProgrammeIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
    setErrors((current) => ({ ...current, audience: '' }));
  };

  const toggleEntrepreneur = (id: string) => {
    setSelectedEntrepreneurIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
    setErrors((current) => ({ ...current, audience: '' }));
  };

  const validate = () => {
    const next: Record<string, string> = {};
    if (!draft.name.trim()) next.name = 'Tool name is required.';
    if (!draft.description.trim()) next.description = 'Description is required.';
    if (!draft.toolArea.trim()) next.toolArea = 'Select a tool area.';
    if (draft.type === 'pdf' && !draft.pdfFileName.trim() && !tool?.pdfUrl) next.pdfFileName = 'Upload or select a PDF resource.';
    if (draft.type === 'embed') {
      if (!draft.embedUrl.trim()) next.embedUrl = 'Add the online tool link.';
      else {
        try { new URL(draft.embedUrl); } catch { next.embedUrl = 'Enter a valid URL.'; }
      }
    }
    if (draft.visibility === 'programmes' && selectedProgrammeIds.length === 0) next.audience = 'Select at least one programme.';
    if (draft.visibility === 'entrepreneurs' && selectedEntrepreneurIds.length === 0) next.audience = 'Select at least one entrepreneur.';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!validate()) return;
    const isPdf = draft.type === 'pdf';
    const saved: Tool = {
      id: tool?.id ?? `tool-${Date.now()}`,
      name: draft.name.trim(),
      description: draft.description.trim(),
      type: draft.type,
      toolArea: draft.toolArea,
      status: draft.status,
      visibility: draft.visibility,
      programmeIds: draft.visibility === 'programmes' ? selectedProgrammeIds : [],
      entrepreneurIds: draft.visibility === 'entrepreneurs' ? selectedEntrepreneurIds : [],
      pdfFileName: isPdf ? draft.pdfFileName.trim() || tool?.pdfFileName : undefined,
      pdfUrl: isPdf ? tool?.pdfUrl ?? 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf' : undefined,
      embedUrl: isPdf ? undefined : draft.embedUrl.trim(),
      updatedAt: new Date().toISOString(),
      iconKey: draft.iconKey,
    };
    onSave(saved);
    onOpenChange(false);
  };

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={tool ? 'Edit entrepreneur tool' : 'Add entrepreneur tool'}
      width="xl"
    >
      <form onSubmit={submit} className="space-y-5">
        <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
          <div>
            <FormField label="Tool name" error={errors.name}>
              <FormInput value={draft.name} onChange={(event) => setField('name', event.target.value)} placeholder="e.g. Cash flow forecasting resource" />
            </FormField>
            <FormField label="Description" error={errors.description}>
              <FormTextarea value={draft.description} onChange={(event) => setField('description', event.target.value)} rows={3} placeholder="Short description entrepreneurs will see." />
            </FormField>
            <div className="grid gap-3 sm:grid-cols-2">
              <FormField label="Tool type">
                <FormSelect value={draft.type} onValueChange={(value) => setField('type', value as ToolType)} options={typeOptions} />
              </FormField>
              <FormField label="Tool area" error={errors.toolArea}>
                <FormAutocomplete
                  value={draft.toolArea}
                  onValueChange={(value) => setField('toolArea', value)}
                  options={[...toolAreaOptions]}
                  placeholder="Select tool area"
                  searchPlaceholder="Search tool areas..."
                  emptyMessage="No tool area found."
                />
              </FormField>
              <FormField label="Publishing">
                <FormSelect value={draft.status} onValueChange={(value) => setField('status', value as ToolStatus)} options={statusOptions} />
              </FormField>
              <FormField label="Icon">
                <FormSelect value={draft.iconKey} onValueChange={(value) => setField('iconKey', value as Tool['iconKey'])} options={iconOptions} />
              </FormField>
              <FormField label="Visibility">
                <FormSelect value={draft.visibility} onValueChange={(value) => setField('visibility', value as ToolVisibility)} options={visibilityOptions} />
              </FormField>
            </div>

            {draft.type === 'pdf' ? (
              <FormField label="PDF resource" error={errors.pdfFileName}>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="application/pdf"
                  className="hidden"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) setField('pdfFileName', file.name);
                  }}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex min-h-[92px] w-full flex-col items-center justify-center rounded-xl border border-dashed border-line-strong bg-white px-4 py-5 text-center transition hover:border-bid/40 hover:bg-bid-light/20"
                >
                  <Upload className="mb-2 h-5 w-5 text-bid" />
                  <span className="text-sm font-semibold text-ink">{draft.pdfFileName || 'Attach PDF resource'}</span>
                  <span className="mt-1 text-sm text-ink-muted">PDF files only</span>
                </button>
              </FormField>
            ) : (
              <FormField label="Online tool link" error={errors.embedUrl}>
                <FormInput value={draft.embedUrl} onChange={(event) => setField('embedUrl', event.target.value)} placeholder="https://example.com/tool" />
              </FormField>
            )}
          </div>

          <div className="rounded-2xl border border-line bg-surface-subtle p-4">
            <div className="flex items-start gap-3">
              <Globe2 className="mt-0.5 h-5 w-5 text-bid" />
              <div>
                <div className="font-semibold text-ink">Audience rule</div>
                <p className="mt-1 text-sm leading-6 text-ink-muted">
                  Global tools are the default. Programme and individual targeting should be used only when the tool is not useful to everyone.
                </p>
              </div>
            </div>
            <div className="mt-4 rounded-xl bg-white p-3 text-sm text-ink-muted">
              {draft.visibility === 'all-entrepreneurs' && 'This tool will appear for every entrepreneur once published.'}
              {draft.visibility === 'programmes' && 'Only entrepreneurs with access to the selected programmes will see this tool.'}
              {draft.visibility === 'entrepreneurs' && 'Only the selected entrepreneurs will see this tool.'}
            </div>
          </div>
        </div>

        {draft.visibility !== 'all-entrepreneurs' && (
          <AudienceSelector
            mode={draft.visibility === 'programmes' ? 'programmes' : 'entrepreneurs'}
            selectedIds={draft.visibility === 'programmes' ? selectedProgrammeIds : selectedEntrepreneurIds}
            error={errors.audience}
            onToggle={draft.visibility === 'programmes' ? toggleProgramme : toggleEntrepreneur}
            onSelectMany={(ids) => {
              if (draft.visibility === 'programmes') {
                setSelectedProgrammeIds((current) => Array.from(new Set([...current, ...ids])));
              } else {
                setSelectedEntrepreneurIds((current) => Array.from(new Set([...current, ...ids])));
              }
              setErrors((current) => ({ ...current, audience: '' }));
            }}
            onClear={() => {
              if (draft.visibility === 'programmes') {
                setSelectedProgrammeIds([]);
              } else {
                setSelectedEntrepreneurIds([]);
              }
            }}
          />
        )}

        <div className="flex flex-col gap-2 border-t border-line pt-4 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button type="submit">{tool ? 'Save tool' : 'Add tool'}</Button>
        </div>
      </form>
    </Modal>
  );
}

function emptyDraft(): ToolDraft {
  return {
    name: '',
    description: '',
    type: 'pdf',
    toolArea: '',
    status: 'draft',
    visibility: 'all-entrepreneurs',
    iconKey: 'document',
    pdfFileName: '',
    embedUrl: '',
  };
}

function toolToDraft(tool: Tool | null): ToolDraft {
  if (!tool) return emptyDraft();
  return {
    name: tool.name,
    description: tool.description,
    type: tool.type,
    toolArea: tool.toolArea ?? '',
    status: getToolStatus(tool),
    visibility: getToolVisibility(tool),
    iconKey: tool.iconKey,
    pdfFileName: tool.pdfFileName ?? '',
    embedUrl: tool.embedUrl ?? '',
  };
}

function AudienceSelector({
  mode,
  selectedIds,
  error,
  onToggle,
  onSelectMany,
  onClear,
}: {
  mode: 'programmes' | 'entrepreneurs';
  selectedIds: string[];
  error?: string;
  onToggle: (id: string) => void;
  onSelectMany: (ids: string[]) => void;
  onClear: () => void;
}) {
  const [query, setQuery] = React.useState('');
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(5);
  const [programmeAccessFilter, setProgrammeAccessFilter] = React.useState<'all' | Program['accessType']>('all');
  const [countryFilter, setCountryFilter] = React.useState('all');
  const [stageFilter, setStageFilter] = React.useState('all');
  const isProgrammes = mode === 'programmes';

  const filteredRows = React.useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (isProgrammes) {
      return programs.filter((program) => {
        const matchesQuery = !needle || [program.name, program.description ?? '', program.accessType]
          .join(' ')
          .toLowerCase()
          .includes(needle);
        const matchesAccess = programmeAccessFilter === 'all' || program.accessType === programmeAccessFilter;
        return matchesQuery && matchesAccess;
      });
    }

    return entrepreneurs.filter((entrepreneur) => {
      const sector = sectorById[entrepreneur.sector]?.label ?? entrepreneur.sector;
      const stage = stageById[entrepreneur.stage]?.label ?? entrepreneur.stage;
      const matchesQuery = !needle || [
        entrepreneur.businessName,
        entrepreneur.representative,
        entrepreneur.email,
        entrepreneur.country,
        sector,
        stage,
      ]
        .join(' ')
        .toLowerCase()
        .includes(needle);
      const matchesCountry = countryFilter === 'all' || entrepreneur.country === countryFilter;
      const matchesStage = stageFilter === 'all' || entrepreneur.stage === stageFilter;
      return matchesQuery && matchesCountry && matchesStage;
    });
  }, [countryFilter, isProgrammes, programmeAccessFilter, query, stageFilter]);

  React.useEffect(() => {
    setPage(1);
  }, [countryFilter, mode, pageSize, programmeAccessFilter, query, stageFilter]);

  const pageRows = React.useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredRows.slice(start, start + pageSize);
  }, [filteredRows, page, pageSize]);

  const pageIds = pageRows.map((row) => row.id);
  const selectedOnPage = pageIds.filter((id) => selectedIds.includes(id)).length;
  const allPageSelected = pageIds.length > 0 && selectedOnPage === pageIds.length;

  const selectedRows = React.useMemo(() => {
    const source = isProgrammes ? programs : entrepreneurs;
    return selectedIds
      .map((id) => source.find((row) => row.id === id))
      .filter(Boolean) as Array<Program | Entrepreneur>;
  }, [isProgrammes, selectedIds]);

  const countryOptions = React.useMemo(() => {
    const values = Array.from(new Set(entrepreneurs.map((entrepreneur) => entrepreneur.country))).sort();
    return [{ value: 'all', label: 'All countries' }, ...values.map((value) => ({ value, label: value }))];
  }, []);

  const stageOptions = React.useMemo(() => {
    const values = Array.from(new Set(entrepreneurs.map((entrepreneur) => entrepreneur.stage))).sort();
    return [
      { value: 'all', label: 'All stages' },
      ...values.map((value) => ({ value, label: stageById[value]?.label ?? value })),
    ];
  }, []);

  const handleSelectPage = () => {
    if (allPageSelected) {
      pageIds.forEach((id) => {
        if (selectedIds.includes(id)) onToggle(id);
      });
      return;
    }
    onSelectMany(pageIds.filter((id) => !selectedIds.includes(id)));
  };

  return (
    <div className="rounded-2xl border border-line bg-white p-4">
      <div className="mb-3 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="font-semibold text-ink">Select audience</div>
          <div className="mt-1 text-sm text-ink-muted">
            {isProgrammes
              ? 'Choose programmes that should unlock this tool for their entrepreneurs.'
              : 'Choose individual businesses only for exception-based access.'}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={selectedIds.length > 0 ? 'brand' : 'neutral'}>
            {selectedIds.length} selected
          </Badge>
          {selectedIds.length > 0 && (
            <Button type="button" variant="outline" size="sm" onClick={onClear}>
              Clear
            </Button>
          )}
        </div>
      </div>

      {error && <div className="mb-3 rounded-xl bg-danger/10 px-3 py-2 text-sm text-danger">{error}</div>}

      <TableToolbar className="mb-3">
        <div>
          <div className="text-sm font-medium text-ink">Find audience</div>
          <div className="mt-0.5 text-sm text-ink-muted">
            {isProgrammes ? 'Search by programme name or description.' : 'Search by business, representative, email, country, stage, or sector.'}
          </div>
        </div>
        <div className={cn('grid w-full gap-2 lg:w-auto', isProgrammes ? 'lg:grid-cols-[280px_190px]' : 'lg:grid-cols-[260px_170px_170px]')}>
          <TableFilterInput
            icon
            placeholder={isProgrammes ? 'Search programmes...' : 'Search businesses...'}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          {isProgrammes ? (
            <TableFilterAutocomplete
              value={programmeAccessFilter}
              onValueChange={(value) => setProgrammeAccessFilter(value as typeof programmeAccessFilter)}
              options={[
                { value: 'all', label: 'All programme access' },
                { value: 'assigned', label: 'Assigned programmes' },
                { value: 'free', label: 'Free programmes' },
              ]}
              placeholder="All programme access"
              searchPlaceholder="Search access..."
            />
          ) : (
            <>
              <TableFilterAutocomplete
                value={countryFilter}
                onValueChange={setCountryFilter}
                options={countryOptions}
                placeholder="All countries"
                searchPlaceholder="Search countries..."
              />
              <TableFilterAutocomplete
                value={stageFilter}
                onValueChange={setStageFilter}
                options={stageOptions}
                placeholder="All stages"
                searchPlaceholder="Search stages..."
              />
            </>
          )}
        </div>
      </TableToolbar>

      <div className="overflow-hidden rounded-xl border border-line bg-white">
        <div className="flex flex-col gap-2 border-b border-line bg-surface-subtle/70 px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm text-ink-muted">
            Showing <span className="font-medium text-ink">{filteredRows.length}</span> {isProgrammes ? 'programmes' : 'businesses'} in this view
          </div>
          <Button type="button" variant="outline" size="sm" onClick={handleSelectPage} disabled={pageIds.length === 0}>
            {allPageSelected ? 'Clear page' : 'Select page'}
          </Button>
        </div>
        <div className="max-h-[320px] overflow-y-auto">
          <table className="w-full min-w-[720px] border-separate border-spacing-0 text-sm">
            <thead className="sticky top-0 z-10 bg-surface-subtle">
              <tr>
                <th className="w-[56px] border-b border-line px-4 py-3 text-left text-xs font-medium uppercase tracking-[0.04em] text-ink-muted">Select</th>
                <th className="border-b border-line px-4 py-3 text-left text-xs font-medium uppercase tracking-[0.04em] text-ink-muted">{isProgrammes ? 'Programme' : 'Business'}</th>
                <th className="border-b border-line px-4 py-3 text-left text-xs font-medium uppercase tracking-[0.04em] text-ink-muted">Context</th>
                <th className="border-b border-line px-4 py-3 text-left text-xs font-medium uppercase tracking-[0.04em] text-ink-muted">Type</th>
              </tr>
            </thead>
            <tbody>
              {pageRows.map((row) => {
                const selected = selectedIds.includes(row.id);
                const program = isProgrammes ? row as Program : null;
                const entrepreneur = !isProgrammes ? row as Entrepreneur : null;
                return (
                  <tr key={row.id} className="transition-colors hover:bg-surface-subtle/60">
                    <td className="border-b border-line/80 px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selected}
                        onChange={() => onToggle(row.id)}
                        className="h-4 w-4 accent-bid"
                        aria-label={`Select ${isProgrammes ? program?.name : entrepreneur?.businessName}`}
                      />
                    </td>
                    <td className="border-b border-line/80 px-4 py-3">
                      <div className="min-w-[220px] font-semibold text-ink">
                        {isProgrammes ? program?.name : entrepreneur?.businessName}
                      </div>
                      {!isProgrammes && <div className="mt-1 text-sm text-ink-muted">{entrepreneur?.representative}</div>}
                    </td>
                    <td className="border-b border-line/80 px-4 py-3 text-sm text-ink-muted">
                      {isProgrammes ? (
                        <div className="min-w-[240px] line-clamp-2">{program?.description ?? 'No description'}</div>
                      ) : (
                        <div className="min-w-[220px]">
                          <div>{entrepreneur?.email}</div>
                          <div className="mt-1">{entrepreneur?.country} · {sectorById[entrepreneur?.sector ?? 'fintech']?.label ?? entrepreneur?.sector}</div>
                        </div>
                      )}
                    </td>
                    <td className="border-b border-line/80 px-4 py-3">
                      {isProgrammes ? (
                        <Badge tone={program?.accessType === 'free' ? 'neutral' : 'blue'}>{program?.accessType === 'free' ? 'Free' : 'Assigned'}</Badge>
                      ) : (
                        <Badge tone={stageById[entrepreneur?.stage ?? '']?.color ?? 'neutral'}>{stageById[entrepreneur?.stage ?? '']?.label ?? entrepreneur?.stage}</Badge>
                      )}
                    </td>
                  </tr>
                );
              })}
              {pageRows.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-10 text-center text-sm text-ink-muted">
                    No audience matches this view.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

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
        className="mt-3"
      />

      {selectedRows.length > 0 && (
        <div className="mt-3 rounded-xl border border-line bg-surface-subtle px-3 py-3">
          <div className="mb-2 text-sm font-medium text-ink">Selected {isProgrammes ? 'programmes' : 'businesses'}</div>
          <div className="flex max-h-[92px] flex-wrap gap-1.5 overflow-y-auto pr-1">
            {selectedRows.map((row) => (
              <Badge key={row.id} tone="brand" className="max-w-[220px] truncate" title={isProgrammes ? (row as Program).name : (row as Entrepreneur).businessName}>
                {isProgrammes ? (row as Program).name : (row as Entrepreneur).businessName}
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ToolDetailsModal({
  tool,
  onClose,
  onEdit,
}: {
  tool: Tool | null;
  onClose: () => void;
  onEdit: (tool: Tool) => void;
}) {
  if (!tool) return null;
  const audience = describeToolAudience(tool, programs, entrepreneurs);
  const previewUrl = tool.type === 'pdf' ? tool.pdfUrl : tool.embedUrl;

  return (
    <Modal open={!!tool} onOpenChange={(open) => !open && onClose()} title="Tool details" width="xl">
      <div className="space-y-4">
        <div className="rounded-2xl border border-line bg-surface-subtle p-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="flex flex-wrap gap-2">
                <Badge tone={typeTone[tool.type]}>{tool.type === 'pdf' ? 'PDF resource' : 'Online tool'}</Badge>
                <Badge tone={statusTone[getToolStatus(tool)]}>{toolStatusLabels[getToolStatus(tool)]}</Badge>
                <Badge tone={visibilityTone[getToolVisibility(tool)]}>{toolVisibilityLabels[getToolVisibility(tool)]}</Badge>
              </div>
              <div className="mt-3 text-2xl font-semibold text-ink">{tool.name}</div>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-ink-muted">{tool.description}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {previewUrl && (
                <Button asChild variant="outline" className="border-bid/35 bg-bid-light/35 text-bid-dark hover:bg-bid-light">
                  <a href={previewUrl} target="_blank" rel="noreferrer"><ExternalLink className="h-4 w-4" /> Open</a>
                </Button>
              )}
              <Button onClick={() => onEdit(tool)}>Edit tool</Button>
            </div>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-4">
          <InfoBlock label="Tool area" value={toolAreaLabel(tool)} />
          <InfoBlock label="Audience" value={audience.label} detail={audience.detail} />
          <InfoBlock label="Source" value={sourceLabel(tool)} detail={tool.type === 'pdf' ? tool.pdfUrl : tool.embedUrl} />
          <InfoBlock label="Last updated" value={formatDate(tool.updatedAt)} />
        </div>

        <div className="overflow-hidden rounded-2xl border border-line bg-white">
          {previewUrl ? (
            <iframe
              title={`${tool.name} preview`}
              src={previewUrl}
              sandbox={tool.type === 'embed' ? 'allow-forms allow-popups allow-same-origin allow-scripts' : undefined}
              className="h-[48vh] min-h-[360px] w-full bg-white"
            />
          ) : (
            <div className="grid min-h-[320px] place-items-center bg-surface-subtle p-8 text-center text-sm text-ink-muted">
              Add a {tool.type === 'pdf' ? 'PDF resource' : 'tool link'} before this can be previewed.
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}

function InfoBlock({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return (
    <div className="rounded-xl border border-line bg-white p-3">
      <div className="text-xs font-medium uppercase tracking-[0.04em] text-ink-faint">{label}</div>
      <div className="mt-1 text-sm font-semibold text-ink">{value}</div>
      {detail && <div className="mt-1 line-clamp-2 text-sm leading-5 text-ink-muted">{detail}</div>}
    </div>
  );
}
