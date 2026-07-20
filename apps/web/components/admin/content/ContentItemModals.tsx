"use client";

import * as React from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Button } from "@/components/shared/Button";
import {
  FormAutocomplete,
  FormField,
  FormInput,
  FormSelect,
} from "@/components/shared/FormField";
import { Modal } from "@/components/shared/Modal";
import { Notice } from "@/components/shared/PageHeader";
import {
  useAttachContentItemMutation,
  useCreateModuleContentMutation,
  useLazyPublishedToolsLookup,
  useUpdateContentItemMutation,
  type ContentItemRecord,
  type ContentItemType,
} from "@/lib/api/content";
import {
  useLazyProgrammeModules,
  useLazyProgrammesLookup,
} from "@/lib/api/programmes";
import { useLazyTrainersLookup } from "@/lib/api/trainers";
import { useDirectFileUploadMutation } from "@/lib/api/files";
import { useDirectVideoUploadMutation } from "@/lib/api/videos";

const createSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(2, "Title must be at least 2 characters")
      .max(160, "Title must be 160 characters or fewer"),
    type: z.enum(["video", "pdf", "excel", "tool"]),
    trainerId: z.string(),
    programmeId: z.string(),
    moduleId: z.string(),
    toolSource: z.enum(["library", "custom"]),
    toolId: z.string(),
    externalUrl: z.string(),
  })
  .superRefine((values, context) => {
    if (!values.moduleId) {
      context.addIssue({
        code: "custom",
        path: ["moduleId"],
        message: "Choose a module",
      });
    }
    if (
      values.type === "tool" &&
      values.toolSource === "library" &&
      !values.toolId
    ) {
      context.addIssue({
        code: "custom",
        path: ["toolId"],
        message: "Choose an entrepreneur tool",
      });
    }
    if (values.type === "tool" && values.toolSource === "custom") {
      const parsed = z.string().url().max(500).safeParse(values.externalUrl);
      if (!parsed.success) {
        context.addIssue({
          code: "custom",
          path: ["externalUrl"],
          message: "Enter a valid tool URL",
        });
      }
    }
  });

type CreateForm = z.infer<typeof createSchema>;

