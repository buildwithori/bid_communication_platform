'use client';

import * as React from 'react';
import { ChevronUp, ChevronDown, ChevronsUpDown, X } from 'lucide-react';
import { PageHeader, Notice } from '@/components/shared/PageHeader';
import { StatCard } from '@/components/shared/StatCard';
import { Card, CardHeader } from '@/components/shared/Card';
import { Badge } from '@/components/shared/Badge';
import { Button } from '@/components/shared/Button';
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
      <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
        <StatCard label="Total" value={entrepreneurs.length} />
        <StatCard label="Active" value={active} />
        <StatCard label="Unassigned" value={unassigned} valueClassName="text-bid" />
        <StatCard label="Graduated" value={graduated} />
      </div>

      <Card className="mt-3">
        <CardHeader
          title="All entrepreneurs"
          actions={
            hasFilters ? (
              <button
                onClick={clearFilters}
                className="flex items-center gap-1 text-[11px] font-medium text-bid hover:opacity-80"
              >
                <X className="h-3 w-3" /> Clear all filters
              </button>
            ) : undefined
          }
        />
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-[11px]">
            <thead>
              <tr>
                {cols.map((c) => (
                  <th
                    key={c.key}
                    onClick={() => toggleSort(c.key)}
                    className="cursor-pointer select-none border-b border-line px-2.5 py-2 text-left text-[10px] font-medium text-ink-muted hover:bg-surface-subtle whitespace-nowrap"
                  >
                    <span className="flex items-center gap-1">
                      {c.label}
                      <SortIcon dir={sortCol === c.key ? sortDir : null} />
                    </span>
                  </th>
                ))}
                <th className="border-b border-line px-2.5 py-2" />
              </tr>
              <tr className="bg-surface-subtle">
                {cols.map((c) => (
                  <th key={c.key} className="border-b border-line px-1.5 py-1.5">
                    {c.isSelect ? (
                      <select
                        value={selectFilters[c.key] ?? ''}
                        onChange={(e) => setSelectFilters((f) => ({ ...f, [c.key]: e.target.value }))}
                        className="w-full rounded-md border border-line bg-white px-1.5 py-1 text-[10px] text-ink focus:border-bid focus:outline-none"
                      >
                        <option value="">All</option>
                        {(selectOptions[c.key] ?? []).map((v) => (
                          <option key={v} value={v}>{v}</option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type="text"
                        placeholder="Filter…"
                        value={textFilters[c.key] ?? ''}
                        onChange={(e) => setTextFilters((f) => ({ ...f, [c.key]: e.target.value }))}
                        className="w-full rounded-md border border-line bg-white px-1.5 py-1 text-[10px] text-ink placeholder:text-ink-faint focus:border-bid focus:outline-none"
                      />
                    )}
                  </th>
                ))}
                <th className="border-b border-line px-1.5 py-1.5" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((e) => (
                <tr key={e.id} className="transition-colors hover:bg-surface-subtle">
                  <td className="border-b border-line px-2.5 py-2 font-medium">{e.businessName}</td>
                  <td className="border-b border-line px-2.5 py-2">{e.representative}</td>
                  <td className="border-b border-line px-2.5 py-2">
                    <Badge tone={sectorById[e.sector]?.color ?? 'neutral'}>{sectorById[e.sector]?.label ?? e.sector}</Badge>
                  </td>
                  <td className="border-b border-line px-2.5 py-2">{e.country}</td>
                  <td className="border-b border-line px-2.5 py-2">
                    <Badge tone={stageById[e.stage]?.color ?? 'neutral'}>{stageById[e.stage]?.label ?? e.stage}</Badge>
                  </td>
                  <td className="border-b border-line px-2.5 py-2 whitespace-nowrap">
                    {programById(e.programmeId)?.name ?? <span className="text-ink-faint">—</span>}
                  </td>
                  <td className="border-b border-line px-2.5 py-2">
                    <Badge tone={e.source === 'invited' ? 'brand' : 'neutral'}>
                      {e.source === 'invited' ? 'Invited' : 'Self-registered'}
                    </Badge>
                  </td>
                  <td className="border-b border-line px-2.5 py-2">
                    {e.goal.type === 'fundraising' && e.goal.amountUsd
                      ? `Fundraising $${(e.goal.amountUsd / 1000).toFixed(0)}k`
                      : e.goal.type === 'milestone' ? 'Milestone-based' : 'Programme completion'}
                  </td>
                  <td className="border-b border-line px-2.5 py-2">
                    <Badge tone={e.status === 'active' ? 'green' : e.status === 'unassigned' ? 'red' : 'neutral'}>
                      {e.status === 'active' ? 'Active' : e.status === 'unassigned' ? 'Unassigned' : 'Graduated'}
                    </Badge>
                  </td>
                  <td className="border-b border-line px-2.5 py-2">
                    <div className="flex gap-1">
                      <Button variant="outline" size="sm" onClick={() => setEditTarget(e)}>Edit</Button>
                      {e.status === 'unassigned' ? (
                        <Button size="sm" onClick={() => setAssignTarget(e)}>Assign</Button>
                      ) : (
                        <Button size="sm" onClick={() => setViewTarget(e)}>View</Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={10} className="px-2.5 py-8 text-center text-[11px] text-ink-faint">
                    No entrepreneurs match these filters.{' '}
                    <button onClick={clearFilters} className="font-medium text-bid hover:opacity-80">
                      Clear filters
                    </button>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
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
