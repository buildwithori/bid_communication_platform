"use client";

import * as React from "react";
import MuxPlayer from "@mux/mux-player-react/lazy";
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
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  ChevronLeft,
  ChevronRight,
  FileSpreadsheet,
  FileText,
  GripVertical,
  PlayCircle,
  Wrench,
} from "lucide-react";
import { Modal } from "@/components/shared/Modal";
import {
  FormAutocomplete,
  FormField,
  FormInput,
  FormSelect,
} from "@/components/shared/FormField";
import { Button } from "@/components/shared/Button";
import { useAdminStore } from "@/lib/stores/admin-store";
import { toolById, tools } from "@/lib/mock-data";
import { contentItemSchema, type ContentItemForm } from "@/lib/forms/schemas";
import { cn } from "@/lib/utils";
import type { Module, ContentItem, Trainer } from "@/types";

const typeMeta = {
  video: {
    label: "Video",
    icon: PlayCircle,
    bg: "bg-bid-light",
    fg: "text-bid",
  },
  pdf: { label: "PDF", icon: FileText, bg: "bg-info-light", fg: "text-info" },
  excel: {
    label: "Excel",
    icon: FileSpreadsheet,
    bg: "bg-success-light",
    fg: "text-success",
  },
  tool: {
    label: "Tool",
    icon: Wrench,
    bg: "bg-success-light",
    fg: "text-success-dark",
  },
};

function trainerCanBeAssigned(trainer: Trainer) {
  if (trainer.metrics.status === "inactive") return false;
  if (trainer.accessLevel !== "guest") return true;
  return Boolean(
    trainer.accessExpiresOn && new Date(trainer.accessExpiresOn) > new Date(),
  );
}

