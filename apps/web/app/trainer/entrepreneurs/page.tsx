'use client';

import * as React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Mail, Phone, Search } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { MetricGrid } from '@/components/shared/MetricGrid';
import { StatCard } from '@/components/shared/StatCard';
import { Card, CardHeader } from '@/components/shared/Card';
import { Badge } from '@/components/shared/Badge';
import { Avatar } from '@/components/shared/Avatar';
import { ProgressBar } from '@/components/shared/ProgressBar';
import { Modal } from '@/components/shared/Modal';
import {
  DataTable,
  RowActions,
  TableEmptyState,
  TableFilterAutocomplete,
  TableFilterInput,
  TablePagination,
  TableToolbar,
  type Column,
} from '@/components/shared/DataTable';
import { listEntrepreneurs, type EntrepreneurProgrammeAccess, type EntrepreneurRecord } from '@/lib/api/entrepreneurs';
import { listProgrammes, type ProgrammeListItem } from '@/lib/api/programmes';
import { listTools, type ToolRecord } from '@/lib/api/tools';
import { cn } from '@/lib/utils';
import type { BadgeTone } from '@/types';

const ALL = 'all';

type FollowUpLabel = 'On track' | 'Low progress' | 'No programme access';

type ToolAccessSource = 'global' | 'programme' | 'individual';

type VisibleTool = ToolRecord & {
  source: ToolAccessSource;
};

const toolAccessMeta: Record<ToolAccessSource, { label: string; tone: BadgeTone }> = {
  global: { label: 'Global', tone: 'green' },
  programme: { label: 'Programme', tone: 'blue' },
  individual: { label: 'Individual', tone: 'brand' },
};

async function fetchAllEntrepreneurs() {
  const firstPage = await listEntrepreneurs({ take: 50 });
  const items: EntrepreneurRecord[] = [...firstPage.items];
  let cursor = firstPage.nextCursor;

  while (cursor) {
    const nextPage = await listEntrepreneurs({ take: 50, cursor });
    items.push(...nextPage.items);
    cursor = nextPage.nextCursor;
  }

  return items;
}

async function fetchAllProgrammes() {
  const firstPage = await listProgrammes({ take: 100 });
  const items: ProgrammeListItem[] = [...firstPage.items];
  let cursor = firstPage.nextCursor;

  while (cursor) {
    const nextPage = await listProgrammes({ take: 100, cursor });
    items.push(...nextPage.items);
    cursor = nextPage.nextCursor;
  }

  return items;
}

async function fetchPublishedTools() {
  const firstPage = await listTools({ status: 'published', take: 50 });
  const items: ToolRecord[] = [...firstPage.items];
  let cursor = firstPage.nextCursor;

  while (cursor) {
    const nextPage = await listTools({ status: 'published', take: 50, cursor });
    items.push(...nextPage.items);
    cursor = nextPage.nextCursor;
  }

  return items;
}

function initials(record: EntrepreneurRecord) {
  return record.businessName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('') || 'EN';
}

function getFollowUp(entrepreneur: EntrepreneurRecord): { label: FollowUpLabel; tone: BadgeTone } {
  if (entrepreneur.programmeAccess.assignedProgrammes.length === 0) {
    return { label: 'No programme access', tone: 'amber' };
  }
  if (entrepreneur.learnerProgress.average < 50) {
    return { label: 'Low progress', tone: 'amber' };
  }
  return { label: 'On track', tone: 'green' };
}

function getVisibleToolsForEntrepreneur(tools: ToolRecord[], entrepreneur: EntrepreneurRecord): VisibleTool[] {
  const assignedProgrammeIds = new Set(entrepreneur.programmeAccess.assignedProgrammes.map((programme) => programme.id));
  const visibleTools: VisibleTool[] = [];

  tools.forEach((tool) => {
    if (tool.audience.hiddenEntrepreneurUserIds.includes(entrepreneur.entrepreneurUserId)) return;
    if (tool.visibility === 'all_entrepreneurs') {
      visibleTools.push({ ...tool, source: 'global' });
      return;
    }
    if (tool.visibility === 'entrepreneurs' && tool.audience.entrepreneurUserIds.includes(entrepreneur.entrepreneurUserId)) {
      visibleTools.push({ ...tool, source: 'individual' });
      return;
    }
    if (tool.visibility === 'programmes' && tool.audience.programmeIds.some((programmeId) => assignedProgrammeIds.has(programmeId))) {
      visibleTools.push({ ...tool, source: 'programme' });
    }
  });

  return visibleTools;
}

