"use client";

import { useDebouncedValue } from "@/lib/search";
import * as React from "react";
import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  FileSpreadsheet,
  FileText,
  GripVertical,
  PlayCircle,
  Wrench,
} from "lucide-react";
import { toast } from "sonner";
import {
  CreateContentItemModal,
  EditContentItemModal,
} from "@/components/admin/content/ContentItemModals";
import { MoveModulePositionModal } from "@/components/admin/programmes/MoveModulePositionModal";
import { Badge } from "@/components/shared/Badge";
import { Button } from "@/components/shared/Button";
import { Skeleton } from "@/components/shared/Card";
import {
  FormAutocomplete,
  FormField,
  FormInput,
} from "@/components/shared/FormField";
import { DestructiveActionModal } from "@/components/shared/DestructiveActionModal";
import { Modal } from "@/components/shared/Modal";
import { Notice } from "@/components/shared/PageHeader";
import {
  useAttachContentItemMutation,
  useDeleteContentItemMutation,
  useLazyReusableContentItems,
  useModuleContentItemsInfinite,
  useMoveModuleContentItemMutation,
  type ContentItemRecord,
} from "@/lib/api/content";
import { cn } from "@/lib/utils";

type ModuleSummary = { id: string; title: string };

const typeMeta = {
  video: { label: "Video", icon: PlayCircle, tone: "blue" },
  pdf: { label: "PDF", icon: FileText, tone: "neutral" },
  excel: { label: "Excel", icon: FileSpreadsheet, tone: "green" },
  tool: { label: "Tool", icon: Wrench, tone: "green" },
} as const;