export function ManageContentModal({
  open,
  onOpenChange,
  module: mod,
  onAddItem,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  module?: Module;
  onAddItem: (module: Module) => void;
}) {
  const { contentItems, modules, trainers, reorderModuleContent } =
    useAdminStore();
  const [previewItem, setPreviewItem] = React.useState<ContentItem | null>(
    null,
  );
  const currentModule = React.useMemo(() => {
    if (!mod) return undefined;
    return modules.find((module) => module.id === mod.id) ?? mod;
  }, [mod, modules]);
  const items = React.useMemo(() => {
    if (!currentModule) return [];

    const contentById = new Map(contentItems.map((item) => [item.id, item]));
    const orderedItems = currentModule.contentItemIds
      .map((contentId) => contentById.get(contentId))
      .filter((item): item is ContentItem => Boolean(item));
    const orderedIds = new Set(orderedItems.map((item) => item.id));
    const unlistedItems = contentItems.filter(
      (item) => item.moduleId === currentModule.id && !orderedIds.has(item.id),
    );

    return [...orderedItems, ...unlistedItems];
  }, [contentItems, currentModule]);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const handleDragEnd = React.useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!currentModule || !over || active.id === over.id) return;
      reorderModuleContent(
        currentModule.id,
        String(active.id),
        String(over.id),
      );
    },
    [currentModule, reorderModuleContent],
  );

  if (!currentModule) return null;

  const trainerById = new Map(trainers.map((trainer) => [trainer.id, trainer]));

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={`Manage content — ${currentModule.title}`}
      width="xl"
    >
      <div className="space-y-4">
        <div className="rounded-xl border border-border bg-surface-subtle px-4 py-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <div className="text-base font-semibold text-ink">
                Content sequence
              </div>
              <p className="mt-1 max-w-2xl text-sm leading-6 text-ink-muted">
                Drag items into the order entrepreneurs should see them inside
                this module.
              </p>
            </div>
            <div className="flex shrink-0 flex-wrap items-center gap-2">
              <div className="rounded-full bg-card px-3 py-1.5 text-sm font-medium text-ink-muted shadow-sm">
                {items.length} {items.length === 1 ? "item" : "items"}
              </div>
              <Button
                type="button"
                size="sm"
                onClick={() => items[0] && setPreviewItem(items[0])}
                disabled={items.length === 0}
                className="shadow-sm"
              >
                <PlayCircle className="h-4 w-4" />
                Play from start
              </Button>
            </div>
          </div>
        </div>

        {items.length > 0 ? (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={items.map((item) => item.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="max-h-[54vh] space-y-2 overflow-y-auto pr-1">
                {items.map((item, index) => (
                  <SortableContentItem
                    key={item.id}
                    item={item}
                    position={index + 1}
                    totalItems={items.length}
                    trainerName={
                      trainerById.get(item.trainerId ?? "")?.fullName ??
                      "No trainer owner"
                    }
                    onPreview={() => setPreviewItem(item)}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        ) : (
          <div className="rounded-xl border border-dashed border-line-strong bg-surface-subtle px-5 py-10 text-center">
            <div className="text-base font-semibold text-ink">
              No content items yet
            </div>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-ink-muted">
              Add the first learning asset, then reorder items as the module
              grows.
            </p>
          </div>
        )}

        <Button
          className="w-full"
          size="lg"
          onClick={() => onAddItem(currentModule)}
        >
          + Add content item
        </Button>
      </div>
      <ContentPreviewModal
        items={items}
        item={previewItem}
        onChangeItem={setPreviewItem}
        onClose={() => setPreviewItem(null)}
      />
    </Modal>
  );
}

function SortableContentItem({
  item,
  position,
  totalItems,
  trainerName,
  onPreview,
}: {
  item: ContentItem;
  position: number;
  totalItems: number;
  trainerName: string;
  onPreview: () => void;
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
  } = useSortable({ id: item.id });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex flex-col gap-3 rounded-xl border border-border bg-card px-3 py-3 shadow-sm transition sm:flex-row sm:items-center sm:px-4",
        isDragging && "relative z-10 border-bid/25 shadow-2xl",
      )}
      style={{ transform: CSS.Transform.toString(transform), transition }}
    >
      <div className="flex min-w-0 flex-1 items-start gap-3">
        <button
          type="button"
          ref={setActivatorNodeRef}
          className="mt-1 inline-flex h-9 w-9 shrink-0 cursor-grab touch-none items-center justify-center rounded-lg border border-border bg-surface-subtle text-ink-muted transition hover:bg-bid-light hover:text-bid active:cursor-grabbing focus:outline-none focus:ring-2 focus:ring-bid/20"
          aria-label={`Reorder ${item.title}`}
          title="Drag to reorder content item"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-4 w-4" />
        </button>
        <span className="mt-1 inline-flex h-9 min-w-9 shrink-0 items-center justify-center rounded-lg bg-surface-subtle px-2 text-sm font-semibold text-ink-muted">
          {position}
        </span>
        <span
          className={`mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${meta.bg}`}
        >
          <Icon className={`h-5 w-5 ${meta.fg}`} strokeWidth={1.7} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-surface-subtle px-2 py-0.5 text-xs font-medium text-ink-muted">
              {item.chapter}
            </span>
            <span className="rounded-full bg-surface-subtle px-2 py-0.5 text-xs font-medium text-ink-muted">
              {meta.label}
            </span>
            <span className="text-xs text-ink-faint">
              {position} of {totalItems}
            </span>
          </div>
          <div className="mt-1.5 truncate text-base font-semibold text-ink">
            {item.title}
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm leading-5 text-ink-muted">
            {item.durationLabel ? <span>{item.durationLabel}</span> : null}
            {item.durationLabel ? <span aria-hidden="true">·</span> : null}
            <span>{trainerName}</span>
            {getContentSourceLabel(item) ? (
              <span className="min-w-0 truncate text-bid-dark">
                · {getContentSourceLabel(item)}
              </span>
            ) : null}
          </div>
        </div>
      </div>
      <div className="flex shrink-0 justify-end sm:justify-start">
        <Button variant="outline" size="md" onClick={onPreview}>
          Preview
        </Button>
      </div>
    </div>
  );
}

