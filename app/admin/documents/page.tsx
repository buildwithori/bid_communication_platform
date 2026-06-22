'use client';

import * as React from 'react';
import { FileText } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardHeader } from '@/components/shared/Card';
import { Badge } from '@/components/shared/Badge';
import { Button } from '@/components/shared/Button';
import { Modal } from '@/components/shared/Modal';
import { FormField, FormSelect } from '@/components/shared/FormField';
import { Notice } from '@/components/shared/PageHeader';
import { DataTable, type Column } from '@/components/shared/DataTable';
import { useAdminStore } from '@/lib/stores/admin-store';
import { entrepreneurs } from '@/lib/mock-data/entrepreneurs';
import { toast } from 'sonner';
import type { PlatformDocument } from '@/types';

const docCards = [
  {
    id: 'template',
    iconKey: 'template',
    bg: 'bg-bid-light',
    fg: 'text-bid',
    title: 'Investment memo template',
    desc: 'Upload your standard memo template — generated memos follow this structure automatically.',
    button: 'Manage template',
    variant: 'outline' as const,
  },
  {
    id: 'gen-memo',
    iconKey: 'memo',
    bg: 'bg-info-light',
    fg: 'text-info',
    title: 'Generate investment memo',
    desc: "Auto-fill the template with an entrepreneur's profile, financials and programme data — then edit by hand.",
    button: 'Generate memo',
    variant: 'info' as const,
  },
  {
    id: 'gen-prog',
    iconKey: 'prog',
    bg: 'bg-success-light',
    fg: 'text-success',
    title: 'Progress report',
    desc: 'Generate a cohort-level or individual progress report for donors, board and programme team.',
    button: 'Generate report',
    variant: 'success' as const,
  },
];

