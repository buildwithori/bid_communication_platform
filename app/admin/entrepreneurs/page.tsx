'use client';

import * as React from 'react';
import { ChevronUp, ChevronDown, ChevronsUpDown, Search, X } from 'lucide-react';
import { PageHeader, Notice } from '@/components/shared/PageHeader';
import { StatCard } from '@/components/shared/StatCard';
import { MetricGrid } from '@/components/shared/MetricGrid';
import { Card, CardHeader } from '@/components/shared/Card';
import { Badge } from '@/components/shared/Badge';
import { Modal } from '@/components/shared/Modal';
import { ProgrammeAccessList } from '@/components/shared/ProgrammeAccessList';
import { Button } from '@/components/shared/Button';
import {
  TableEmptyState,
  TableFilterAutocomplete,
  TableFilterInput,
  TablePagination,
  TableToolbar,
  RowActions,
} from '@/components/shared/DataTable';
import { EntrepreneurModal } from '@/components/admin/EntrepreneurModal';
import { AssignEntrepreneurModal } from '@/components/admin/AssignEntrepreneurModal';
import { ViewEntrepreneurModal } from '@/components/admin/ViewEntrepreneurModal';
import { ManageEntrepreneurToolsModal } from '@/components/admin/ManageEntrepreneurToolsModal';
import { useAdminStore } from '@/lib/stores/admin-store';
import { tools } from '@/lib/mock-data';
import { programmeGoalTypes, sectorById, stageById } from '@/lib/mock-data/definitions';
import { formatProgrammeAccess, getEntrepreneurAssignedProgrammes } from '@/lib/programme-access';
import { getEntrepreneurToolAccessSource, type EntrepreneurToolAccessSource } from '@/lib/tool-access';
import type { BadgeTone, Entrepreneur } from '@/types';

type SortDir = 'asc' | 'desc' | null;
type ColKey = 'business' | 'rep' | 'sector' | 'country' | 'stage' | 'programme' | 'tools' | 'source' | 'goal' | 'status';

function getColValue(e: Entrepreneur, col: ColKey): string {
  switch (col) {
    case 'business': return e.businessName;
    case 'rep': return e.representative;
    case 'sector': return sectorById[e.sector]?.label ?? e.sector;
    case 'country': return e.country;
    case 'stage': return stageById[e.stage]?.label ?? e.stage;
    case 'programme': return formatProgrammeAccess(e);
    case 'tools': return getEntrepreneurVisibleTools(e).map((tool) => tool.name).join(' ');
    case 'source': return e.source === 'invited' ? 'Invited' : 'Self-registered';
    case 'goal': return goalLabel(e);
    case 'status': return statusLabel(e);
  }
}

function statusLabel(e: Entrepreneur) {
  if (e.status === 'active') return 'Active';
  if (e.status === 'unassigned') return 'Unassigned';
  if (e.status === 'graduated') return 'Graduated';
  return 'Inactive';
}

function goalTypeMeta(type: string) {
  return programmeGoalTypes.find((goalType) => goalType.id === type);
}

function goalLabel(e: Entrepreneur) {
  const meta = goalTypeMeta(e.goal.type);
  if (meta?.requiresTargetAmount && e.goal.amountUsd) {
    return `${meta.label} $${(e.goal.amountUsd / 1000).toFixed(0)}k`;
  }
  return meta?.label ?? e.goal.type;
}

function ProgrammeAccessCell({ entrepreneur }: { entrepreneur: Entrepreneur }) {
  const programmeAccess = getEntrepreneurAssignedProgrammes(entrepreneur);
  return (
    <ProgrammeAccessList
      programmes={programmeAccess}
      maxVisible={2}
      modalTitle={`${entrepreneur.businessName} programme access`}
      className="min-w-[240px] max-w-[320px]"
    />
  );
}