export function CreateContentItemModal({
  open,
  onOpenChange,
  initialModuleId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialModuleId?: string;
}) {
  const [programmeSearch, setProgrammeSearch] = React.useState("");
  const [moduleSearch, setModuleSearch] = React.useState("");
  const [trainerSearch, setTrainerSearch] = React.useState("");
  const [toolSearch, setToolSearch] = React.useState("");
  const [assetFile, setAssetFile] = React.useState<File | null>(null);

  const form = useForm<CreateForm>({
    resolver: zodResolver(createSchema),
    defaultValues: {
      title: "",
      type: "video",
      trainerId: "",
      programmeId: "",
      moduleId: initialModuleId ?? "",
      toolSource: "library",
      toolId: "",
      externalUrl: "",
    },
  });
  const type = useWatch({ control: form.control, name: "type" });
  const programmeId = useWatch({ control: form.control, name: "programmeId" });
  const trainerId = useWatch({ control: form.control, name: "trainerId" });
  const moduleId = useWatch({ control: form.control, name: "moduleId" });
  const toolSource = useWatch({ control: form.control, name: "toolSource" });
  const toolId = useWatch({ control: form.control, name: "toolId" });

  const programmes = useLazyProgrammesLookup({
    enabled: open && !initialModuleId,
    search: programmeSearch.trim() || undefined,
    includeArchived: false,
    take: 20,
  });
  const modules = useLazyProgrammeModules({
    programmeId,
    enabled: open && !initialModuleId && Boolean(programmeId),
    search: moduleSearch.trim() || undefined,
    take: 20,
  });
  const trainers = useLazyTrainersLookup({
    enabled: open,
    search: trainerSearch.trim() || undefined,
    status: "active",
    take: 20,
  });
  const tools = useLazyPublishedToolsLookup({
    enabled: open && type === "tool" && toolSource === "library",
    search: toolSearch.trim() || undefined,
    excludeModuleId: moduleId || undefined,
  });
  React.useEffect(() => {
    form.setValue("toolId", "");
    setToolSearch("");
  }, [form, moduleId]);

  const createContent = useCreateModuleContentMutation();
  const fileUpload = useDirectFileUploadMutation();
  const videoUpload = useDirectVideoUploadMutation();
  const busy =
    createContent.isPending || fileUpload.isPending || videoUpload.isPending;

  const close = () => {
    onOpenChange(false);
    setAssetFile(null);
    setProgrammeSearch("");
    setModuleSearch("");
    setTrainerSearch("");
    setToolSearch("");
    form.reset({
      title: "",
      type: "video",
      trainerId: "",
      programmeId: "",
      moduleId: initialModuleId ?? "",
      toolSource: "library",
      toolId: "",
      externalUrl: "",
    });
    fileUpload.reset();
    videoUpload.reset();
  };

  const submit = async (values: CreateForm) => {
    if (
      (values.type === "video" ||
        values.type === "pdf" ||
        values.type === "excel") &&
      !assetFile
    ) {
      form.setError("root", {
        message:
          "Choose a " +
          (values.type === "video"
            ? "video"
            : values.type === "excel"
              ? "Excel workbook"
              : "PDF") +
          " file",
      });
      return;
    }

    try {
      let videoAssetId: string | undefined;
      let fileAssetId: string | undefined;
      if (values.type === "video" && assetFile) {
        const video = await videoUpload.mutateAsync({ file: assetFile });
        videoAssetId = video.id;
      }
      if ((values.type === "pdf" || values.type === "excel") && assetFile) {
        const file = await fileUpload.mutateAsync({
          file: assetFile,
          usage: values.type === "excel" ? "content_excel" : "content_pdf",
        });
        fileAssetId = file.id;
      }

      await createContent.mutateAsync({
        moduleId: values.moduleId,
        payload: {
          title: values.title,
          type: values.type,
          trainerId: values.trainerId || undefined,
          videoAssetId,
          fileAssetId,
          toolId:
            values.type === "tool" && values.toolSource === "library"
              ? values.toolId
              : undefined,
          externalUrl:
            values.type === "tool" && values.toolSource === "custom"
              ? values.externalUrl
              : undefined,
        },
      });
      toast.success("Content item added to the module.");
      close();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Unable to add content.",
      );
    }
  };

  const uploadProgress =
    type === "video"
      ? videoUpload.progress.percent
      : fileUpload.progress.percent;

  return (
    <Modal
      open={open}
      onOpenChange={(nextOpen) => {
        if (!busy) {
          if (nextOpen) onOpenChange(true);
          else close();
        }
      }}
      title="Upload content"
    >
      <form onSubmit={form.handleSubmit(submit)}>
        {!initialModuleId ? (
          <>
            <FormField
              label="Programme"
              error={form.formState.errors.programmeId?.message}
            >
              <FormAutocomplete
                value={programmeId}
                onValueChange={(value) => {
                  form.setValue("programmeId", value);
                  form.setValue("moduleId", "");
                }}
                options={programmes.rows.map((programme) => ({
                  value: programme.id,
                  label: programme.name,
                  description: programme.lifecycle,
                }))}
                placeholder="Select programme"
                searchPlaceholder="Search programmes..."
                onSearchChange={setProgrammeSearch}
                isLoading={
                  programmes.isLoading || programmes.isFetchingNextPage
                }
                hasMore={Boolean(programmes.hasNextPage)}
                onLoadMore={() => void programmes.fetchNextPage()}
              />
            </FormField>
            <FormField
              label="Module"
              error={form.formState.errors.moduleId?.message}
            >
              <FormAutocomplete
                value={moduleId}
                onValueChange={(value) =>
                  form.setValue("moduleId", value, { shouldValidate: true })
                }
                options={modules.rows.map((module) => ({
                  value: module.id,
                  label: module.title,
                  description: `Position ${module.position}`,
                }))}
                placeholder={
                  programmeId ? "Select module" : "Select a programme first"
                }
                searchPlaceholder="Search modules..."
                disabled={!programmeId}
                onSearchChange={setModuleSearch}
                isLoading={modules.isLoading || modules.isFetchingNextPage}
                hasMore={Boolean(modules.hasNextPage)}
                onLoadMore={() => void modules.fetchNextPage()}
              />
            </FormField>
          </>
        ) : (
          <Notice>
            The new item will be added to the selected programme module.
          </Notice>
        )}

        <FormField label="Title" error={form.formState.errors.title?.message}>
          <FormInput
            placeholder="e.g. Testing your hypothesis"
            disabled={busy}
            {...form.register("title")}
          />
        </FormField>
        <FormField label="Content type">
          <FormSelect
            value={type}
            onValueChange={(value) => {
              form.setValue("type", value as ContentItemType);
              setAssetFile(null);
              form.clearErrors("root");
            }}
            options={[
              { value: "video", label: "Video" },
              { value: "pdf", label: "PDF resource" },
              { value: "excel", label: "Excel workbook" },
              { value: "tool", label: "Embedded tool" },
            ]}
          />
        </FormField>
        <FormField label="Trainer" optional>
          <FormAutocomplete
            value={trainerId}
            onValueChange={(value) => form.setValue("trainerId", value)}
            options={trainers.rows.map((trainer) => ({
              value: trainer.trainerUserId,
              label: trainer.name,
              description: trainer.email,
            }))}
            placeholder="Select trainer"
            searchPlaceholder="Search trainers..."
            onSearchChange={setTrainerSearch}
            isLoading={trainers.isLoading || trainers.isFetchingNextPage}
            hasMore={Boolean(trainers.hasNextPage)}
            onLoadMore={() => void trainers.fetchNextPage()}
          />
          <p className="mt-1.5 text-xs text-ink-muted">
            Learner ratings are attributed to this trainer.
          </p>
        </FormField>

        {type === "video" || type === "pdf" || type === "excel" ? (
          <FormField
            label={
              type === "video"
                ? "Video file"
                : type === "excel"
                  ? "Excel workbook"
                  : "PDF file"
            }
            error={form.formState.errors.root?.message}
          >
            <label className="flex cursor-pointer flex-col items-center rounded-xl border border-dashed border-line-strong bg-surface-subtle px-5 py-5 text-center transition hover:border-bid hover:bg-bid-light">
              <span className="text-sm font-medium text-ink">
                {assetFile?.name ??
                  "Choose a " +
                    (type === "video"
                      ? "video"
                      : type === "excel"
                        ? "Excel workbook"
                        : "PDF") +
                    " file"}
              </span>
              <span className="mt-1 text-xs text-ink-muted">
                {type === "video"
                  ? "MP4, MOV, or another video format"
                  : type === "excel"
                    ? "Excel .xlsx workbooks up to 25 MB"
                    : "PDF files only"}
              </span>
              <input
                type="file"
                className="hidden"
                disabled={busy}
                accept={
                  type === "video"
                    ? "video/*"
                    : type === "excel"
                      ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,.xlsx"
                      : "application/pdf,.pdf"
                }
                onChange={(event) => {
                  setAssetFile(event.target.files?.[0] ?? null);
                  form.clearErrors("root");
                }}
              />
            </label>
            {busy && uploadProgress > 0 ? (
              <div className="mt-2 text-xs font-medium text-bid">
                Uploading {uploadProgress}%
              </div>
            ) : null}
          </FormField>
        ) : null}

        {type === "tool" ? (
          <div className="mb-4 rounded-xl border border-line bg-surface-subtle p-3">
            <FormField label="Tool source" className="mb-3">
              <FormSelect
                value={toolSource}
                onValueChange={(value) =>
                  form.setValue("toolSource", value as CreateForm["toolSource"])
                }
                options={[
                  { value: "library", label: "Use existing entrepreneur tool" },
                  { value: "custom", label: "Add custom tool link" },
                ]}
              />
            </FormField>
            {toolSource === "library" ? (
              <FormField
                label="Entrepreneur tool"
                error={form.formState.errors.toolId?.message}
                className="mb-0"
              >
                <FormAutocomplete
                  value={toolId}
                  onValueChange={(value) =>
                    form.setValue("toolId", value, { shouldValidate: true })
                  }
                  options={tools.rows.map((tool) => ({
                    value: tool.id,
                    label: tool.name,
                    description:
                      (tool.type === "pdf"
                        ? "PDF resource"
                        : tool.type === "excel"
                          ? "Excel workbook"
                          : "Online tool") +
                      " · " +
                      tool.description,
                  }))}
                  placeholder="Select entrepreneur tool"
                  searchPlaceholder="Search tools..."
                  emptyMessage="No unused entrepreneur tools found."
                  onSearchChange={setToolSearch}
                  isLoading={tools.isLoading || tools.isFetchingNextPage}
                  hasMore={Boolean(tools.hasNextPage)}
                  onLoadMore={() => void tools.fetchNextPage()}
                />
              </FormField>
            ) : (
              <FormField
                label="Custom embedded tool link"
                error={form.formState.errors.externalUrl?.message}
                className="mb-0"
              >
                <FormInput
                  type="url"
                  placeholder="https://example.com/tool"
                  {...form.register("externalUrl")}
                />
              </FormField>
            )}
          </div>
        ) : null}

        <Button
          type="submit"
          className="w-full"
          isLoading={busy}
          loadingLabel={
            fileUpload.isPending || videoUpload.isPending
              ? "Uploading asset..."
              : "Adding content..."
          }
        >
          Add to module
        </Button>
      </form>
    </Modal>
  );
}

