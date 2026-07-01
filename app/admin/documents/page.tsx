'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { FileText, FileSpreadsheet, Upload } from 'lucide-react';
import { PageHeader, Notice } from '@/components/shared/PageHeader';
import { StatCard } from '@/components/shared/StatCard';
import { MetricGrid } from '@/components/shared/MetricGrid';
import { Card, CardHeader } from '@/components/shared/Card';
import { Badge } from '@/components/shared/Badge';
import { Button } from '@/components/shared/Button';
import {
  DataTable,
  RowActions,
  TableFilterInput,
  TableFilterSelect,
  TablePagination,
  TableToolbar,
  type Column,
} from '@/components/shared/DataTable';
import { Modal } from '@/components/shared/Modal';
import { FormField, FormInput, FormSelect } from '@/components/shared/FormField';
import { useAdminStore } from '@/lib/stores/admin-store';
import { documentGeneratorSchema, type DocumentGeneratorForm } from '@/lib/forms/schemas';
import type { DocumentType, PlatformDocument } from '@/types';
import { toast } from 'sonner';

export default function AdminDocumentsPage() {
  const { documents, entrepreneurs, generateDocument } = useAdminStore();
  const [generator, setGenerator] = React.useState<DocumentType | null>(null);
  const [query, setQuery] = React.useState('');
  const [typeFilter, setTypeFilter] = React.useState<'all' | DocumentType>('all');
  const [statusFilter, setStatusFilter] = React.useState<'all' | PlatformDocument['status']>('all');
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(10);

  const draftCount = documents.filter((doc) => doc.status === 'draft').length;
  const finalCount = documents.filter((doc) => doc.status === 'final').length;
  const sentCount = documents.filter((doc) => doc.status === 'sent').length;
  const getSource = React.useCallback(
    (doc: PlatformDocument) =>
      doc.entrepreneurId
        ? entrepreneurs.find((ent) => ent.id === doc.entrepreneurId)?.businessName ?? doc.entrepreneurId
        : doc.cohort ?? 'Programme data',
    [entrepreneurs],
  );
  const filteredDocuments = React.useMemo(() => {
    const needle = query.trim().toLowerCase();
    return documents.filter((doc) => {
      const matchesQuery =
        !needle ||
        [doc.title, doc.type, doc.status, getSource(doc)]
          .join(' ')
          .toLowerCase()
          .includes(needle);
      const matchesType = typeFilter === 'all' || doc.type === typeFilter;
      const matchesStatus = statusFilter === 'all' || doc.status === statusFilter;
      return matchesQuery && matchesType && matchesStatus;
    });
  }, [documents, getSource, query, statusFilter, typeFilter]);
  React.useEffect(() => {
    setPage(1);
  }, [query, statusFilter, typeFilter, pageSize]);
  const pageRows = React.useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredDocuments.slice(start, start + pageSize);
  }, [filteredDocuments, page, pageSize]);

  const columns: Column<PlatformDocument>[] = [
    {
      key: 'actions',
      header: 'Action',
      cell: (doc) => (
        <RowActions
          actions={[
            { label: 'Open document', onSelect: () => toast.success(`Opening ${doc.title}`) },
            { label: 'Download document', onSelect: () => toast.success(`Downloading ${doc.title}`) },
          ]}
        />
      ),
      className: 'w-[84px]',
    },
    { key: 'title', header: 'Document', cell: (doc) => <span className="font-semibold">{doc.title}</span> },
    {
      key: 'type',
      header: 'Type',
      cell: (doc) => <Badge tone={doc.type === 'memo' ? 'brand' : 'green'}>{doc.type === 'memo' ? 'Investment memo' : 'Progress report'}</Badge>,
    },
    {
      key: 'source',
      header: 'Source',
      cell: getSource,
    },
    {
      key: 'generated',
      header: 'Generated',
      cell: (doc) => new Date(doc.generatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
    },
    {
      key: 'status',
      header: 'Status',
      cell: (doc) => (
        <Badge tone={doc.status === 'draft' ? 'amber' : doc.status === 'final' ? 'green' : 'blue'}>
          {doc.status === 'draft' ? 'Draft' : doc.status === 'final' ? 'Final' : 'Sent'}
        </Badge>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Documents"
        description="Generate investment memos and programme reports from platform data"
        actions={
          <Button variant="outline">
            <Upload className="h-4 w-4" />
            Upload template
          </Button>
        }
      />
      <Notice>
        BID needs a document workspace for investor memos, cohort progress reports,
        and funder-ready exports. This UI prepares the workflow before backend
        template generation and storage are connected.
      </Notice>

      <MetricGrid>
        <StatCard label="Drafts" value={draftCount} dotColor="warning" />
        <StatCard label="Final documents" value={finalCount} dotColor="success" />
        <StatCard label="Sent reports" value={sentCount} dotColor="info" />
        <StatCard label="Templates" value="2" dotColor="bid" />
      </MetricGrid>

      <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-2">
        <DocumentActionCard
          icon={<FileText className="h-5 w-5" />}
          title="Investment memo"
          description="Auto-fill memo sections from entrepreneur profile, funding goal, deliverables, and programme history."
          action="Generate memo"
          onClick={() => setGenerator('memo')}
        />
        <DocumentActionCard
          icon={<FileSpreadsheet className="h-5 w-5" />}
          title="Programme progress report"
          description="Create a funder-facing report with training progress, deliverables, jobs, and funding metrics."
          action="Generate report"
          onClick={() => setGenerator('report')}
        />
      </div>

      <Card className="mt-4">
        <CardHeader
          title="Recent documents"
          description={`${filteredDocuments.length} document${filteredDocuments.length === 1 ? '' : 's'} in this view`}
        />
        <TableToolbar>
          <div>
            <div className="text-sm font-medium text-ink">Filter documents</div>
            <div className="mt-0.5 text-sm text-ink-muted">
              Search by document title, source, type, or status.
            </div>
          </div>
          <div className="grid w-full gap-2 sm:w-auto sm:grid-cols-[260px_160px_160px]">
            <TableFilterInput
              icon
              placeholder="Search documents..."
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
            <TableFilterSelect value={typeFilter} onChange={(event) => setTypeFilter(event.target.value as typeof typeFilter)}>
              <option value="all">All types</option>
              <option value="memo">Investment memo</option>
              <option value="report">Progress report</option>
            </TableFilterSelect>
            <TableFilterSelect value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)}>
              <option value="all">All statuses</option>
              <option value="draft">Draft</option>
              <option value="final">Final</option>
              <option value="sent">Sent</option>
            </TableFilterSelect>
          </div>
        </TableToolbar>
        <DataTable columns={columns} rows={pageRows} rowKey={(doc) => doc.id} />
        <TablePagination
          page={page}
          pageSize={pageSize}
          totalItems={filteredDocuments.length}
          onPageChange={setPage}
          onPageSizeChange={(next) => {
            setPageSize(next);
            setPage(1);
          }}
        />
      </Card>

      <DocumentGeneratorModal
        type={generator}
        entrepreneurs={entrepreneurs.map((ent) => ({ id: ent.id, label: ent.businessName }))}
        onClose={() => setGenerator(null)}
        onGenerate={(input) => {
          generateDocument(input);
          setGenerator(null);
        }}
      />
    </>
  );
}

