"use client";

import * as React from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Badge } from "@/components/shared/Badge";
import { Button } from "@/components/shared/Button";
import {
  FormAutocomplete,
  FormField,
  FormInput,
  FormRow2,
} from "@/components/shared/FormField";
import { Modal } from "@/components/shared/Modal";
import {
  useLazyGrantableProgrammesQuery,
  type EntrepreneurRecord,
} from "@/lib/api/entrepreneurs";
import {
  useLazyBusinessStagesQuery,
  useLazySectorsQuery,
} from "@/lib/api/settings";
import {
  entrepreneurProfileSchema,
  type EntrepreneurProfileForm,
} from "@/lib/forms/schemas";
import { countryOptions } from "@/lib/countries";

export function EntrepreneurFormModal({
  open,
  onOpenChange,
  entrepreneur,
  isPending,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entrepreneur?: EntrepreneurRecord;
  isPending: boolean;
  onSubmit: (values: EntrepreneurProfileForm) => void;
}) {
  const isEdit = Boolean(entrepreneur);
  const [sectorLookup, setSectorLookup] = React.useState({
    search: "",
  });
  const [stageLookup, setStageLookup] = React.useState({
    search: "",
  });
  const [programmeLookup, setProgrammeLookup] = React.useState({
    search: "",
  });
  const sectors = useLazySectorsQuery({
    enabled: open,
    search: sectorLookup.search || undefined,
    active: true,
    take: 20,
  });
  const stages = useLazyBusinessStagesQuery({
    enabled: open,
    search: stageLookup.search || undefined,
    active: true,
    take: 20,
  });
  const programmes = useLazyGrantableProgrammesQuery({
    enabled: open && !isEdit,
    search: programmeLookup.search || undefined,
  });
  const form = useForm<EntrepreneurProfileForm>({
    resolver: zodResolver(entrepreneurProfileSchema),
    defaultValues: defaults(entrepreneur),
  });

  React.useEffect(() => {
    if (open) form.reset(defaults(entrepreneur));
  }, [entrepreneur, form, open]);

  const programmeIds =
    useWatch({ control: form.control, name: "programmeIds" }) ?? [];
  const country = useWatch({ control: form.control, name: "country" });
  const sectorId = useWatch({ control: form.control, name: "sectorId" });
  const stageId = useWatch({ control: form.control, name: "stageId" });
  const programmeOptions = programmes.rows.map((item) => ({
    value: item.id,
    label: item.name,
  }));
  const sectorOptions = unique([
    { value: "", label: "Not set" },
    ...(entrepreneur?.sector
      ? [{ value: entrepreneur.sector.id, label: entrepreneur.sector.name }]
      : []),
    ...(sectors.data?.pages.flatMap((page) => page.items) ?? []).map(
      (item) => ({ value: item.id, label: item.name }),
    ),
  ]);
  const stageOptions = unique([
    { value: "", label: "Not set" },
    ...(entrepreneur?.stage
      ? [
          {
            value: entrepreneur.stage.id,
            label: entrepreneur.stage.name,
            description: entrepreneur.stage.definition,
          },
        ]
      : []),
    ...(stages.data?.pages.flatMap((page) => page.items) ?? []).map((item) => ({
      value: item.id,
      label: item.name,
      description: item.definition,
    })),
  ]);

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={
        isEdit ? `Edit ${entrepreneur?.businessName}` : "Invite entrepreneur"
      }
      width="wide"
    >
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          label="Business name"
          error={form.formState.errors.businessName?.message}
          className="mb-0"
        >
          <FormInput {...form.register("businessName")} />
        </FormField>
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
        <FormRow2>
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
          <FormField label="Phone" className="mb-0">
            <FormInput {...form.register("phone")} />
          </FormField>
        </FormRow2>
        <FormField label="Country" className="mb-0">
          <FormAutocomplete
            value={country}
            onValueChange={(value) =>
              form.setValue(
                "country",
                value as EntrepreneurProfileForm["country"],
                { shouldDirty: true },
              )
            }
            options={countryOptions}
            placeholder="Select country"
            searchPlaceholder="Search countries..."
            emptyMessage="No country found."
          />
        </FormField>
        <FormRow2>
          <FormField label="Sector" optional className="mb-0">
            <FormAutocomplete
              value={sectorId ?? ""}
              onValueChange={(value) =>
                form.setValue("sectorId", value, { shouldDirty: true })
              }
              options={sectorOptions}
              placeholder="Select sector"
              searchPlaceholder="Search sectors..."
              emptyMessage="No active sector found."
              isLoading={sectors.isFetching}
              onSearchChange={(search) =>
                setSectorLookup((state) => ({ ...state, search }))
              }
              hasMore={Boolean(sectors.hasNextPage)}
              onLoadMore={() => void sectors.fetchNextPage()}
            />
          </FormField>
          <FormField label="Business stage" optional className="mb-0">
            <FormAutocomplete
              value={stageId ?? ""}
              onValueChange={(value) =>
                form.setValue("stageId", value, { shouldDirty: true })
              }
              options={stageOptions}
              placeholder="Select stage"
              searchPlaceholder="Search stages..."
              emptyMessage="No active stage found."
              isLoading={stages.isFetching}
              onSearchChange={(search) =>
                setStageLookup((state) => ({ ...state, search }))
              }
              hasMore={Boolean(stages.hasNextPage)}
              onLoadMore={() => void stages.fetchNextPage()}
            />
          </FormField>
        </FormRow2>
        {!isEdit ? (
          <FormField label="Initial programmes" optional className="mb-0">
            <FormAutocomplete
              value=""
              onValueChange={(value) =>
                !programmeIds.includes(value) &&
                form.setValue("programmeIds", [...programmeIds, value], {
                  shouldDirty: true,
                })
              }
              options={programmeOptions.filter(
                (option) => !programmeIds.includes(option.value),
              )}
              placeholder="Add a programme"
              searchPlaceholder="Search published programmes..."
              emptyMessage="No grantable programme found."
              isLoading={programmes.isFetching}
              onSearchChange={(search) =>
                setProgrammeLookup((state) => ({ ...state, search }))
              }
              hasMore={Boolean(programmes.hasNextPage)}
              onLoadMore={() => void programmes.fetchNextPage()}
            />
            {programmeIds.length ? (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {programmeIds.map((id) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() =>
                      form.setValue(
                        "programmeIds",
                        programmeIds.filter((value) => value !== id),
                        { shouldDirty: true },
                      )
                    }
                  >
                    <Badge tone="blue">
                      {programmeOptions.find((item) => item.value === id)
                        ?.label ?? "Selected programme"}{" "}
                      ×
                    </Badge>
                  </button>
                ))}
              </div>
            ) : null}
          </FormField>
        ) : null}
        <div className="flex flex-col-reverse gap-2 border-t border-line pt-4 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            isLoading={isPending}
            loadingLabel={isEdit ? "Saving..." : "Sending invitation..."}
          >
            {isEdit ? "Save changes" : "Send invitation"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function defaults(entrepreneur?: EntrepreneurRecord): EntrepreneurProfileForm {
  return {
    businessName: entrepreneur?.businessName ?? "",
    firstName: entrepreneur?.firstName ?? "",
    lastName: entrepreneur?.lastName ?? "",
    email: entrepreneur?.email ?? "",
    phone: entrepreneur?.phone ?? "",
    country:
      (entrepreneur?.country as EntrepreneurProfileForm["country"]) ?? "Ghana",
    sectorId: entrepreneur?.sector?.id ?? "",
    stageId: entrepreneur?.stage?.id ?? "",
    programmeIds: [],
  };
}

function unique<T extends { value: string }>(items: T[]) {
  return items.filter(
    (item, index) =>
      items.findIndex((candidate) => candidate.value === item.value) === index,
  );
}