const toolSourceMeta: Record<Exclude<EntrepreneurToolAccessSource, 'none'>, { label: string; tone: BadgeTone }> = {
  global: { label: 'Global', tone: 'green' },
  programme: { label: 'Programme', tone: 'blue' },
  individual: { label: 'Individual', tone: 'brand' },
};

function getEntrepreneurVisibleTools(entrepreneur: Entrepreneur) {
  return tools.filter((tool) => getEntrepreneurToolAccessSource(tool, entrepreneur) !== 'none');
}

function ToolAccessCell({ entrepreneur }: { entrepreneur: Entrepreneur }) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState('');
  const visibleTools = React.useMemo(() => getEntrepreneurVisibleTools(entrepreneur), [entrepreneur]);
  const visible = visibleTools.slice(0, 2);
  const hiddenCount = Math.max(visibleTools.length - visible.length, 0);
  const filteredTools = React.useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return visibleTools;
    return visibleTools.filter((tool) =>
      [tool.name, tool.description, tool.type, getEntrepreneurToolAccessSource(tool, entrepreneur)]
        .join(' ')
        .toLowerCase()
        .includes(needle),
    );
  }, [entrepreneur, query, visibleTools]);

  return (
    <>
      <div className="flex min-w-[260px] max-w-[340px] flex-wrap items-center gap-1.5">
        {visible.map((tool) => (
          <Badge
            key={tool.id}
            tone={tool.type === 'pdf' ? 'blue' : 'green'}
            className="max-w-[170px] truncate"
            title={tool.name}
          >
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

      <Modal open={open} onOpenChange={setOpen} title={`${entrepreneur.businessName} tool access`} width="wide">
        <div className="space-y-4">
          <div className="rounded-xl border border-line bg-surface-subtle px-4 py-3">
            <div className="text-sm font-semibold text-ink">
              {visibleTools.length} tool{visibleTools.length === 1 ? '' : 's'} visible
            </div>
            <div className="mt-1 text-sm text-ink-muted">
              This includes global, programme-based, and individually added tools after any hidden-tool overrides.
            </div>
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

          <div className="max-h-[360px] space-y-2 overflow-y-auto pr-1">
            {filteredTools.map((tool) => {
              const source = getEntrepreneurToolAccessSource(tool, entrepreneur) as Exclude<EntrepreneurToolAccessSource, 'none'>;
              const meta = toolSourceMeta[source];
              return (
                <div key={tool.id} className="rounded-xl border border-line bg-white px-4 py-3">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <div className="font-semibold text-ink">{tool.name}</div>
                      <div className="mt-1 line-clamp-2 text-sm leading-6 text-ink-muted">{tool.description}</div>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        <Badge tone={tool.type === 'pdf' ? 'blue' : 'green'}>{tool.type === 'pdf' ? 'PDF resource' : 'Online tool'}</Badge>
                        <Badge tone={meta.tone}>{meta.label}</Badge>
                      </div>
                    </div>
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
    </>
  );
}

function SortIcon({ dir }: { dir: SortDir }) {
  if (dir === 'asc') return <ChevronUp className="h-3 w-3 text-bid" />;
  if (dir === 'desc') return <ChevronDown className="h-3 w-3 text-bid" />;
  return <ChevronsUpDown className="h-3 w-3 opacity-30" />;
}

type ColDef = { key: ColKey; label: string; isSelect?: boolean; isText?: boolean };
const cols: ColDef[] = [
  { key: 'business', label: 'Business', isText: true },
  { key: 'rep', label: 'Representative', isText: true },
  { key: 'sector', label: 'Sector', isSelect: true },
  { key: 'country', label: 'Country', isSelect: true },
  { key: 'stage', label: 'Stage', isSelect: true },
  { key: 'programme', label: 'Programme access', isSelect: true },
  { key: 'tools', label: 'Tools access', isText: true },
  { key: 'source', label: 'Source', isSelect: true },
  { key: 'goal', label: 'Goal', isText: true },
  { key: 'status', label: 'Status', isSelect: true },
];
const selectCols: ColKey[] = ['sector', 'country', 'stage', 'programme', 'source', 'status'];

export default function AdminEntrepreneursPage() {
  const { entrepreneurs, programs } = useAdminStore();
  const [addOpen, setAddOpen] = React.useState(false);
  const [editTarget, setEditTarget] = React.useState<Entrepreneur | null>(null);
  const [viewTarget, setViewTarget] = React.useState<Entrepreneur | null>(null);
  const [assignTarget, setAssignTarget] = React.useState<Entrepreneur | null>(null);
  const [toolsTarget, setToolsTarget] = React.useState<Entrepreneur | null>(null);

  const [sortCol, setSortCol] = React.useState<ColKey | null>(null);
  const [sortDir, setSortDir] = React.useState<SortDir>(null);
  const [textFilters, setTextFilters] = React.useState<Partial<Record<ColKey, string>>>({});
  const [selectFilters, setSelectFilters] = React.useState<Partial<Record<ColKey, string>>>({});
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(10);

  const selectOptions = React.useMemo<Partial<Record<ColKey, string[]>>>(() => {
    const opts: Partial<Record<ColKey, string[]>> = {};
    for (const col of selectCols) {
      const seen: Record<string, boolean> = {};
      const vals: string[] = [];
      for (const e of entrepreneurs) {
        const v = getColValue(e, col);
        if (v && v !== '—' && !seen[v]) { seen[v] = true; vals.push(v); }
      }
      opts[col] = vals.sort();
    }
    return opts;
  }, [entrepreneurs]);

  const hasFilters = Object.values(textFilters).some(Boolean) || Object.values(selectFilters).some(Boolean);
  const clearFilters = () => { setTextFilters({}); setSelectFilters({}); };

  const filtered = React.useMemo(() => {
    let rows = entrepreneurs.slice();
    for (const [col, val] of Object.entries(textFilters) as [ColKey, string][]) {
      if (!val) continue;
      const q = val.toLowerCase();
      rows = rows.filter((e) => getColValue(e, col).toLowerCase().includes(q));
    }
    for (const [col, val] of Object.entries(selectFilters) as [ColKey, string][]) {
      if (!val) continue;
      rows = rows.filter((e) => getColValue(e, col) === val);
    }
    if (sortCol && sortDir) {
      rows.sort((a, b) => {
        const av = getColValue(a, sortCol);
        const bv = getColValue(b, sortCol);
        if (av === '—') return 1;
        if (bv === '—') return -1;
        return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
      });
    }
    return rows;
  }, [entrepreneurs, textFilters, selectFilters, sortCol, sortDir]);

  React.useEffect(() => {
    setPage(1);
  }, [textFilters, selectFilters, sortCol, sortDir, pageSize]);

  const pageRows = React.useMemo(() => {
    const start = (page - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, page, pageSize]);

  const toggleSort = (col: ColKey) => {
    if (sortCol !== col) { setSortCol(col); setSortDir('asc'); return; }
    if (sortDir === 'asc') { setSortDir('desc'); return; }
    setSortCol(null); setSortDir(null);
  };

  const active = entrepreneurs.filter((e) => e.status === 'active').length;
  const unassigned = entrepreneurs.filter((e) => e.status === 'unassigned').length;
  const withProgrammes = entrepreneurs.filter((e) => getEntrepreneurAssignedProgrammes(e, programs).length > 0).length;

  return (
    <>
      <PageHeader
        title="Entrepreneurs"
        description="Manage entrepreneurs, both admin-invited and self-registered"
        actions={
          <>
            <Button variant="outline" onClick={() => import('sonner').then(({ toast }) => toast.success('Exporting CSV…'))}>
              Export CSV
            </Button>
            <Button onClick={() => setAddOpen(true)}>+ Add entrepreneur</Button>
          </>
        }
      />
      <Notice>
        Entrepreneurs can join two ways: you invite them directly with an initial programme if needed, or they self-register from the website and arrive{' '}
        <strong>without a programme</strong> until you grant one.
      </Notice>
      <MetricGrid>
        <StatCard label="Total" value={entrepreneurs.length} />
        <StatCard label="Active" value={active} />
        <StatCard label="Unassigned" value={unassigned} valueClassName="text-bid" />
        <StatCard label="With programmes" value={withProgrammes} subline="Has at least one programme" dotColor="info" />
      </MetricGrid>

      <Card className="mt-3">
        <CardHeader
          title="All entrepreneurs"
          description={`${filtered.length} of ${entrepreneurs.length} entrepreneurs shown`}
          actions={
            hasFilters ? (
              <button
                onClick={clearFilters}
                className="flex items-center gap-1.5 rounded-lg px-2 py-1 text-sm font-medium text-bid transition-colors hover:bg-bid-light"
              >
                <X className="h-4 w-4" /> Clear filters
              </button>
            ) : undefined
          }
        />
        <TableToolbar>
          <div>
            <div className="text-sm font-medium text-ink">Filter and sort the entrepreneur pipeline</div>
            <div className="mt-0.5 text-sm text-ink-muted">
              Use column filters for quick operational slicing.
            </div>
          </div>
          <div className="text-sm text-ink-muted">
            {hasFilters ? 'Filtered view active' : 'No filters applied'}
          </div>
        </TableToolbar>
        <div className="overflow-hidden rounded-xl border border-black/[0.08] bg-white">
          <div className="overflow-x-auto">
          <table className="w-full min-w-[1460px] border-separate border-spacing-0 text-sm">
            <thead>
              <tr className="bg-surface-subtle/80">
                <th className="whitespace-nowrap border-b border-line px-4 py-3 text-left text-xs font-medium uppercase tracking-[0.04em] text-ink-muted first:pl-5">
                  Action
                </th>
                {cols.map((c) => (
                  <th
                    key={c.key}
                    onClick={() => toggleSort(c.key)}
                    className="cursor-pointer select-none whitespace-nowrap border-b border-line px-4 py-3 text-left text-xs font-medium uppercase tracking-[0.04em] text-ink-muted transition-colors first:pl-5 hover:bg-surface-subtle"
                  >
                    <span className="flex items-center gap-1.5">
                      {c.label}
                      <SortIcon dir={sortCol === c.key ? sortDir : null} />
                    </span>
                  </th>
                ))}
              </tr>
              <tr className="bg-white">
                <th className="border-b border-line px-2 py-2 first:pl-5" />
                {cols.map((c) => (
                  <th key={c.key} className="border-b border-line px-2 py-2 first:pl-5">
                    {c.isSelect ? (
                      <TableFilterAutocomplete
                        value={selectFilters[c.key] ?? ''}
                        onValueChange={(value) => setSelectFilters((f) => ({ ...f, [c.key]: value }))}
                        options={[
                          { value: '', label: 'All' },
                          ...(selectOptions[c.key] ?? []).map((value) => ({ value, label: value })),
                        ]}
                        placeholder="All"
                        searchPlaceholder={`Search ${c.label.toLowerCase()}...`}
                        emptyMessage={`No ${c.label.toLowerCase()} found.`}
                      />
                    ) : (
                      <TableFilterInput
                        type="text"
                        placeholder="Filter…"
                        value={textFilters[c.key] ?? ''}
                        onChange={(e) => setTextFilters((f) => ({ ...f, [c.key]: e.target.value }))}
                      />
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pageRows.map((e) => (
                <tr key={e.id} className="group transition-colors hover:bg-surface-subtle/70">
                  <td className="border-b border-line/80 px-4 py-4 first:pl-5">
                    <RowActions
                      actions={[
                        { label: 'View profile', onSelect: () => setViewTarget(e) },
                        { label: 'Edit entrepreneur', onSelect: () => setEditTarget(e) },
                        { label: 'Manage programmes', onSelect: () => setAssignTarget(e) },
                        { label: 'Manage tools', onSelect: () => setToolsTarget(e) },
                      ]}
                    />
                  </td>
                  <td className="border-b border-line/80 px-4 py-4">
                    <button
                      type="button"
                      onClick={() => setViewTarget(e)}
                      className="rounded-lg text-left font-medium text-ink outline-none transition hover:text-bid focus-visible:ring-2 focus-visible:ring-bid/20"
                    >
                      {e.businessName}
                    </button>
                  </td>
                  <td className="border-b border-line/80 px-4 py-4">{e.representative}</td>
                  <td className="border-b border-line/80 px-4 py-4">
                    <Badge tone={sectorById[e.sector]?.color ?? 'neutral'}>{sectorById[e.sector]?.label ?? e.sector}</Badge>
                  </td>
                  <td className="border-b border-line/80 px-4 py-4">{e.country}</td>
                  <td className="border-b border-line/80 px-4 py-4">
                    <Badge tone={stageById[e.stage]?.color ?? 'neutral'}>{stageById[e.stage]?.label ?? e.stage}</Badge>
                  </td>
                  <td className="whitespace-nowrap border-b border-line/80 px-4 py-4">
                    <ProgrammeAccessCell entrepreneur={e} />
                  </td>
                  <td className="border-b border-line/80 px-4 py-4">
                    <ToolAccessCell entrepreneur={e} />
                  </td>
                  <td className="border-b border-line/80 px-4 py-4">
                    <Badge tone={e.source === 'invited' ? 'brand' : 'neutral'}>
                      {e.source === 'invited' ? 'Invited' : 'Self-registered'}
                    </Badge>
                  </td>
                  <td className="border-b border-line/80 px-4 py-4">
                    {goalLabel(e)}
                  </td>
                  <td className="border-b border-line/80 px-4 py-4">
                    <Badge tone={e.status === 'active' ? 'green' : e.status === 'unassigned' ? 'red' : 'neutral'}>
                      {statusLabel(e)}
                    </Badge>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={11} className="px-5 py-8">
                    <TableEmptyState
                      title="No entrepreneurs match these filters"
                      description="Clear the active filters or adjust the column search."
                      action={
                        <Button variant="outline" size="sm" onClick={clearFilters}>
                          Clear filters
                        </Button>
                      }
                    />
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
          totalItems={filtered.length}
          onPageChange={setPage}
          onPageSizeChange={(nextPageSize) => {
            setPageSize(nextPageSize);
            setPage(1);
          }}
        />
      </Card>

      <EntrepreneurModal open={addOpen} onOpenChange={setAddOpen} mode="add" />
      {editTarget && (
        <EntrepreneurModal
          open={!!editTarget}
          onOpenChange={(o) => !o && setEditTarget(null)}
          mode="edit"
          entrepreneur={editTarget}
        />
      )}
      {viewTarget && (
        <ViewEntrepreneurModal
          open={!!viewTarget}
          onOpenChange={(o) => !o && setViewTarget(null)}
          entrepreneur={viewTarget}
          onEdit={(e) => { setViewTarget(null); setEditTarget(e); }}
          onAssign={(e) => { setViewTarget(null); setAssignTarget(e); }}
          onManageTools={(e) => { setViewTarget(null); setToolsTarget(e); }}
        />
      )}
      {assignTarget && (
        <AssignEntrepreneurModal
          open={!!assignTarget}
          onOpenChange={(o) => !o && setAssignTarget(null)}
          entrepreneur={assignTarget}
        />
      )}
      {toolsTarget && (
        <ManageEntrepreneurToolsModal
          open={!!toolsTarget}
          onOpenChange={(o) => !o && setToolsTarget(null)}
          entrepreneur={toolsTarget}
        />
      )}
    </>
  );
}
