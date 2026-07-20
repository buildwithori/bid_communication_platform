'use client';

import { useDebouncedValue } from '@/lib/search';
import * as React from 'react';
import { useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { FileText, PlayCircle, Wrench } from 'lucide-react';
import {
  AttachContentItemModal,
  CreateContentItemModal,
  EditContentItemModal,
} from '@/components/admin/content/ContentItemModals';
import { Badge } from '@/components/shared/Badge';
import { Button } from '@/components/shared/Button';
import { Card, CardHeader, TableSkeleton } from '@/components/shared/Card';
import {
  DataTable,
  RowActions,
  TableFilterInput,
  TablePagination,
  TableToolbar,
  type Column,
} from '@/components/shared/DataTable';
import { DestructiveActionModal } from '@/components/shared/DestructiveActionModal';
import { Notice, PageHeader } from '@/components/shared/PageHeader';
import { Tabs } from '@/components/shared/Tabs';
import {
  useContentItemsPage,
  useDeleteContentItemMutation,
  type ContentItemRecord,
  type ContentItemStatus,
  type ContentItemType,
} from '@/lib/api/content';

const typeMeta = {
  video: {
    label: 'Video',
    plural: 'Videos',
    icon: PlayCircle,
    tone: 'blue',
  },
  pdf: {
    label: 'PDF',
    plural: 'PDFs',
    icon: FileText,
    tone: 'neutral',
  },
  tool: {
    label: 'Tool',
    plural: 'Tools',
    icon: Wrench,
    tone: 'brand',
  },
} as const;

export default function AdminContentPage() {
  return (
    <React.Suspense fallback={<ContentLibrarySkeleton />}>
      <ContentLibrary />
    </React.Suspense>
  );
}

function ContentLibrary() {
  const searchParams = useSearchParams();
  const moduleId = searchParams.get('moduleId') ?? undefined;
  const [tab, setTab] = React.useState<ContentItemType>('video');
  const [query, setQuery] = React.useState('');
  const debouncedQuery = useDebouncedValue(query);
  const [pageSize, setPageSize] = React.useState(10);
  const [createOpen, setCreateOpen] = React.useState(false);
  const [editTarget, setEditTarget] =
    React.useState<ContentItemRecord | null>(null);
  const [attachTarget, setAttachTarget] =
    React.useState<ContentItemRecord | null>(null);
  const [deleteTarget, setDeleteTarget] =
    React.useState<ContentItemRecord | null>(null);
  const deleteContent = useDeleteContentItemMutation({
    onSuccess: () => {
      setDeleteTarget(null);
      toast.success('Content deleted.');
    },
    onError: (error) => toast.error(error.message),
  });

  const content = useContentItemsPage({
    type: tab,
    search: debouncedQuery.trim() || undefined,
    moduleId,
    take: pageSize,
  });
  const resetPagination = content.resetPagination;

  React.useEffect(() => {
    resetPagination();
  }, [debouncedQuery, moduleId, pageSize, resetPagination, tab]);

  const columns = React.useMemo<Column<ContentItemRecord>[]>(
    () => [
      {
        key: 'actions',
        header: 'Action',
        cell: (item) => (
          <RowActions
            actions={[
              {
                label: 'Edit content',
                onSelect: () => setEditTarget(item),
              },
              {
                label: 'Add to another module',
                onSelect: () => setAttachTarget(item),
              },
              {
                label: 'Delete content',
                destructive: true,
                disabled: deleteContent.isPending,
                onSelect: () => setDeleteTarget(item),
              },
            ]}
          />
        ),
        className: 'w-[84px]',
      },
      {
        key: 'title',
        header: 'Content',
        cell: (item) => {
          const meta = typeMeta[item.type];
          const Icon = meta.icon;
          return (
            <div className="flex min-w-[280px] items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-surface-subtle text-bid">
                <Icon className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <div className="font-semibold text-ink">{item.title}</div>
                <div className="mt-1 flex flex-wrap items-center gap-1.5">
                  <Badge tone={meta.tone}>{meta.label}</Badge>
                  <StatusBadge status={item.status} />
                </div>
              </div>
            </div>
          );
        },
      },
      {
        key: 'owner',
        header: 'Trainer owner',
        cell: (item) =>
          item.trainer ? (
            <div className="min-w-[190px]">
              <div className="font-medium text-ink">{item.trainer.name}</div>
              <div className="mt-0.5 text-xs text-ink-muted">
                {item.trainer.email}
              </div>
            </div>
          ) : (
            <span className="text-sm text-ink-muted">Not assigned</span>
          ),
      },
      {
        key: 'source',
        header: 'Asset',
        cell: (item) => (
          <div className="min-w-[180px] text-sm">
            <div className="font-medium text-ink">{sourceLabel(item)}</div>
            <div className="mt-1 text-xs text-ink-muted">
              {item.durationLabel ?? updatedLabel(item.updatedAt)}
            </div>
          </div>
        ),
      },
      {
        key: 'usage',
        header: 'Used in',
        cell: (item) => (
          <div className="min-w-[180px]">
            <div className="font-medium text-ink">
              {item.usage.modules} module
              {item.usage.modules === 1 ? '' : 's'}
            </div>
            <div className="mt-1 text-xs text-ink-muted">
              Across {item.usage.programmes} programme
              {item.usage.programmes === 1 ? '' : 's'}
            </div>
          </div>
        ),
      },
    ],
    [deleteContent.isPending],
  );

  return (
    <>
      <PageHeader
        title="Content library"
        description="Upload once, reuse across programme modules, and keep trainer attribution in one place."
        actions={
          <Button onClick={() => setCreateOpen(true)}>+ Upload content</Button>
        }
      />

      {moduleId ? (
        <Notice className="mb-4">
          Showing content attached to the selected module. Uploading from this
          view adds the new item directly to that module.
        </Notice>
      ) : null}

      <Tabs
        value={tab}
        onChange={setTab}
        tabs={[
          {
            value: 'video',
            label: `Videos (${content.summary.video})`,
          },
          {
            value: 'pdf',
            label: `PDFs (${content.summary.pdf})`,
          },
          {
            value: 'tool',
            label: `Tools (${content.summary.tool})`,
          },
        ]}
      />

      <Card>
        <CardHeader
          title={`${typeMeta[tab].plural} content`}
          description={`${content.totalItems} reusable asset${content.totalItems === 1 ? '' : 's'} found`}
        />
        <TableToolbar>
          <div>
            <div className="text-sm font-medium text-ink">
              Find content quickly
            </div>
            <div className="mt-0.5 text-sm text-ink-muted">
              Search by title or trainer. Filtering and counts run on the
              backend.
            </div>
          </div>
          <div className="w-full sm:w-[340px]">
            <TableFilterInput
              icon
              placeholder="Search content..."
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>
        </TableToolbar>

        {content.isLoading && !content.data ? (
          <TableSkeleton columns={5} rows={pageSize} />
        ) : content.isError ? (
          <Notice>
            Content could not be loaded. {content.error.message}
          </Notice>
        ) : (
          <DataTable
            columns={columns}
            rows={content.rows}
            rowKey={(item) => item.id}
            emptyMessage={
              query
                ? 'No content matches this search.'
                : `No ${typeMeta[tab].plural.toLowerCase()} have been added yet.`
            }
            tableClassName="min-w-[1040px]"
          />
        )}

        <TablePagination
          page={content.page}
          pageSize={pageSize}
          totalItems={content.totalItems}
          pageSizeOptions={[10, 20, 50]}
          onPageChange={content.setPage}
          onPageSizeChange={setPageSize}
        />
      </Card>

      <CreateContentItemModal
        open={createOpen}
        onOpenChange={setCreateOpen}
        initialModuleId={moduleId}
      />
      <EditContentItemModal
        item={editTarget}
        onOpenChange={(open) => {
          if (!open) setEditTarget(null);
        }}
      />
      <AttachContentItemModal
        item={attachTarget}
        onOpenChange={(open) => {
          if (!open) setAttachTarget(null);
        }}
      />
      <DestructiveActionModal
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        title="Delete content"
        resourceName={deleteTarget?.title ?? ""}
        description="This permanently removes the content item from the BID Hub content library and every module that uses it."
        consequences={[
          (deleteTarget?.usage.modules ?? 0) +
            " module" +
            (deleteTarget?.usage.modules === 1 ? "" : "s") +
            " will lose this content.",
          "Learner progress and ratings for this content will be permanently deleted.",
          deleteTarget?.type === "tool"
            ? "Any linked tool remains available; only this learning content link is deleted."
            : "The uploaded media file will also be permanently deleted.",
        ]}
        confirmLabel="Delete content"
        isPending={deleteContent.isPending}
        onConfirm={async () => {
          if (!deleteTarget) return;
          await deleteContent.mutateAsync({
            contentItemId: deleteTarget.id,
            confirmation: deleteTarget.title,
          });
        }}
      />
    </>
  );
}

function StatusBadge({ status }: { status: ContentItemStatus }) {
  const tones = {
    draft: 'neutral',
    processing: 'amber',
    ready: 'green',
    failed: 'red',
    archived: 'red',
  } as const;
  return (
    <Badge tone={tones[status]}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </Badge>
  );
}

function sourceLabel(item: ContentItemRecord) {
  if (item.type === 'video') {
    return item.video?.status === 'ready' ? 'Video ready' : 'Video processing';
  }
  if (item.type === 'pdf') {
    return item.file?.originalFilename ?? 'PDF asset';
  }
  return item.toolLink?.toolName ?? item.toolLink?.url ?? 'Embedded tool';
}

function updatedLabel(value: string) {
  return `Updated ${new Date(value).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })}`;
}

function ContentLibrarySkeleton() {
  return (
    <>
      <PageHeader
        title="Content library"
        description="Upload once, reuse across programme modules, and keep trainer attribution in one place."
      />
      <div className="mb-4 h-10 w-full max-w-md animate-pulse rounded-xl bg-surface-subtle" />
      <Card>
        <TableSkeleton columns={5} rows={10} />
      </Card>
    </>
  );
}