function ProgrammeAccessChips({ programmes, className }: { programmes: EntrepreneurProgrammeAccess[]; className?: string }) {
  const visible = programmes.slice(0, 2);
  const hiddenCount = Math.max(programmes.length - visible.length, 0);
  return (
    <div className={cn('flex min-w-0 flex-wrap gap-1.5', className)}>
      <Badge tone="neutral">Free resources</Badge>
      {visible.map((programme) => (
        <Badge key={programme.id} tone={programme.accessType === 'free' ? 'green' : 'blue'} className="max-w-[180px] truncate" title={programme.name}>
          {programme.name}
        </Badge>
      ))}
      {hiddenCount > 0 && <Badge tone="brand">+{hiddenCount} more</Badge>}
    </div>
  );
}

function ToolAccessChips({ entrepreneur, tools, className }: { entrepreneur: EntrepreneurRecord; tools: ToolRecord[]; className?: string }) {
  const [open, setOpen] = React.useState(false);
  const visibleTools = React.useMemo(() => getVisibleToolsForEntrepreneur(tools, entrepreneur), [entrepreneur, tools]);
  const visible = visibleTools.slice(0, 2);
  const hiddenCount = Math.max(visibleTools.length - visible.length, 0);

  return (
    <>
      <div className={cn('flex min-w-0 flex-wrap gap-1.5', className)}>
        {visible.map((tool) => (
          <Badge key={tool.id} tone={tool.type === 'pdf' ? 'blue' : 'green'} className="max-w-[170px] truncate" title={tool.name}>
            {tool.name}
          </Badge>
        ))}
        {hiddenCount > 0 && (
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              setOpen(true);
            }}
            className="inline-flex items-center rounded-full bg-surface-subtle px-2.5 py-1 text-xs font-semibold leading-tight text-bid transition hover:bg-bid-light focus:outline-none focus-visible:ring-2 focus-visible:ring-bid/30"
          >
            +{hiddenCount} more
          </button>
        )}
        {visibleTools.length === 0 && <span className="text-sm text-ink-faint">No tools</span>}
      </div>
      <ToolAccessModal entrepreneur={entrepreneur} tools={visibleTools} open={open} onOpenChange={setOpen} />
    </>
  );
}