const editSchema = z.object({
  title: z.string().trim().min(2).max(160),
  trainerId: z.string(),
});
type EditForm = z.infer<typeof editSchema>;

export function EditContentItemModal({
  item,
  onOpenChange,
}: {
  item: ContentItemRecord | null;
  onOpenChange: (open: boolean) => void;
}) {
  const [trainerSearch, setTrainerSearch] = React.useState("");
  const form = useForm<EditForm>({
    resolver: zodResolver(editSchema),
    values: {
      title: item?.title ?? "",
      trainerId: item?.trainerId ?? "",
    },
  });
  const trainerId = useWatch({ control: form.control, name: "trainerId" });
  const trainers = useLazyTrainersLookup({
    enabled: Boolean(item),
    search: trainerSearch.trim() || undefined,
    status: "active",
    take: 20,
  });
  const update = useUpdateContentItemMutation();

  if (!item) return null;

  return (
    <Modal
      open
      onOpenChange={(open) => {
        if (!update.isPending) onOpenChange(open);
      }}
      title="Edit content"
    >
      <form
        onSubmit={form.handleSubmit(async (values) => {
          try {
            await update.mutateAsync({
              contentItemId: item.id,
              payload: {
                title: values.title,
                trainerId: values.trainerId,
              },
            });
            toast.success("Content item updated.");
            onOpenChange(false);
          } catch (error) {
            toast.error(
              error instanceof Error
                ? error.message
                : "Unable to update content.",
            );
          }
        })}
      >
        <FormField label="Title" error={form.formState.errors.title?.message}>
          <FormInput {...form.register("title")} />
        </FormField>
        <FormField label="Trainer" optional>
          <FormAutocomplete
            value={trainerId}
            onValueChange={(value) => form.setValue("trainerId", value)}
            options={[
              ...(item.trainer
                ? [
                    {
                      value: item.trainer.id,
                      label: item.trainer.name,
                      description: item.trainer.email,
                    },
                  ]
                : []),
              ...trainers.rows
                .filter((trainer) => trainer.trainerUserId !== item.trainerId)
                .map((trainer) => ({
                  value: trainer.trainerUserId,
                  label: trainer.name,
                  description: trainer.email,
                })),
            ]}
            placeholder="Select trainer"
            searchPlaceholder="Search trainers..."
            onSearchChange={setTrainerSearch}
            isLoading={trainers.isLoading || trainers.isFetchingNextPage}
            hasMore={Boolean(trainers.hasNextPage)}
            onLoadMore={() => void trainers.fetchNextPage()}
          />
        </FormField>
        <Notice>The asset type and uploaded file remain unchanged.</Notice>
        <Button
          type="submit"
          className="w-full"
          isLoading={update.isPending}
          loadingLabel="Saving content..."
        >
          Save changes
        </Button>
      </form>
    </Modal>
  );
}