function DocumentActionCard({
  icon,
  title,
  description,
  action,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  action: string;
  onClick: () => void;
}) {
  return (
    <Card>
      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-bid-light text-bid">
        {icon}
      </div>
      <div className="text-base font-semibold">{title}</div>
      <p className="mt-2 text-sm leading-6 text-ink-muted">{description}</p>
      <Button className="mt-4" onClick={onClick}>
        {action}
      </Button>
    </Card>
  );
}

function DocumentGeneratorModal({
  type,
  entrepreneurs,
  onClose,
  onGenerate,
}: {
  type: DocumentType | null;
  entrepreneurs: { id: string; label: string }[];
  onClose: () => void;
  onGenerate: (input: { title: string; type: DocumentType; entrepreneurId?: string; cohort?: string }) => void;
}) {
  const form = useForm<DocumentGeneratorForm>({
    resolver: zodResolver(documentGeneratorSchema),
    defaultValues: {
      title: '',
      entrepreneurId: entrepreneurs[0]?.id ?? '',
      cohort: 'Cohort 6',
    },
  });

  React.useEffect(() => {
    if (!type) return;
    form.reset({
      title: type === 'memo' ? 'New investment memo' : 'New programme progress report',
      entrepreneurId: entrepreneurs[0]?.id ?? '',
      cohort: 'Cohort 6',
    });
  }, [form, type, entrepreneurs]);

  return (
    <Modal
      open={!!type}
      onOpenChange={(open) => !open && onClose()}
      title={type === 'memo' ? 'Generate investment memo' : 'Generate progress report'}
    >
      {type && (
        <form
          onSubmit={form.handleSubmit((values) =>
            onGenerate({
              title: values.title,
              type,
              entrepreneurId: type === 'memo' ? values.entrepreneurId : undefined,
              cohort: type === 'report' ? values.cohort : undefined,
            }),
          )}
        >
          <FormField label="Document title" error={form.formState.errors.title?.message}>
            <FormInput {...form.register('title')} />
          </FormField>
          {type === 'memo' ? (
            <FormField label="Entrepreneur" error={form.formState.errors.entrepreneurId?.message}>
              <FormSelect
                value={form.watch('entrepreneurId') ?? ''}
                onValueChange={(value) => form.setValue('entrepreneurId', value, { shouldValidate: true })}
                options={entrepreneurs.map((ent) => ({ value: ent.id, label: ent.label }))}
              />
            </FormField>
          ) : (
            <FormField label="Cohort" error={form.formState.errors.cohort?.message}>
              <FormInput {...form.register('cohort')} />
            </FormField>
          )}
          <Button type="submit" className="w-full">
            Generate document
          </Button>
        </form>
      )}
    </Modal>
  );
}
