"use client";

import * as React from "react";
import { Upload, X } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/shared/Badge";
import { Button } from "@/components/shared/Button";
import {
  FormAutocomplete,
  FormField,
  FormInput,
  FormSelect,
  FormTextarea,
} from "@/components/shared/FormField";
import { Modal } from "@/components/shared/Modal";
import { useLazyEntrepreneursLookup } from "@/lib/api/entrepreneurs";
import { useDirectFileUploadMutation } from "@/lib/api/files";
import { useLazyProgrammesLookup } from "@/lib/api/programmes";
import { useLazyToolAreasQuery } from "@/lib/api/settings";
import {
  useCreateToolMutation,
  useUpdateToolMutation,
  type ApiToolStatus,
  type ApiToolType,
  type ApiToolVisibility,
  type ToolRecord,
} from "@/lib/api/tools";

type Choice = { id: string; name: string };
type Draft = {
  name: string;
  description: string;
  type: ApiToolType;
  toolAreaId: string;
  status: ApiToolStatus;
  visibility: ApiToolVisibility;
  iconKey: string;
  embeddedUrl: string;
};

const emptyDraft: Draft = {
  name: "",
  description: "",
  type: "pdf",
  toolAreaId: "",
  status: "draft",
  visibility: "all_entrepreneurs",
  iconKey: "document",
  embeddedUrl: "",
};
const typeOptions = [
  { value: "pdf", label: "PDF resource" },
  { value: "excel", label: "Excel workbook" },
  { value: "embedded_tool", label: "Online tool" },
];
const statusOptions = [
  { value: "draft", label: "Draft" },
  { value: "published", label: "Published" },
  { value: "archived", label: "Archived" },
];
const visibilityOptions = [
  { value: "all_entrepreneurs", label: "All entrepreneurs" },
  { value: "programmes", label: "Selected programmes" },
  { value: "entrepreneurs", label: "Selected entrepreneurs" },
];
const iconOptions = [
  "canvas",
  "document",
  "timer",
  "star",
  "plus",
  "calendar",
].map((value) => ({
  value,
  label: value[0].toUpperCase() + value.slice(1),
}));

function draftForTool(tool: ToolRecord | null): Draft {
  return tool
    ? {
        name: tool.name,
        description: tool.description,
        type: tool.type,
        toolAreaId: tool.toolArea.id,
        status: tool.status,
        visibility: tool.visibility,
        iconKey: tool.iconKey,
        embeddedUrl: tool.embeddedUrl ?? "",
      }
    : emptyDraft;
}