export function ProgrammeContentModal({
  open,
  onOpenChange,
  module,
  readOnly = false,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  module: ModuleSummary | null;
  readOnly?: boolean;
}) {
  const [createOpen, setCreateOpen] = React.useState(false);
  const [reuseOpen, setReuseOpen] = React.useState(false);
  const [editItem, setEditItem] = React.useState<ContentItemRecord | null>(
    null,
  );
  const [moveItem, setMoveItem] = React.useState<ContentItemRecord | null>(
    null,
  );
  const [deleteItem, setDeleteItem] = React.useState<ContentItemRecord | null>(
    null,
  );
  const [search, setSearch] = React.useState("");
  const debouncedSearch = useDebouncedValue(search);
  const items = useModuleContentItemsInfinite(module?.id ?? "", {
    enabled: open && Boolean(module),
    search: debouncedSearch.trim() || undefined,
    take: 20,
  });
  const deleteContent = useDeleteContentItemMutation({
    onSuccess: () => {
      setDeleteItem(null);
      toast.success("Content deleted.");
    },
    onError: (error) => toast.error(error.message),
  });
  const move = useMoveModuleContentItemMutation({
    onSuccess: () => toast.success("Content position updated."),
    onError: (error) => toast.error(error.message),
  });
  const canReorder = !readOnly && !debouncedSearch.trim() && !move.isPending;
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  if (!module) return null;

  const handleDragEnd = (event: DragEndEvent) => {
    if (!canReorder || !event.over || event.active.id === event.over.id) return;
    const target = items.rows.find((item) => item.id === event.over?.id);
    if (!target?.usage.position) return;
    move.mutate({
      moduleId: module.id,
      contentItemId: String(event.active.id),
      position: target.usage.position,
    });
  };

  return (
    <>
      <Modal
        open={open}
        onOpenChange={(nextOpen) => {
          if (!move.isPending) onOpenChange(nextOpen);
        }}
        title={`Manage content: ${module.title}`}
        width="xl"
      >
        <div className="space-y-4">
          <div className="rounded-xl border border-line bg-surface-subtle p-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className="font-semibold text-ink">Content sequence</div>
                <p className="mt-1 text-sm leading-6 text-ink-muted">
                  Add, reuse, and order the learning assets entrepreneurs see in
                  this module.
                </p>
              </div>
              {!readOnly ? (
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setReuseOpen(true)}
                  >
                    Reuse from library
                  </Button>
                  <Button size="sm" onClick={() => setCreateOpen(true)}>
                    + Upload new
                  </Button>
                </div>
              ) : null}
            </div>
            <div className="mt-3">
              <FormInput
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search module content..."
                aria-label="Search module content"
              />
              {search ? (
                <p className="mt-2 text-xs text-ink-muted">
                  Clear search to reorder the sequence.
                </p>
              ) : null}
            </div>
          </div>

          {items.isLoading && !items.data ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }, (_, index) => (
                <Skeleton key={index} className="h-24" />
              ))}
            </div>
          ) : items.isError ? (
            <Notice>Content could not be loaded. {items.error.message}</Notice>
          ) : items.rows.length ? (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={items.rows.map((item) => item.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="max-h-[52vh] space-y-2 overflow-y-auto pr-1">
                  {items.rows.map((item) => (
                    <ContentSequenceItem
                      key={item.id}
                      item={item}
                      canReorder={canReorder}
                      readOnly={readOnly}
                      onEdit={() => setEditItem(item)}
                      onMove={() => setMoveItem(item)}
                      onDelete={() => setDeleteItem(item)}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          ) : (
            <div className="rounded-xl border border-dashed border-line-strong bg-surface-subtle px-5 py-10 text-center">
              <div className="font-semibold text-ink">
                {search ? "No matching content" : "No content items yet"}
              </div>
              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-ink-muted">
                {search
                  ? "Try a different search."
                  : "Upload a video or PDF, add an embedded tool, or reuse an existing library item."}
              </p>
            </div>
          )}

          {items.hasNextPage ? (
            <Button
              variant="outline"
              className="w-full"
              isLoading={items.isFetchingNextPage}
              loadingLabel="Loading more..."
              onClick={() => void items.fetchNextPage()}
            >
              Load more content
            </Button>
          ) : null}
          <div className="text-center text-xs text-ink-muted">
            Showing {items.rows.length} of {items.totalItems} content items
          </div>
        </div>
      </Modal>

      <CreateContentItemModal
        open={createOpen}
        onOpenChange={setCreateOpen}
        initialModuleId={module.id}
      />
      <ReuseModuleContentModal
        open={reuseOpen}
        onOpenChange={setReuseOpen}
        module={module}
      />
      <EditContentItemModal
        item={editItem}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) setEditItem(null);
        }}
      />
      <MoveModulePositionModal
        key={moveItem?.id ?? "closed"}
        open={Boolean(moveItem)}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) setMoveItem(null);
        }}
        module={moveItem}
        program={{ name: module.title }}
        currentPosition={moveItem?.usage.position ?? 0}
        totalModules={items.totalItems}
        isPending={move.isPending}
        onMove={async (position) => {
          if (!moveItem) return;
          await move.mutateAsync({
            moduleId: module.id,
            contentItemId: moveItem.id,
            position,
          });
        }}
      />
      <DestructiveActionModal
        open={Boolean(deleteItem)}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) setDeleteItem(null);
        }}
        title="Delete content"
        resourceName={deleteItem?.title ?? ""}
        description="This permanently removes the content from the library and every module that reuses it."
        consequences={[
          "The content will disappear from all modules and programmes that currently use it.",
          "Learner progress and ratings for this content will be permanently deleted.",
          deleteItem?.type === "tool"
            ? "Any linked tool remains available; only this learning content item is deleted."
            : "The uploaded media file will also be permanently deleted.",
        ]}
        confirmLabel="Delete content"
        isPending={deleteContent.isPending}
        onConfirm={async () => {
          if (!deleteItem) return;
          await deleteContent.mutateAsync({
            contentItemId: deleteItem.id,
            confirmation: deleteItem.title,
          });
        }}
      />
    </>
  );
}