function ContentPreviewModal({
  items,
  item,
  onChangeItem,
  onClose,
}: {
  items: ContentItem[];
  item: ContentItem | null;
  onChangeItem: (item: ContentItem | null) => void;
  onClose: () => void;
}) {
  if (!item) return null;
  const meta = typeMeta[item.type];
  const Icon = meta.icon;
  const sourceLabel = getContentSourceLabel(item);
  const currentIndex = Math.max(
    items.findIndex((candidate) => candidate.id === item.id),
    0,
  );
  const hasPrevious = currentIndex > 0;
  const hasNext = currentIndex < items.length - 1;
  const previousItem = hasPrevious ? items[currentIndex - 1] : undefined;
  const nextItem = hasNext ? items[currentIndex + 1] : undefined;

  const goPrevious = () => {
    if (previousItem) onChangeItem(previousItem);
  };

  const goNext = () => {
    if (nextItem) onChangeItem(nextItem);
  };

  return (
    <Modal
      open={!!item}
      onOpenChange={(open) => !open && onClose()}
      title="Content preview"
      width="media"
    >
      <div className="space-y-4">
        <div className="rounded-2xl border border-border bg-surface-subtle p-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex min-w-0 items-start gap-3">
              <span
                className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${meta.bg}`}
              >
                <Icon className={`h-6 w-6 ${meta.fg}`} strokeWidth={1.8} />
              </span>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-card px-2.5 py-1 text-xs font-medium text-ink-muted shadow-sm">
                    {meta.label}
                  </span>
                  <span className="rounded-full bg-card px-2.5 py-1 text-xs font-medium text-ink-muted shadow-sm">
                    {item.chapter}
                  </span>
                  <span className="rounded-full bg-card px-2.5 py-1 text-xs font-medium text-ink-muted shadow-sm">
                    {currentIndex + 1} of {items.length}
                  </span>
                </div>
                <div className="mt-2 text-2xl font-semibold leading-tight text-ink">
                  {item.title}
                </div>
                <div className="mt-1 text-sm leading-6 text-ink-muted">
                  {item.durationLabel ?? "Preview"}
                  {sourceLabel ? ` · ${sourceLabel}` : ""}
                </div>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                onClick={goPrevious}
                disabled={!hasPrevious}
                className="min-w-[112px]"
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </Button>
              <Button
                variant="outline"
                onClick={goNext}
                disabled={!hasNext}
                className="min-w-[92px]"
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
              {getOpenUrl(item) ? (
                <Button
                  asChild
                  variant="outline"
                  className="border-bid/35 bg-bid-light/35 text-bid-dark hover:border-bid/50 hover:bg-bid-light hover:text-bid-dark"
                >
                  <a href={getOpenUrl(item)} target="_blank" rel="noreferrer">
                    Open in new tab
                  </a>
                </Button>
              ) : null}
            </div>
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-border bg-[#111] shadow-sm">
          <ContentPreviewFrame item={item} />
        </div>

        <div className="flex flex-col gap-2 rounded-2xl border border-border bg-card px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0 text-sm text-ink-muted">
            {previousItem ? (
              <span className="block truncate">
                Previous: {previousItem.title}
              </span>
            ) : (
              <span>No previous item</span>
            )}
          </div>
          <div className="text-sm font-medium text-ink-muted">
            {currentIndex + 1} / {items.length}
          </div>
          <div className="min-w-0 text-sm text-ink-muted sm:text-right">
            {nextItem ? (
              <span className="block truncate">Next: {nextItem.title}</span>
            ) : (
              <span>No next item</span>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
}

function ContentPreviewFrame({ item }: { item: ContentItem }) {
  if (item.type === "video") {
    if (!item.muxPlaybackId) {
      return (
        <MissingPreviewState
          title="Video is not ready yet"
          description="Upload a video file before this lesson can be previewed."
        />
      );
    }

    return (
      <div className="bg-black">
        <MuxPlayer
          playbackId={item.muxPlaybackId}
          metadataVideoTitle={item.title}
          streamType="on-demand"
          accentColor="#8f245c"
          className="block aspect-video max-h-[56vh] w-full"
        />
      </div>
    );
  }

  if (item.type === "pdf") {
    if (!item.fileUrl) {
      return (
        <MissingPreviewState
          title="PDF file is not ready"
          description="Upload a PDF file before this document can be previewed."
        />
      );
    }

    return (
      <iframe
        title={`${item.title} PDF preview`}
        src={item.fileUrl}
        className="h-[56vh] min-h-[420px] w-full bg-white"
      />
    );
  }

  if (!item.toolUrl) {
    return (
      <MissingPreviewState
        title="Tool link missing"
        description="Paste the embedded tool URL before this tool can be previewed."
      />
    );
  }

  return (
    <iframe
      title={`${item.title} embedded tool preview`}
      src={item.toolUrl}
      sandbox="allow-forms allow-popups allow-same-origin allow-scripts"
      className="h-[56vh] min-h-[420px] w-full bg-white"
    />
  );
}

function MissingPreviewState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="grid min-h-[360px] place-items-center bg-surface-subtle p-8 text-center">
      <div>
        <div className="text-base font-semibold text-ink">{title}</div>
        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-ink-muted">
          {description}
        </p>
      </div>
    </div>
  );
}

function getOpenUrl(item: ContentItem) {
  if (item.type === "pdf") return item.fileUrl;
  if (item.type === "tool") return item.toolUrl;
  return undefined;
}

function getContentSourceLabel(item: ContentItem) {
  if (item.type === "video")
    return item.muxPlaybackId ? "Video ready" : undefined;
  if (item.type === "pdf")
    return item.pdfFileName
      ? item.pdfFileName
      : item.fileUrl
        ? "PDF attached"
        : undefined;
  if (item.type === "tool")
    return item.linkedToolId
      ? (toolById(item.linkedToolId)?.name ?? "Linked entrepreneur tool")
      : item.toolUrl;
  return undefined;
}

export function AddContentItemModal({
  open,
  onOpenChange,
  module,
  onAdded,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  module?: Module;
  onAdded?: (module: Module) => void;
}) {
  const { addContentItem, trainers } = useAdminStore();
  const selectableTrainers = React.useMemo(
    () => trainers.filter(trainerCanBeAssigned),
    [trainers],
  );
  const videoInputRef = React.useRef<HTMLInputElement | null>(null);
  const pdfInputRef = React.useRef<HTMLInputElement | null>(null);
  const embeddedToolOptions = React.useMemo(
    () =>
      tools.filter(
        (tool) =>
          tool.type === "embed" && tool.status === "published" && tool.embedUrl,
      ),
    [],
  );
  const form = useForm<ContentItemForm>({
    resolver: zodResolver(contentItemSchema),
    defaultValues: {
      title: "",
      type: "video",
      trainerId: selectableTrainers[0]?.id ?? "",
      videoFileName: "",
      pdfFileName: "",
      fileUrl: "",
      toolSource: "library",
      linkedToolId: "",
      toolUrl: "",
    },
  });
  const contentType = useWatch({ control: form.control, name: "type" });
  const toolSource =
    useWatch({ control: form.control, name: "toolSource" }) ?? "library";
  const trainerId = useWatch({ control: form.control, name: "trainerId" });
  const videoFileName = useWatch({
    control: form.control,
    name: "videoFileName",
  });
  const pdfFileName = useWatch({ control: form.control, name: "pdfFileName" });
  const linkedToolId = useWatch({
    control: form.control,
    name: "linkedToolId",
  });

  if (!module) return null;

  const handleSubmit = (values: ContentItemForm) => {
    addContentItem(module.id, values);
    form.reset({
      title: "",
      type: "video",
      trainerId: selectableTrainers[0]?.id ?? "",
      videoFileName: "",
      pdfFileName: "",
      fileUrl: "",
      toolSource: "library",
      linkedToolId: "",
      toolUrl: "",
    });
    onOpenChange(false);
    onAdded?.(module);
  };

  return (
    <Modal open={open} onOpenChange={onOpenChange} title="Add content item">
      <form onSubmit={form.handleSubmit(handleSubmit)}>
        <FormField
          label="Chapter title"
          error={form.formState.errors.title?.message}
        >
          <FormInput
            placeholder="e.g. Chapter 3: Testing your hypothesis"
            {...form.register("title")}
          />
        </FormField>
        <FormField
          label="Content type"
          error={form.formState.errors.type?.message}
        >
          <FormSelect
            value={contentType}
            onValueChange={(value) => {
              const nextType = value as ContentItem["type"];
              form.setValue("type", nextType, { shouldValidate: true });
              if (nextType !== "video")
                form.setValue("videoFileName", "", { shouldValidate: true });
              if (nextType !== "pdf") {
                form.setValue("pdfFileName", "", { shouldValidate: true });
                form.setValue("fileUrl", "", { shouldValidate: true });
              }
              if (nextType !== "tool") {
                form.setValue("toolSource", "library", {
                  shouldValidate: true,
                });
                form.setValue("linkedToolId", "", { shouldValidate: true });
                form.setValue("toolUrl", "", { shouldValidate: true });
              }
            }}
            options={[
              { value: "video", label: "Video" },
              { value: "pdf", label: "PDF resource" },
              { value: "excel", label: "Excel workbook" },
              { value: "tool", label: "Embedded tool" },
            ]}
          />
        </FormField>
        <FormField
          label="Trainer"
          error={form.formState.errors.trainerId?.message}
        >
          <FormAutocomplete
            value={trainerId}
            onValueChange={(value) =>
              form.setValue("trainerId", value, { shouldValidate: true })
            }
            options={selectableTrainers.map((trainer) => ({
              value: trainer.id,
              label: trainer.fullName,
              description: trainer.role,
            }))}
            placeholder="Select trainer"
            searchPlaceholder="Search trainers..."
            emptyMessage="No trainer found."
          />
          <p className="mt-1.5 text-xs leading-5 text-ink-muted">
            Ratings for this item will be attributed to this trainer.
          </p>
        </FormField>
        {contentType === "video" ? (
          <FormField
            label="Video file"
            error={form.formState.errors.videoFileName?.message}
          >
            <input type="hidden" {...form.register("videoFileName")} />
            <input
              ref={videoInputRef}
              type="file"
              accept="video/mp4,video/quicktime,video/*"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file)
                  form.setValue("videoFileName", file.name, {
                    shouldValidate: true,
                  });
              }}
            />
            <button
              type="button"
              onClick={() => videoInputRef.current?.click()}
              className="flex w-full flex-col items-center rounded-bid border-[1.5px] border-dashed border-line-strong px-5 py-5 text-center transition-colors hover:border-bid hover:bg-bid-light"
              aria-label="Upload video file"
            >
              <span className="text-sm font-medium text-ink">
                {videoFileName || "Upload or select a video file"}
              </span>
              <span className="mt-1 text-sm text-ink-muted">
                MP4 or MOV files are supported.
              </span>
            </button>
          </FormField>
        ) : null}
        {contentType === "pdf" ? (
          <FormField
            label="PDF file"
            error={form.formState.errors.pdfFileName?.message}
          >
            <input type="hidden" {...form.register("pdfFileName")} />
            <input
              ref={pdfInputRef}
              type="file"
              accept="application/pdf,.pdf"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file)
                  form.setValue("pdfFileName", file.name, {
                    shouldValidate: true,
                  });
              }}
            />
            <button
              type="button"
              onClick={() => pdfInputRef.current?.click()}
              className="flex w-full flex-col items-center rounded-bid border-[1.5px] border-dashed border-line-strong px-5 py-5 text-center transition-colors hover:border-bid hover:bg-bid-light"
              aria-label="Upload PDF file"
            >
              <FileText className="mb-2 h-6 w-6 text-info" />
              <span className="text-sm font-medium text-ink">
                {pdfFileName || "Attach PDF learning file"}
              </span>
              <span className="mt-1 text-sm text-ink-muted">
                This file will appear as a PDF resource in the module.
              </span>
            </button>
          </FormField>
        ) : null}
        {contentType === "tool" ? (
          <div className="mb-4 rounded-xl border border-border bg-surface-subtle p-3">
            <FormField
              label="Tool source"
              error={form.formState.errors.toolSource?.message}
              className="mb-3"
            >
              <FormSelect
                value={toolSource}
                onValueChange={(value) => {
                  const nextSource = value as NonNullable<
                    ContentItemForm["toolSource"]
                  >;
                  form.setValue("toolSource", nextSource, {
                    shouldValidate: true,
                  });
                  form.setValue("linkedToolId", "", { shouldValidate: true });
                  form.setValue("toolUrl", "", { shouldValidate: true });
                }}
                options={[
                  { value: "library", label: "Use existing entrepreneur tool" },
                  { value: "custom", label: "Add custom tool link" },
                ]}
              />
            </FormField>

            {toolSource === "library" ? (
              <FormField
                label="Entrepreneur tool"
                error={form.formState.errors.linkedToolId?.message}
                className="mb-0"
              >
                <FormAutocomplete
                  value={linkedToolId ?? ""}
                  onValueChange={(value) => {
                    const selectedTool = embeddedToolOptions.find(
                      (tool) => tool.id === value,
                    );
                    form.setValue("linkedToolId", value, {
                      shouldValidate: true,
                    });
                    form.setValue("toolUrl", selectedTool?.embedUrl ?? "", {
                      shouldValidate: true,
                    });
                  }}
                  options={embeddedToolOptions.map((tool) => ({
                    value: tool.id,
                    label: tool.name,
                    description: tool.description,
                  }))}
                  placeholder="Select existing tool"
                  searchPlaceholder="Search online tools..."
                  emptyMessage="No published online tools available."
                  disabled={embeddedToolOptions.length === 0}
                />
                <p className="mt-1.5 text-xs leading-5 text-ink-muted">
                  Choose a published online tool from Entrepreneur Tools.
                </p>
              </FormField>
            ) : (
              <FormField
                label="Custom embedded tool link"
                error={form.formState.errors.toolUrl?.message}
                className="mb-0"
              >
                <FormInput
                  type="url"
                  placeholder="https://example.com/tool"
                  {...form.register("toolUrl")}
                />
                <p className="mt-1.5 text-xs leading-5 text-ink-muted">
                  Use this for a one-off tool that is not in Entrepreneur Tools
                  yet.
                </p>
              </FormField>
            )}
          </div>
        ) : null}
        <Button type="submit" className="w-full">
          Add to module
        </Button>
      </form>
    </Modal>
  );
}