export default function AdminDocumentsPage() {
  const { documents, generateDocument } = useAdminStore();
  const [memoOpen, setMemoOpen] = React.useState(false);
  const [reportOpen, setReportOpen] = React.useState(false);
  const [templateOpen, setTemplateOpen] = React.useState(false);

  const [memoEnt, setMemoEnt] = React.useState(entrepreneurs[0]?.id ?? '');
  const [memoTemplate, setMemoTemplate] = React.useState('standard');
  const [reportScope, setReportScope] = React.useState('cohort');
  const [reportPeriod, setReportPeriod] = React.useState('Q1');
  const [reportInclude, setReportInclude] = React.useState('full');

  const columns: Column<PlatformDocument>[] = [
    { key: 'title', header: 'Document', cell: (d) => d.title },
    {
      key: 'type',
      header: 'Type',
      cell: (d) => <Badge tone={d.type === 'memo' ? 'brand' : 'green'}>{d.type === 'memo' ? 'Memo' : 'Report'}</Badge>,
    },
    {
      key: 'ent',
      header: 'Entrepreneur',
      cell: (d) =>
        d.entrepreneurId
          ? entrepreneurs.find((e) => e.id === d.entrepreneurId)?.representative ?? '—'
          : d.cohort ?? '—',
    },
    {
      key: 'gen',
      header: 'Generated',
      cell: (d) => new Date(d.generatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
    },
    {
      key: 'status',
      header: 'Status',
      cell: (d) => {
        const tone = d.status === 'final' ? 'green' : d.status === 'draft' ? 'amber' : 'brand';
        const label = d.status === 'final' ? 'Final' : d.status === 'draft' ? 'Draft' : 'Sent';
        return <Badge tone={tone}>{label}</Badge>;
      },
    },
    {
      key: 'actions',
      header: '',
      cell: () => (
        <Button variant="outline" size="sm" onClick={() => toast.success('Downloading (demo)…')}>
          Download
        </Button>
      ),
    },
  ];

  return (
    <>
      <PageHeader title="Generate documents" description="Upload templates, then auto-generate documents from entrepreneur data" />
      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
        {docCards.map((c) => (
          <Card key={c.id} className="cursor-pointer transition-colors hover:border-bid" onClick={() => {
            if (c.id === 'template') setTemplateOpen(true);
            else if (c.id === 'gen-memo') setMemoOpen(true);
            else setReportOpen(true);
          }}>
            <div className={`mb-2.5 flex h-[38px] w-[38px] items-center justify-center rounded-[9px] ${c.bg}`}>
              <FileText className={`h-[18px] w-[18px] ${c.fg}`} strokeWidth={1.5} />
            </div>
            <div className="mb-1 text-xs font-medium">{c.title}</div>
            <div className="mb-2.5 text-[10px] leading-relaxed text-ink-muted">{c.desc}</div>
            <Button variant={c.variant} className="w-full" size="sm">
              {c.button}
            </Button>
          </Card>
        ))}
      </div>
      <Card className="mt-3">
        <CardHeader title="Recent documents" />
        <DataTable columns={columns} rows={documents} rowKey={(d) => d.id} emptyMessage="No documents generated yet." />
      </Card>

      {/* Generate memo */}
      <Modal open={memoOpen} onOpenChange={setMemoOpen} title="Generate investment memo" width="md">
        <FormField label="Entrepreneur">
          <FormSelect
            value={memoEnt}
            onValueChange={setMemoEnt}
            options={entrepreneurs.map((e) => ({
              value: e.id,
              label: `${e.businessName} – ${e.representative}`,
            }))}
          />
        </FormField>
        <FormField label="Template">
          <FormSelect
            value={memoTemplate}
            onValueChange={setMemoTemplate}
            options={[
              { value: 'standard', label: 'BID Standard Investment Memo v3' },
              { value: 'grant', label: 'Grant Application Memo' },
            ]}
          />
        </FormField>
        <Notice>
          Generated using the uploaded template. The result is a fully editable document —
          auto-filled fields draw from this entrepreneur&apos;s profile, deliverables and
          programme history.
        </Notice>
        <Button
          className="w-full"
          onClick={() => {
            const ent = entrepreneurs.find((e) => e.id === memoEnt);
            generateDocument({
              title: `${ent?.businessName ?? 'Entrepreneur'} – Investment Memo`,
              type: 'memo',
              entrepreneurId: memoEnt,
            });
            setMemoOpen(false);
          }}
        >
          Generate memo
        </Button>
      </Modal>

      {/* Manage template */}
      <Modal open={templateOpen} onOpenChange={setTemplateOpen} title="Manage investment memo template">
        <FormField label="Current template">
          <div className="rounded-[7px] bg-surface-subtle px-2.5 py-2 text-[11px]">
            BID Standard Investment Memo v3.docx
          </div>
        </FormField>
        <button
          type="button"
          onClick={() => toast.info('File picker opened (demo)')}
          className="mb-3 flex w-full flex-col items-center rounded-bid border-[1.5px] border-dashed border-line-strong px-5 py-5 text-center transition-colors hover:border-bid hover:bg-bid-light"
        >
          <span className="text-[11px] text-ink-muted">Upload a new template (.docx)</span>
          <strong className="mt-0.5 text-[11px] text-bid">
            Use merge fields like {'{{business_name}}'}, {'{{stage}}'}, {'{{ask}}'}
          </strong>
        </button>
        <Button className="w-full" onClick={() => { setTemplateOpen(false); toast.success('Template updated!'); }}>
          Save template
        </Button>
      </Modal>

      {/* Generate report */}
      <Modal open={reportOpen} onOpenChange={setReportOpen} title="Generate progress report">
        <FormField label="Report scope">
          <FormSelect
            value={reportScope}
            onValueChange={setReportScope}
            options={[
              { value: 'cohort', label: 'Cohort 6 – full cohort' },
              { value: 'individual', label: 'Individual entrepreneur' },
              { value: 'programme', label: 'Programme-wide summary' },
            ]}
          />
        </FormField>
        <FormField label="Period">
          <FormSelect
            value={reportPeriod}
            onValueChange={setReportPeriod}
            options={[
              { value: 'Q1', label: 'Q1 2025 (Jan–Mar)' },
              { value: 'Q2', label: 'Q2 2025 (Apr–Jun)' },
            ]}
          />
        </FormField>
        <FormField label="Include">
          <FormSelect
            value={reportInclude}
            onValueChange={setReportInclude}
            options={[
              { value: 'full', label: 'Training + deliverables + jobs/funding' },
              { value: 'training', label: 'Training + deliverables only' },
              { value: 'funding', label: 'Jobs/funding only' },
            ]}
          />
        </FormField>
        <Button
          variant="success"
          className="w-full"
          onClick={() => {
            generateDocument({
              title: `Cohort 6 – ${reportPeriod} Progress Report`,
              type: 'report',
              cohort: 'Cohort 6',
            });
            setReportOpen(false);
          }}
        >
          Generate report
        </Button>
      </Modal>
    </>
  );
}