function ContentSequenceItem({
  item,
  canReorder,
  readOnly,
  onEdit,
  onMove,
  onDelete,
}: {
  item: ContentItemRecord;
  canReorder: boolean;
  readOnly: boolean;
  onEdit: () => void;
  onMove: () => void;
  onDelete: () => void;
}) {
  const meta = typeMeta[item.type];
  const Icon = meta.icon;
  const {
    attributes,
    listeners,
    setActivatorNodeRef,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id, disabled: !canReorder });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        "flex flex-col gap-3 rounded-xl border border-line bg-card p-3 shadow-sm sm:flex-row sm:items-center",
        isDragging && "relative z-10 border-bid/30 shadow-xl",
      )}
    >
      <div className="flex min-w-0 flex-1 items-start gap-3">
        <button
          ref={setActivatorNodeRef}
          type="button"
          disabled={!canReorder}
          {...attributes}
          {...listeners}
          className="inline-flex h-9 w-9 shrink-0 cursor-grab items-center justify-center rounded-lg border border-line bg-surface-subtle text-ink-muted disabled:cursor-not-allowed disabled:opacity-45"
          aria-label={`Reorder ${item.title}`}
        >
          <GripVertical className="h-4 w-4" />
        </button>
        <span className="inline-flex h-9 min-w-9 items-center justify-center rounded-lg bg-bid-light px-2 text-xs font-semibold text-bid">
          {item.usage.position ?? "-"}
        </span>
        <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-surface-subtle">
          <Icon className="h-5 w-5 text-bid" />
        </span>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <div className="font-semibold text-ink">{item.title}</div>
            <Badge tone={meta.tone}>{meta.label}</Badge>
            <ContentStatusBadge status={item.status} />
          </div>
          <div className="mt-1 text-sm text-ink-muted">
            {item.trainer?.name ?? "No trainer owner"}
            {item.durationLabel ? ` - ${item.durationLabel}` : ""}
          </div>
          <div className="mt-1 text-xs text-ink-faint">
            Used in {item.usage.modules} module
            {item.usage.modules === 1 ? "" : "s"} across {item.usage.programmes}{" "}
            programme{item.usage.programmes === 1 ? "" : "s"}
          </div>
        </div>
      </div>
      {!readOnly ? (
        <div className="flex shrink-0 gap-2">
          <Button variant="outline" size="sm" onClick={onEdit}>
            Edit
          </Button>
          <Button variant="outline" size="sm" onClick={onMove}>
            Move
          </Button>
          <Button variant="destructive" size="sm" onClick={onDelete}>
            Delete
          </Button>
        </div>
      ) : null}
    </div>
  );
}

function ReuseModuleContentModal({
  open,
  onOpenChange,
  module,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  module: ModuleSummary;
}) {
  const [search, setSearch] = React.useState("");
  const [contentItemId, setContentItemId] = React.useState("");
  const reusable = useLazyReusableContentItems(module.id, {
    enabled: open,
    search: search.trim() || undefined,
    take: 20,
  });
  const attach = useAttachContentItemMutation();

  const close = () => {
    if (attach.isPending) return;
    onOpenChange(false);
    setSearch("");
    setContentItemId("");
  };

  return (
    <Modal
      open={open}
      onOpenChange={(nextOpen) => {
        if (nextOpen) onOpenChange(true);
        else close();
      }}
      title="Reuse content from library"
    >
      <form
        onSubmit={async (event) => {
          event.preventDefault();
          if (!contentItemId) {
            toast.error("Choose a content item to reuse.");
            return;
          }
          try {
            await attach.mutateAsync({
              moduleId: module.id,
              contentItemId,
            });
            toast.success("Existing content added to the module.");
            close();
          } catch (error) {
            toast.error(
              error instanceof Error
                ? error.message
                : "Unable to reuse content.",
            );
          }
        }}
      >
        <FormField label="Existing content">
          <FormAutocomplete
            value={contentItemId}
            onValueChange={setContentItemId}
            options={reusable.rows.map((item) => ({
              value: item.id,
              label: item.title,
              description: `${typeMeta[item.type].label} - used in ${item.usage.modules} module${item.usage.modules === 1 ? "" : "s"}`,
            }))}
            placeholder="Search content library"
            searchPlaceholder="Search content..."
            emptyMessage="No reusable content found."
            onSearchChange={setSearch}
            isLoading={reusable.isLoading || reusable.isFetchingNextPage}
            hasMore={Boolean(reusable.hasNextPage)}
            onLoadMore={() => void reusable.fetchNextPage()}
            disabled={attach.isPending}
          />
        </FormField>
        <Notice>
          Reusing keeps one content item in the library. Title, trainer
          ownership, and asset changes apply everywhere it is used.
        </Notice>
        <Button
          type="submit"
          className="w-full"
          isLoading={attach.isPending}
          loadingLabel="Adding content..."
        >
          Add existing content
        </Button>
      </form>
    </Modal>
  );
}

function ContentStatusBadge({
  status,
}: {
  status: ContentItemRecord["status"];
}) {
  const tones = {
    draft: "neutral",
    processing: "blue",
    ready: "green",
    failed: "red",
    archived: "neutral",
  } as const;
  return <Badge tone={tones[status]}>{status}</Badge>;
}