function ToolAccessModal({ entrepreneur, tools, open, onOpenChange }: { entrepreneur: EntrepreneurRecord; tools: VisibleTool[]; open: boolean; onOpenChange: (open: boolean) => void }) {
  const [query, setQuery] = React.useState('');
  const filteredTools = React.useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return tools;
    return tools.filter((tool) => [tool.name, tool.description, tool.type, tool.toolArea.name, toolAccessMeta[tool.source].label].join(' ').toLowerCase().includes(needle));
  }, [query, tools]);

  React.useEffect(() => {
    if (!open) setQuery('');
  }, [open]);

  return (
    <Modal open={open} onOpenChange={onOpenChange} title={`${entrepreneur.businessName} tools`} width="wide">
      <div className="space-y-4">
        <div className="rounded-xl border border-line bg-surface-subtle px-4 py-3">
          <div className="text-sm font-semibold text-ink">{tools.length} visible tool{tools.length === 1 ? '' : 's'}</div>
          <div className="mt-1 text-sm text-ink-muted">Tools this entrepreneur can open from their workspace.</div>
        </div>
        <label className="relative block">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search tools..."
            className="h-10 w-full rounded-lg border border-line bg-white pl-9 pr-3 text-sm text-ink outline-none transition focus:border-bid focus:ring-2 focus:ring-bid/15"
          />
        </label>
        <div className="max-h-[380px] space-y-2 overflow-y-auto pr-1">
          {filteredTools.map((tool) => {
            const source = toolAccessMeta[tool.source];
            return (
              <div key={tool.id} className="rounded-xl border border-line bg-white px-4 py-3">
                <div className="font-semibold text-ink">{tool.name}</div>
                <div className="mt-1 line-clamp-2 text-sm leading-6 text-ink-muted">{tool.description}</div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <Badge tone={tool.type === 'pdf' ? 'blue' : 'green'}>{tool.type === 'pdf' ? 'PDF resource' : 'Online tool'}</Badge>
                  <Badge tone={source.tone}>{source.label}</Badge>
                  <Badge tone="neutral">{tool.toolArea.name}</Badge>
                </div>
              </div>
            );
          })}
          {filteredTools.length === 0 && (
            <div className="rounded-xl border border-dashed border-line px-4 py-8 text-center text-sm text-ink-muted">
              No tool matches this search.
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}

function EntrepreneurProfileModal({ entrepreneur, tools, open, onOpenChange }: { entrepreneur: EntrepreneurRecord | null; tools: ToolRecord[]; open: boolean; onOpenChange: (open: boolean) => void }) {
  if (!entrepreneur) return null;
  const visibleTools = getVisibleToolsForEntrepreneur(tools, entrepreneur);
  const followUp = getFollowUp(entrepreneur);

  return (
    <Modal open={open} onOpenChange={onOpenChange} title={entrepreneur.businessName} width="wide">
      <div className="space-y-4">
        <div className="rounded-xl border border-line bg-surface-subtle p-4">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="flex min-w-0 items-start gap-3">
              <Avatar initials={initials(entrepreneur)} size={48} />
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-xl font-semibold text-ink">{entrepreneur.businessName}</h3>
                  <Badge tone={entrepreneur.status === 'active' ? 'green' : 'neutral'}>{entrepreneur.status}</Badge>
                  <Badge tone={followUp.tone}>{followUp.label}</Badge>
                </div>
                <div className="mt-2 grid gap-2 text-sm text-ink-muted sm:grid-cols-2">
                  <span>{entrepreneur.representativeName}</span>
                  <span>{entrepreneur.country}</span>
                  <span className="inline-flex min-w-0 items-center gap-1.5"><Mail className="h-4 w-4" /> <span className="truncate">{entrepreneur.email}</span></span>
                  {entrepreneur.phone ? <span className="inline-flex items-center gap-1.5"><Phone className="h-4 w-4" /> {entrepreneur.phone}</span> : null}
                </div>
              </div>
            </div>
            <div className="w-full rounded-xl border border-line bg-white p-3 md:w-[240px]">
              <div className="text-sm font-medium text-ink">Training progress</div>
              <div className="mt-2 text-2xl font-semibold text-ink">{entrepreneur.learnerProgress.average}%</div>
              <ProgressBar value={entrepreneur.learnerProgress.average} width="100%" className="mt-2 h-2" />
            </div>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-xl border border-line bg-white p-4">
            <div className="text-sm font-semibold text-ink">Programme access</div>
            <div className="mt-3">
              <ProgrammeAccessChips programmes={entrepreneur.programmeAccess.assignedProgrammes} />
            </div>
          </div>
          <div className="rounded-xl border border-line bg-white p-4">
            <div className="text-sm font-semibold text-ink">Tool access</div>
            <div className="mt-3">
              <ToolAccessChips entrepreneur={entrepreneur} tools={tools} />
            </div>
            <div className="mt-2 text-xs text-ink-muted">{visibleTools.length} tool{visibleTools.length === 1 ? '' : 's'} visible</div>
          </div>
        </div>
      </div>
    </Modal>
  );
}

export default function TrainerEntrepreneursPage() {
  const entrepreneursQuery = useQuery({
    queryKey: ['entrepreneurs', 'trainer-directory'],
    queryFn: fetchAllEntrepreneurs,
  });
  const programmesQuery = useQuery({
    queryKey: ['programmes', 'trainer-programme-filter'],
    queryFn: fetchAllProgrammes,
  });
  const toolsQuery = useQuery({
    queryKey: ['tools', 'trainer-visible'],
    queryFn: fetchPublishedTools,
  });

  const entrepreneurs: EntrepreneurRecord[] = entrepreneursQuery.data ?? [];
  const tools: ToolRecord[] = toolsQuery.data ?? [];
  const programmeOptions: ProgrammeListItem[] = programmesQuery.data ?? [];

  const [query, setQuery] = React.useState('');
  const [programmeFilter, setProgrammeFilter] = React.useState(ALL);
  const [followUpFilter, setFollowUpFilter] = React.useState<typeof ALL | FollowUpLabel>(ALL);
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(10);
  const [viewTarget, setViewTarget] = React.useState<EntrepreneurRecord | null>(null);

  const needsAttention = entrepreneurs.filter((entrepreneur) => getFollowUp(entrepreneur).tone !== 'green').length;
  const avgTraining = Math.round(entrepreneurs.reduce((sum, entrepreneur) => sum + entrepreneur.learnerProgress.average, 0) / Math.max(entrepreneurs.length, 1));
  const visibleToolCount = entrepreneurs.reduce((sum, entrepreneur) => sum + getVisibleToolsForEntrepreneur(tools, entrepreneur).length, 0);

  const filtered = React.useMemo(() => {
    const needle = query.trim().toLowerCase();
    return entrepreneurs.filter((entrepreneur) => {
      const followUp = getFollowUp(entrepreneur);
      const visibleTools = getVisibleToolsForEntrepreneur(tools, entrepreneur);
      const matchesQuery = !needle || [
        entrepreneur.businessName,
        entrepreneur.representativeName,
        entrepreneur.email,
        entrepreneur.country,
        entrepreneur.sector?.name ?? '',
        entrepreneur.stage?.name ?? '',
        entrepreneur.programmeAccess.assignedProgrammes.map((programme) => programme.name).join(' '),
        visibleTools.map((tool) => tool.name).join(' '),
      ].join(' ').toLowerCase().includes(needle);
      const matchesProgramme = programmeFilter === ALL || entrepreneur.programmeAccess.assignedProgrammes.some((programme) => programme.id === programmeFilter);
      const matchesFollowUp = followUpFilter === ALL || followUp.label === followUpFilter;
      return matchesQuery && matchesProgramme && matchesFollowUp;
    });
  }, [entrepreneurs, followUpFilter, programmeFilter, query, tools]);

  React.useEffect(() => {
    setPage(1);
  }, [query, programmeFilter, followUpFilter, pageSize]);

  const pageRows = React.useMemo(() => {
    const start = (page - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, page, pageSize]);

  const columns = React.useMemo<Column<EntrepreneurRecord>[]>(
    () => [
      {
        key: 'action',
        header: 'Action',
        cell: (entrepreneur) => <RowActions actions={[{ label: 'View profile', onSelect: () => setViewTarget(entrepreneur) }]} />,
        className: 'w-[84px]',
      },
      {
        key: 'business',
        header: 'Business',
        cell: (entrepreneur) => (
          <button type="button" onClick={() => setViewTarget(entrepreneur)} className="flex min-w-[280px] items-center gap-3 rounded-lg text-left outline-none transition hover:text-bid focus-visible:ring-2 focus-visible:ring-bid/20">
            <Avatar initials={initials(entrepreneur)} size={32} />
            <span className="min-w-0">
              <span className="block font-medium text-ink transition-colors group-hover:text-bid">{entrepreneur.businessName}</span>
              <span className="mt-1 block text-sm text-ink-muted">{entrepreneur.representativeName}</span>
            </span>
          </button>
        ),
      },
      {
        key: 'programme',
        header: 'Programme access',
        cell: (entrepreneur) => <ProgrammeAccessChips programmes={entrepreneur.programmeAccess.assignedProgrammes} className="min-w-[260px] max-w-[360px]" />,
      },
      {
        key: 'tools',
        header: 'Tools',
        cell: (entrepreneur) => <ToolAccessChips entrepreneur={entrepreneur} tools={tools} className="min-w-[240px] max-w-[330px]" />,
      },
      {
        key: 'stage',
        header: 'Stage / sector',
        cell: (entrepreneur) => (
          <div className="flex min-w-[190px] flex-wrap gap-1.5">
            {entrepreneur.stage ? <Badge tone="blue">{entrepreneur.stage.name}</Badge> : <Badge tone="neutral">No stage</Badge>}
            {entrepreneur.sector ? <Badge tone="green">{entrepreneur.sector.name}</Badge> : <Badge tone="neutral">No sector</Badge>}
          </div>
        ),
      },
      {
        key: 'progress',
        header: 'Training',
        cell: (entrepreneur) => (
          <div className="min-w-[180px]">
            <ProgressBar value={entrepreneur.learnerProgress.average} width="100%" className="h-2" />
            <div className="mt-1 text-sm text-ink-muted">{entrepreneur.learnerProgress.average}% average</div>
          </div>
        ),
      },
      {
        key: 'followup',
        header: 'Follow-up',
        cell: (entrepreneur) => {
          const followUp = getFollowUp(entrepreneur);
          return <Badge tone={followUp.tone}>{followUp.label}</Badge>;
        },
      },
    ],
    [tools],
  );

  return (
    <>
      <PageHeader title="My Entrepreneurs" description="Entrepreneurs you support, with progress and coaching follow-ups." />

      <MetricGrid columns={4}>
        <StatCard label="My entrepreneurs" value={entrepreneurs.length} subline="Entrepreneurs you support" dotColor="bid" accent="bid" />
        <StatCard label="Need attention" value={needsAttention} subline="Low progress or missing programme access" dotColor="warning" accent="warning" />
        <StatCard label="Avg. progress" value={`${avgTraining}%`} subline="Training completion" dotColor="success" accent="success" />
        <StatCard label="Visible tools" value={visibleToolCount} subline="Across my entrepreneurs" dotColor="info" accent="info" />
      </MetricGrid>

      <Card className="mt-4">
        <CardHeader title="My entrepreneurs" description={`${filtered.length} entrepreneur${filtered.length === 1 ? '' : 's'} in this view`} />
        <TableToolbar>
          <div>
            <div className="text-sm font-medium text-ink">Filter entrepreneurs</div>
            <div className="mt-0.5 text-sm text-ink-muted">Search by business, representative, programme, tool, stage, or sector.</div>
          </div>
          <div className="grid w-full gap-2 lg:w-auto lg:grid-cols-[280px_220px_200px]">
            <TableFilterInput icon placeholder="Search entrepreneurs..." value={query} onChange={(event) => setQuery(event.target.value)} />
            <TableFilterAutocomplete
              value={programmeFilter}
              onValueChange={setProgrammeFilter}
              options={[
                { value: ALL, label: 'All programmes' },
                ...programmeOptions.map((programme) => ({ value: programme.id, label: programme.name })),
              ]}
              placeholder="All programmes"
              searchPlaceholder="Search programmes..."
              emptyMessage="No programme found."
            />
            <TableFilterAutocomplete
              value={followUpFilter}
              onValueChange={(value) => setFollowUpFilter(value as typeof followUpFilter)}
              options={[
                { value: ALL, label: 'All follow-ups' },
                { value: 'On track', label: 'On track' },
                { value: 'Low progress', label: 'Low progress' },
                { value: 'No programme access', label: 'No programme access' },
              ]}
              placeholder="All follow-ups"
              searchPlaceholder="Search follow-ups..."
            />
          </div>
        </TableToolbar>
        {entrepreneursQuery.isLoading || toolsQuery.isLoading ? (
          <TableEmptyState title="Loading entrepreneurs" description="Fetching entrepreneurs and tool access." />
        ) : entrepreneursQuery.isError || toolsQuery.isError ? (
          <TableEmptyState title="Entrepreneurs could not be loaded" description="Refresh the page or try again shortly." />
        ) : (
          <DataTable columns={columns} rows={pageRows} rowKey={(entrepreneur) => entrepreneur.entrepreneurUserId} emptyMessage="No entrepreneurs match this view." tableClassName="min-w-[1320px]" />
        )}
        <TablePagination page={page} pageSize={pageSize} totalItems={filtered.length} onPageChange={setPage} onPageSizeChange={(next) => { setPageSize(next); setPage(1); }} />
      </Card>

      <EntrepreneurProfileModal entrepreneur={viewTarget} tools={tools} open={!!viewTarget} onOpenChange={(open) => !open && setViewTarget(null)} />
    </>
  );
}
