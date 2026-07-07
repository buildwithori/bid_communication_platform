'use client';

import * as React from 'react';
import { ChevronUp, ChevronDown, ChevronsUpDown, X } from 'lucide-react';
import { PageHeader, Notice } from '@/components/shared/PageHeader';
import { StatCard } from '@/components/shared/StatCard';
import { MetricGrid } from '@/components/shared/MetricGrid';
import { Card, CardHeader } from '@/components/shared/Card';
import { Badge } from '@/components/shared/Badge';
import { Button } from '@/components/shared/Button';
import {
  TableEmptyState,
  TableFilterInput,
  TableFilterSelect,
  TablePagination,
  TableToolbar,
  RowActions,
} from '@/components/shared/DataTable';
import { EntrepreneurModal } from '@/components/admin/EntrepreneurModal';
import { AssignEntrepreneurModal } from '@/components/admin/AssignEntrepreneurModal';
import { ViewEntrepreneurModal } from '@/components/admin/ViewEntrepreneurModal';
import { useAdminStore } from '@/lib/stores/admin-store';
import { sectorById, stageById } from '@/lib/mock-data/definitions';
import { programById } from '@/lib/mock-data/programs';
import type { Entrepreneur } from '@/types';

type SortDir = 'asc' | 'desc' | null;
type ColKey = 'business' | 'rep' | 'sector' | 'country' | 'stage' | 'programme' | 'source' | 'goal' | 'status';

function getColValue(e: Entrepreneur, col: ColKey): string {
  switch (col) {
    case 'business': return e.businessName;
    case 'rep': return e.representative;
    case 'sector': return sectorById[e.sector]?.label ?? e.sector;
    case 'country': return e.country;
    case 'stage': return stageById[e.stage]?.label ?? e.stage;
    case 'programme': return programById(e.programmeId)?.name ?? '—';
    case 'source': return e.source === 'invited' ? 'Invited' : 'Self-registered';
    case 'goal': return e.goal.type === 'fundraising' && e.goal.amountUsd
      ? `Fundraising $${(e.goal.amountUsd / 1000).toFixed(0)}k`
      : e.goal.type === 'milestone' ? 'Milestone' : 'Programme';
    case 'status': return e.status === 'active' ? 'Active' : e.status === 'unassigned' ? 'Unassigned' : 'Graduated';
  }
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
  { key: 'programme', label: 'Programme', isSelect: true },
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
  const graduated = entrepreneurs.filter((e) => e.status === 'graduated').length;

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
        Entrepreneurs can join two ways: you invite them directly (auto-assigned if you
        choose), or they self-register from the website and arrive{' '}
        <strong>unassigned</strong> until you assign them to a programme.
      </Notice>
      <MetricGrid>
        <StatCard label="Total" value={entrepreneurs.length} />
        <StatCard label="Active" value={active} />
        <StatCard label="Unassigned" value={unassigned} valueClassName="text-bid" />
        <StatCard label="Graduated" value={graduated} />
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
          <table className="w-full min-w-[1240px] border-separate border-spacing-0 text-sm">
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
                      <TableFilterSelect
                        value={selectFilters[c.key] ?? ''}
                        onChange={(e) => setSelectFilters((f) => ({ ...f, [c.key]: e.target.value }))}
                      >
                        <option value="">All</option>
                        {(selectOptions[c.key] ?? []).map((v) => (
                          <option key={v} value={v}>{v}</option>
                        ))}
                      </TableFilterSelect>
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
                        ...(e.status === 'unassigned'
                          ? [{ label: 'Assign to programme', onSelect: () => setAssignTarget(e) }]
                          : []),
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
                    {programById(e.programmeId)?.name ?? <span className="text-ink-faint">—</span>}
                  </td>
                  <td className="border-b border-line/80 px-4 py-4">
                    <Badge tone={e.source === 'invited' ? 'brand' : 'neutral'}>
                      {e.source === 'invited' ? 'Invited' : 'Self-registered'}
                    </Badge>
                  </td>
                  <td className="border-b border-line/80 px-4 py-4">
                    {e.goal.type === 'fundraising' && e.goal.amountUsd
                      ? `Fundraising $${(e.goal.amountUsd / 1000).toFixed(0)}k`
                      : e.goal.type === 'milestone' ? 'Milestone-based' : 'Programme completion'}
                  </td>
                  <td className="border-b border-line/80 px-4 py-4">
                    <Badge tone={e.status === 'active' ? 'green' : e.status === 'unassigned' ? 'red' : 'neutral'}>
                      {e.status === 'active' ? 'Active' : e.status === 'unassigned' ? 'Unassigned' : 'Graduated'}
                    </Badge>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={10} className="px-5 py-8">
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
        />
      )}
      {assignTarget && (
        <AssignEntrepreneurModal
          open={!!assignTarget}
          onOpenChange={(o) => !o && setAssignTarget(null)}
          entrepreneur={assignTarget}
        />
      )}
    </>
  );
}
