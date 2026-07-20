"use client";

import * as React from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Modal } from "@/components/shared/Modal";
import {
  FormAutocomplete,
  FormField,
  FormInput,
  FormRow2,
  FormSelect,
} from "@/components/shared/FormField";
import { Button } from "@/components/shared/Button";
import { Badge } from "@/components/shared/Badge";
import { DatePicker } from "@/components/shared/DatePicker";
import { trainerSchema, type TrainerForm } from "@/lib/forms/schemas";
import { useLazySectorsQuery } from "@/lib/api/settings";
import type { TrainerRecord } from "@/lib/api/trainers";

const roleOptions = [
  { value: "mentor", label: "Mentor" },
  { value: "trainer", label: "Trainer" },
  { value: "guest_expert", label: "Guest Expert" },
  { value: "investment_analyst", label: "Investment Analyst" },
] as const;

export function TrainerModal({
  open,
  onOpenChange,
  mode = "add",
  trainer,
  isPending,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode?: "add" | "edit";
  trainer?: TrainerRecord;
  isPending: boolean;
  onSubmit: (values: TrainerForm) => void;
}) {
  const isEdit = mode === "edit" && Boolean(trainer);
  const [specialismOpen, setSpecialismOpen] = React.useState(false);
  const [specialismSearch, setSpecialismSearch] = React.useState("");
  const sectors = useLazySectorsQuery({
    enabled: open && specialismOpen,
    search: specialismSearch || undefined,
    active: true,
    take: 20,
  });
  const form = useForm<TrainerForm>({
    resolver: zodResolver(trainerSchema),
    defaultValues: defaults(trainer),
  });
  const accessLevel = useWatch({ control: form.control, name: "accessLevel" });
  const selectedSectorIds = useWatch({ control: form.control, name: "sectorIds" });
  const roleLabel = useWatch({ control: form.control, name: "roleLabel" });
  const loadedSectors =
    sectors.data?.pages.flatMap((page) => page.items) ?? [];
  const sectorOptions = uniqueOptions([
    ...(trainer?.specialisms ?? []).map((sector) => ({
      value: sector.id,
      label: sector.name,
    })),
    ...loadedSectors.map((sector) => ({
      value: sector.id,
      label: sector.name,
    })),
  ]);

  React.useEffect(() => {
    if (!open) return;
    form.reset(defaults(trainer));
  }, [form, open, trainer]);

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setSpecialismOpen(false);
      setSpecialismSearch("");
    }
    onOpenChange(nextOpen);
  };

  const selectedOptions = selectedSectorIds.map((sectorId) =>
    sectorOptions.find((option) => option.value === sectorId) ?? {
      value: sectorId,
      label: "Selected sector",
    },
  );

  return (
    <Modal
      open={open}
      onOpenChange={handleOpenChange}
      title={isEdit ? `Edit trainer – ${trainer?.name}` : "Invite trainer"}
      width="wide"
    >
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormRow2>
          <FormField
            label="First name"
            error={form.formState.errors.firstName?.message}
            className="mb-0"
          >
            <FormInput {...form.register("firstName")} />
          </FormField>
          <FormField
            label="Last name"
            error={form.formState.errors.lastName?.message}
            className="mb-0"
          >
            <FormInput {...form.register("lastName")} />
          </FormField>
        </FormRow2>

        <FormField
          label="Email"
          error={form.formState.errors.email?.message}
          className="mb-0"
        >
          <FormInput
            type="email"
            disabled={isEdit}
            {...form.register("email")}
          />
        </FormField>

        <FormRow2>
          <FormField label="Role label" className="mb-0">
            <FormSelect
              value={roleLabel}
              onValueChange={(value) =>
                form.setValue(
                  "roleLabel",
                  value as TrainerForm["roleLabel"],
                  { shouldDirty: true },
                )
              }
              options={roleOptions}
            />
          </FormField>
          <FormField label="Access level" className="mb-0">
            <FormSelect
              value={accessLevel}
              onValueChange={(value) =>
                form.setValue(
                  "accessLevel",
                  value as TrainerForm["accessLevel"],
                  { shouldDirty: true, shouldValidate: true },
                )
              }
              options={[
                { value: "full", label: "Full access" },
                { value: "guest", label: "Guest — temporary access" },
              ]}
            />
          </FormField>
        </FormRow2>

        {accessLevel === "guest" ? (
          <FormField
            label="Access expires"
            error={form.formState.errors.accessExpiresOn?.message}
            className="mb-0"
          >
            <Controller
              control={form.control}
              name="accessExpiresOn"
              render={({ field }) => (
                <DatePicker
                  value={field.value}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                />
              )}
            />
          </FormField>
        ) : null}

        <FormField label="Sector specialisms" className="mb-0">
          <FormAutocomplete
            value=""
            onValueChange={(sectorId) => {
              if (selectedSectorIds.includes(sectorId)) return;
              form.setValue("sectorIds", [...selectedSectorIds, sectorId], {
                shouldDirty: true,
              });
            }}
            options={sectorOptions.filter(
              (option) => !selectedSectorIds.includes(option.value),
            )}
            placeholder="Add sector specialism"
            searchPlaceholder="Search sectors..."
            emptyMessage="No active sector found."
            isLoading={sectors.isFetching}
            onOpenChange={setSpecialismOpen}
            onSearchChange={setSpecialismSearch}
            hasMore={Boolean(sectors.hasNextPage)}
            onLoadMore={() => void sectors.fetchNextPage()}
          />
          {selectedOptions.length ? (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {selectedOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() =>
                    form.setValue(
                      "sectorIds",
                      selectedSectorIds.filter((id) => id !== option.value),
                      { shouldDirty: true },
                    )
                  }
                  aria-label={`Remove ${option.label}`}
                >
                  <Badge tone="blue">{option.label} ×</Badge>
                </button>
              ))}
            </div>
          ) : null}
        </FormField>

        <div className="flex flex-col-reverse gap-2 border-t border-line pt-4 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={() => handleOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            isLoading={isPending}
            loadingLabel={isEdit ? "Saving trainer" : "Sending invite"}
          >
            {isEdit ? "Save changes" : "Send invitation"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function defaults(trainer?: TrainerRecord): TrainerForm {
  return {
    firstName: trainer?.firstName ?? "",
    lastName: trainer?.lastName ?? "",
    email: trainer?.email ?? "",
    roleLabel: trainer?.roleLabel ?? "trainer",
    accessLevel: trainer?.accessLevel ?? "full",
    accessExpiresOn: trainer?.accessExpiresOn?.slice(0, 10) ?? "",
    sectorIds: trainer?.specialisms.map((sector) => sector.id) ?? [],
  };
}

function uniqueOptions(
  options: Array<{ value: string; label: string }>,
) {
  return Array.from(
    new Map(options.map((option) => [option.value, option])).values(),
  );
}