export function AttachContentItemModal({
  item,
  onOpenChange,
}: {
  item: ContentItemRecord | null;
  onOpenChange: (open: boolean) => void;
}) {
  const [programmeId, setProgrammeId] = React.useState("");
  const [moduleId, setModuleId] = React.useState("");
  const [programmeSearch, setProgrammeSearch] = React.useState("");
  const [moduleSearch, setModuleSearch] = React.useState("");
  const programmes = useLazyProgrammesLookup({
    enabled: Boolean(item),
    search: programmeSearch.trim() || undefined,
    includeArchived: false,
    excludeContentItemId: item?.id,
    take: 20,
  });
  const modules = useLazyProgrammeModules({
    programmeId,
    enabled: Boolean(item) && Boolean(programmeId),
    search: moduleSearch.trim() || undefined,
    excludeContentItemId: item?.id,
    take: 20,
  });
  const attach = useAttachContentItemMutation();

  if (!item) return null;

  const close = () => {
    setProgrammeId("");
    setModuleId("");
    setProgrammeSearch("");
    setModuleSearch("");
    onOpenChange(false);
  };

  return (
    <Modal
      open
      onOpenChange={(open) => {
        if (!attach.isPending) {
          if (open) onOpenChange(true);
          else close();
        }
      }}
      title="Add content to another module"
    >
      <FormField label="Programme">
        <FormAutocomplete
          value={programmeId}
          onValueChange={(value) => {
            setProgrammeId(value);
            setModuleId("");
          }}
          options={programmes.rows.map((programme) => ({
            value: programme.id,
            label: programme.name,
            description: programme.lifecycle,
          }))}
          placeholder="Select programme"
          searchPlaceholder="Search programmes..."
          onSearchChange={setProgrammeSearch}
          isLoading={programmes.isLoading || programmes.isFetchingNextPage}
          emptyMessage="No eligible programme found. Programmes already using this content are hidden."
          hasMore={Boolean(programmes.hasNextPage)}
          onLoadMore={() => void programmes.fetchNextPage()}
        />
      </FormField>
      <FormField label="Module">
        <FormAutocomplete
          value={moduleId}
          onValueChange={setModuleId}
          options={modules.rows.map((module) => ({
            value: module.id,
            label: module.title,
            description: `Position ${module.position}`,
          }))}
          placeholder={
            programmeId ? "Select module" : "Select a programme first"
          }
          searchPlaceholder="Search modules..."
          disabled={!programmeId}
          onSearchChange={setModuleSearch}
          isLoading={modules.isLoading || modules.isFetchingNextPage}
          emptyMessage="No eligible module found. Modules that would create a duplicate are hidden."
          hasMore={Boolean(modules.hasNextPage)}
          onLoadMore={() => void modules.fetchNextPage()}
        />
      </FormField>
      <Notice>
        Reusing this item keeps one asset. Changes to its title and trainer
        apply everywhere it is used.
      </Notice>
      <Button
        className="w-full"
        disabled={!moduleId}
        isLoading={attach.isPending}
        loadingLabel="Adding content..."
        onClick={async () => {
          if (!moduleId) return;
          try {
            await attach.mutateAsync({
              moduleId,
              contentItemId: item.id,
            });
            toast.success("Content added to the module.");
            close();
          } catch (error) {
            toast.error(
              error instanceof Error
                ? error.message
                : "Unable to attach content.",
            );
          }
        }}
      >
        Add content
      </Button>
    </Modal>
  );
}