export function AdminToolEditorModal({
  open,
  tool,
  onOpenChange,
  onSaved,
}: {
  open: boolean;
  tool: ToolRecord | null;
  onOpenChange: (open: boolean) => void;
  onSaved: (tool: ToolRecord) => void;
}) {
  const [draft, setDraft] = React.useState<Draft>(() => draftForTool(tool));
  const [programmes, setProgrammes] = React.useState<Choice[]>(
    () => tool?.audience.programmes ?? [],
  );
  const [entrepreneurs, setEntrepreneurs] = React.useState<Choice[]>(
    () => tool?.audience.entrepreneurs ?? [],
  );
  const [hidden, setHidden] = React.useState<Choice[]>(
    () => tool?.audience.hiddenEntrepreneurs ?? [],
  );
  const [file, setFile] = React.useState<File | null>(null);
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [areaSearch, setAreaSearch] = React.useState("");
  const fileRef = React.useRef<HTMLInputElement>(null);

  const areas = useLazyToolAreasQuery({
    enabled: open,
    search: areaSearch || undefined,
    active: true,
    take: 20,
  });
  const upload = useDirectFileUploadMutation();
  const create = useCreateToolMutation();
  const update = useUpdateToolMutation();
  const busy = upload.isPending || create.isPending || update.isPending;
  const areaOptions =
    areas.data?.pages.flatMap((page) =>
      page.items.map((area) => ({ value: area.id, label: area.name })),
    ) ?? [];
  if (tool && !areaOptions.some((item) => item.value === tool.toolArea.id)) {
    areaOptions.unshift({ value: tool.toolArea.id, label: tool.toolArea.name });
  }

  const setField = <K extends keyof Draft>(key: K, value: Draft[K]) => {
    setDraft((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: "" }));
  };
  const validate = () => {
    const next: Record<string, string> = {};
    if (draft.name.trim().length < 2) next.name = "Enter a tool name.";
    if (draft.description.trim().length < 10)
      next.description = "Describe the tool in at least 10 characters.";
    if (!draft.toolAreaId) next.toolAreaId = "Select a tool area.";
    if (
      draft.type === "embedded_tool" &&
      draft.status === "published" &&
      !draft.embeddedUrl.trim()
    )
      next.embeddedUrl = "Add the online tool link.";
    if (
      (draft.type === "pdf" || draft.type === "excel") &&
      draft.status === "published" &&
      !file &&
      !(tool?.type === draft.type && tool.fileAsset)
    )
      next.file =
        draft.type === "excel"
          ? "Upload an Excel workbook before publishing."
          : "Upload a PDF before publishing.";
    if (
      draft.status === "published" &&
      draft.visibility === "programmes" &&
      !programmes.length
    )
      next.audience = "Select at least one programme.";
    if (
      draft.status === "published" &&
      draft.visibility === "entrepreneurs" &&
      !entrepreneurs.length
    )
      next.audience = "Select at least one entrepreneur.";
    setErrors(next);
    return !Object.keys(next).length;
  };

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || !validate()) return;
    try {
      const asset = file
        ? await upload.mutateAsync({
            file,
            usage: draft.type === "excel" ? "tool_excel" : "tool_pdf",
          })
        : null;
      const payload = {
        name: draft.name.trim(),
        description: draft.description.trim(),
        type: draft.type,
        toolAreaId: draft.toolAreaId,
        iconKey: draft.iconKey,
        visibility: draft.visibility,
        status: draft.status,
        fileAssetId:
          draft.type === "pdf" || draft.type === "excel"
            ? (asset?.id ??
              (tool?.type === draft.type ? tool.fileAsset?.id : null))
            : null,
        embeddedUrl:
          draft.type === "embedded_tool" ? draft.embeddedUrl.trim() : null,
        programmeIds:
          draft.visibility === "programmes"
            ? programmes.map((item) => item.id)
            : [],
        entrepreneurUserIds:
          draft.visibility === "entrepreneurs"
            ? entrepreneurs.map((item) => item.id)
            : [],
        hiddenEntrepreneurUserIds:
          draft.visibility === "entrepreneurs"
            ? []
            : hidden.map((item) => item.id),
      };
      const saved = tool
        ? await update.mutateAsync({ id: tool.id, payload })
        : await create.mutateAsync(payload);
      toast.success(tool ? "Tool updated" : "Tool added", {
        description: saved.name,
      });
      onSaved(saved);
      onOpenChange(false);
    } catch (error) {
      toast.error("Could not save tool", {
        description:
          error instanceof Error ? error.message : "Please try again.",
      });
    }
  }

  return (
    <Modal
      open={open}
      onOpenChange={(next) => !next && !busy && onOpenChange(false)}
      title={tool ? "Edit entrepreneur tool" : "Add entrepreneur tool"}
      width="xl"
    >
      <form onSubmit={submit} className="space-y-5">
        <div className="grid gap-4 lg:grid-cols-2">
          <FormField label="Tool name" error={errors.name}>
            <FormInput
              value={draft.name}
              onChange={(event) => setField("name", event.target.value)}
              placeholder="e.g. Cash flow forecasting resource"
            />
          </FormField>
          <FormField label="Tool area" error={errors.toolAreaId}>
            <FormAutocomplete
              value={draft.toolAreaId}
              onValueChange={(value) => setField("toolAreaId", value)}
              options={areaOptions}
              placeholder="Select tool area"
              searchPlaceholder="Search tool areas..."
              emptyMessage="No tool area found."
              onSearchChange={setAreaSearch}
              isLoading={areas.isLoading || areas.isFetchingNextPage}
              hasMore={Boolean(areas.hasNextPage)}
              onLoadMore={() => void areas.fetchNextPage()}
            />
          </FormField>
          <FormField label="Tool type">
            <FormSelect
              value={draft.type}
              onValueChange={(value) => setField("type", value as ApiToolType)}
              options={typeOptions}
            />
          </FormField>
          <FormField label="Publishing">
            <FormSelect
              value={draft.status}
              onValueChange={(value) =>
                setField("status", value as ApiToolStatus)
              }
              options={statusOptions}
            />
          </FormField>
          <FormField label="Visibility">
            <FormSelect
              value={draft.visibility}
              onValueChange={(value) =>
                setField("visibility", value as ApiToolVisibility)
              }
              options={visibilityOptions}
            />
          </FormField>
          <FormField label="Icon">
            <FormSelect
              value={draft.iconKey}
              onValueChange={(value) => setField("iconKey", value)}
              options={iconOptions}
            />
          </FormField>
        </div>
        <FormField label="Description" error={errors.description}>
          <FormTextarea
            value={draft.description}
            onChange={(event) => setField("description", event.target.value)}
            rows={3}
            placeholder="Short description entrepreneurs will see."
          />
        </FormField>

        {draft.type === "pdf" || draft.type === "excel" ? (
          <FormField
            label={draft.type === "excel" ? "Excel workbook" : "PDF resource"}
            error={errors.file}
          >
            <input
              ref={fileRef}
              type="file"
              accept={
                draft.type === "excel"
                  ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,.xlsx"
                  : "application/pdf,.pdf"
              }
              className="hidden"
              onChange={(event) => setFile(event.target.files?.[0] ?? null)}
            />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="flex min-h-[92px] w-full flex-col items-center justify-center rounded-xl border border-dashed border-line-strong bg-card px-4 py-5 text-center transition hover:border-bid/40 hover:bg-bid-light/20"
            >
              <Upload className="mb-2 h-5 w-5 text-bid" />
              <span className="text-sm font-semibold text-ink">
                {file?.name ??
                  tool?.fileAsset?.originalFilename ??
                  (draft.type === "excel"
                    ? "Attach Excel workbook"
                    : "Attach PDF resource")}
              </span>
              <span className="mt-1 text-sm text-ink-muted">
                {draft.type === "excel"
                  ? "Excel .xlsx workbooks up to 25 MB"
                  : "PDF files only"}
                {upload.isPending
                  ? " · " + upload.progress.percent + "% uploaded"
                  : ""}
              </span>
            </button>
          </FormField>
        ) : (
          <FormField label="Online tool link" error={errors.embeddedUrl}>
            <FormInput
              value={draft.embeddedUrl}
              onChange={(event) => setField("embeddedUrl", event.target.value)}
              placeholder="https://example.com/tool"
            />
          </FormField>
        )}

        {draft.visibility === "programmes" ? (
          <AudienceSelect
            mode="programmes"
            title="Programme audience"
            helper="Entrepreneurs with access to any selected programme will see this tool."
            selected={programmes}
            onChange={setProgrammes}
            error={errors.audience}
            enabled={open}
          />
        ) : null}
        {draft.visibility === "entrepreneurs" ? (
          <AudienceSelect
            mode="entrepreneurs"
            title="Entrepreneur audience"
            helper="Only the selected entrepreneurs will see this tool."
            selected={entrepreneurs}
            onChange={setEntrepreneurs}
            error={errors.audience}
            enabled={open}
          />
        ) : (
          <AudienceSelect
            mode="entrepreneurs"
            title="Hidden exceptions"
            helper="Optionally hide this global or programme tool from specific entrepreneurs."
            selected={hidden}
            onChange={setHidden}
            enabled={open}
          />
        )}

        <div className="flex flex-col gap-2 border-t border-line pt-4 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={busy}
          >
            Cancel
          </Button>
          <Button type="submit" isLoading={busy}>
            {tool ? "Save tool" : "Add tool"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function AudienceSelect({
  mode,
  title,
  helper,
  selected,
  onChange,
  error,
  enabled,
}: {
  mode: "programmes" | "entrepreneurs";
  title: string;
  helper: string;
  selected: Choice[];
  onChange: (value: Choice[]) => void;
  error?: string;
  enabled: boolean;
}) {
  const [search, setSearch] = React.useState("");
  const programmeQuery = useLazyProgrammesLookup({
    enabled: enabled && mode === "programmes",
    search: search || undefined,
    take: 20,
  });
  const entrepreneurQuery = useLazyEntrepreneursLookup({
    enabled: enabled && mode === "entrepreneurs",
    search: search || undefined,
    status: "active",
    take: 20,
  });
  const options =
    mode === "programmes"
      ? programmeQuery.rows.map((item) => ({
          value: item.id,
          label: item.name,
          description:
            item.accessType === "free" ? "Free resources" : item.lifecycle,
        }))
      : entrepreneurQuery.rows.map((item) => ({
          value: item.entrepreneurUserId,
          label: item.businessName,
          description: item.representativeName,
        }));
  const selectedIds = new Set(selected.map((item) => item.id));
  const available = options.filter((option) => !selectedIds.has(option.value));
  const query = mode === "programmes" ? programmeQuery : entrepreneurQuery;

  return (
    <div className="rounded-2xl border border-line bg-surface-subtle p-4">
      <div className="font-semibold text-ink">{title}</div>
      <p className="mt-1 text-sm text-ink-muted">{helper}</p>
      <div className="mt-3">
        <FormAutocomplete
          value=""
          onValueChange={(value) => {
            const option = options.find((item) => item.value === value);
            if (option)
              onChange([...selected, { id: option.value, name: option.label }]);
          }}
          options={available}
          placeholder={
            mode === "programmes" ? "Add a programme" : "Add an entrepreneur"
          }
          searchPlaceholder={
            mode === "programmes"
              ? "Search programmes..."
              : "Search entrepreneurs..."
          }
          emptyMessage="No matching option found."
          onSearchChange={setSearch}
          isLoading={query.isLoading || query.isFetchingNextPage}
          hasMore={Boolean(query.hasNextPage)}
          onLoadMore={() => void query.fetchNextPage()}
        />
      </div>
      {error ? <div className="mt-2 text-sm text-danger">{error}</div> : null}
      {selected.length ? (
        <div className="mt-3 flex max-h-28 flex-wrap gap-2 overflow-y-auto">
          {selected.map((item) => (
            <Badge key={item.id} tone="brand" className="gap-1.5">
              <span className="max-w-[220px] truncate">{item.name}</span>
              <button
                type="button"
                onClick={() =>
                  onChange(selected.filter((entry) => entry.id !== item.id))
                }
                aria-label={`Remove ${item.name}`}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </Badge>
          ))}
        </div>
      ) : null}
    </div>
  );
}
