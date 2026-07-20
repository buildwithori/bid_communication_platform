"use client";

import * as React from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Modal } from "@/components/shared/Modal";
import {
  FormAutocomplete,
  FormField,
  FormRow2,
  FormSelect,
  FormTextarea,
} from "@/components/shared/FormField";
import { Button } from "@/components/shared/Button";
import { DatePicker } from "@/components/shared/DatePicker";
import { Notice } from "@/components/shared/PageHeader";
import { bookingSchema, type BookingForm } from "@/lib/forms/schemas";
import { PLATFORM_DEFAULT_TIMEZONE } from "@/lib/timezones";
import { useEntrepreneurProfileQuery } from "@/lib/api/entrepreneurs";
import {
  useCreateSessionMutation,
  useLazySessionTeamMembers,
  useSessionAvailabilityQuery,
  type SessionAvailability,
  type SessionType,
} from "@/lib/api/sessions";

const sessionTypes = [
  { value: "mentor-checkin", label: "1:1 mentor check-in" },
  { value: "office-hours", label: "Office hours" },
  { value: "investor-prep", label: "Investor prep session" },
];

const sessionTypeMap: Record<string, SessionType> = {
  "mentor-checkin": "mentor_checkin",
  "office-hours": "office_hours",
  "investor-prep": "investor_prep",
};

function dateValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return year + "-" + month + "-" + day;
}

function initialDate() {
  const next = new Date();
  next.setDate(next.getDate() + 1);
  return dateValue(next);
}

export function BookingModal({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const profile = useEntrepreneurProfileQuery();
  const timezone = profile.data?.timezone ?? PLATFORM_DEFAULT_TIMEZONE;
  const [teamLookupOpen, setTeamLookupOpen] = React.useState(false);
  const [trainerSearch, setTrainerSearch] = React.useState("");
  const deferredTrainerSearch = React.useDeferredValue(trainerSearch);
  const form = useForm<BookingForm>({
    resolver: zodResolver(bookingSchema),
    defaultValues: {
      sessionType: "mentor-checkin",
      recipient: "general",
      trainerId: "",
      topic: "",
      date: initialDate(),
      time: "",
      notes: "",
    },
  });
  const recipient = useWatch({ control: form.control, name: "recipient" });
  const trainerId =
    useWatch({ control: form.control, name: "trainerId" }) ?? "";
  const selectedDate = useWatch({ control: form.control, name: "date" });
  const sessionType = useWatch({ control: form.control, name: "sessionType" });
  const selectedTime = useWatch({ control: form.control, name: "time" });

  const trainers = useLazySessionTeamMembers({
    enabled: open && recipient === "specific" && teamLookupOpen,
    search: deferredTrainerSearch || undefined,
    take: 20,
    role: "trainer",
  });
  const availabilityQuery = {
    dateFrom: selectedDate,
    dateTo: selectedDate,
    timezone,
    ...(recipient === "specific" && trainerId
      ? { targetUserId: trainerId }
      : {}),
  };
  const availability = useSessionAvailabilityQuery(
    availabilityQuery,
    open &&
      Boolean(selectedDate) &&
      (recipient === "general" || Boolean(trainerId)),
  );
  const createSession = useCreateSessionMutation({
    onSuccess: () => {
      toast.success("Session request sent");
      onOpenChange(false);
      form.reset({
        sessionType: "mentor-checkin",
        recipient: "general",
        trainerId: "",
        topic: "",
        date: initialDate(),
        time: "",
        notes: "",
      });
    },
    onError: (error) => toast.error(error.message),
  });

  React.useEffect(() => {
    form.setValue("time", "", { shouldValidate: false });
    if (recipient === "general") {
      form.setValue("trainerId", "", { shouldValidate: false });
    }
  }, [form, recipient, trainerId, selectedDate]);

  const slotOptions = (availability.data?.slots ?? []).map(
    (slot: SessionAvailability["slots"][number]) => ({
      value: slot.startAt,
      label: new Date(slot.startAt).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        timeZone: timezone,
      }),
      description:
        recipient === "general"
          ? slot.availableTeamMemberCount +
            " BID team member" +
            (slot.availableTeamMemberCount === 1 ? "" : "s") +
            " available"
          : "Selected trainer is available",
    }),
  );

  const onSubmit = (values: BookingForm) => {
    if (values.recipient === "specific" && !values.trainerId) {
      form.setError("trainerId", { message: "Choose a trainer." });
      return;
    }
    const slot = availability.data?.slots.find(
      (item: SessionAvailability["slots"][number]) =>
        item.startAt === values.time,
    );
    if (!slot) {
      form.setError("time", {
        message: "Choose a currently available time.",
      });
      return;
    }
    createSession.mutate({
      type: sessionTypeMap[values.sessionType],
      topic: values.topic,
      notes: values.notes || undefined,
      startAt: slot.startAt,
      endAt: slot.endAt,
      timezone,
      meetingProvider: "google_meet",
      targetType:
        values.recipient === "specific" ? "specific_user" : "open_team",
      targetUserId:
        values.recipient === "specific" ? values.trainerId : undefined,
    });
  };

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="Book a session"
      width="wide"
    >
      <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col">
        <FormField label="Session type">
          <FormSelect
            value={sessionType}
            onValueChange={(value) =>
              form.setValue("sessionType", value, { shouldValidate: true })
            }
            options={sessionTypes}
          />
        </FormField>

        <FormField label="Who would you like to meet?">
          <FormSelect
            value={recipient}
            onValueChange={(value) =>
              form.setValue("recipient", value as "specific" | "general", {
                shouldValidate: true,
              })
            }
            options={[
              {
                value: "general",
                label: "Any available BID team member",
              },
              { value: "specific", label: "A specific trainer" },
            ]}
          />
        </FormField>

        {recipient === "general" ? (
          <div className="mb-4 rounded-xl border border-line bg-surface-subtle px-4 py-3 text-sm leading-6 text-ink-muted">
            Only times with at least one available BID team member are shown.
            The request stays open until an available person accepts it.
          </div>
        ) : (
          <FormField
            label="Trainer"
            error={form.formState.errors.trainerId?.message}
          >
            <FormAutocomplete
              value={trainerId}
              onValueChange={(value) =>
                form.setValue("trainerId", value, {
                  shouldValidate: true,
                })
              }
              options={trainers.rows.map((trainer) => ({
                value: trainer.id,
                label: trainer.name,
                description:
                  trainer.role === "trainer" ? "Trainer" : "BID admin",
              }))}
              placeholder="Search trainer"
              searchPlaceholder="Search connected trainers..."
              emptyMessage="No connected trainer found."
              isLoading={trainers.isLoading || trainers.isFetchingNextPage}
              onOpenChange={setTeamLookupOpen}
              onSearchChange={setTrainerSearch}
              hasMore={Boolean(trainers.hasNextPage)}
              onLoadMore={() => void trainers.fetchNextPage()}
            />
          </FormField>
        )}

        <FormField
          label="Session topic / goal"
          error={form.formState.errors.topic?.message}
        >
          <FormTextarea
            rows={2}
            placeholder="e.g. Review our pricing model before investor outreach"
            {...form.register("topic")}
          />
        </FormField>

        <FormRow2>
          <FormField label="Date" error={form.formState.errors.date?.message}>
            <Controller
              control={form.control}
              name="date"
              render={({ field }) => (
                <DatePicker
                  value={field.value}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                />
              )}
            />
          </FormField>
          <FormField
            label="Available time"
            error={form.formState.errors.time?.message}
          >
            <FormAutocomplete
              value={selectedTime}
              onValueChange={(value) =>
                form.setValue("time", value, { shouldValidate: true })
              }
              options={slotOptions}
              placeholder={
                availability.isLoading
                  ? "Checking calendars..."
                  : "Select available time"
              }
              searchPlaceholder="Search available times..."
              emptyMessage="No available times on this date."
              disabled={
                !selectedDate ||
                (recipient === "specific" && !trainerId) ||
                availability.isError
              }
              isLoading={availability.isLoading}
              loadingMessage="Checking connected calendars..."
              listClassName="max-h-[220px] overflow-y-auto"
            />
          </FormField>
        </FormRow2>

        {availability.isError ? (
          <Notice className="mb-4">
            Availability could not be loaded. {availability.error.message}
          </Notice>
        ) : null}
        {availability.data ? (
          <p className="mb-4 text-xs text-ink-muted">
            Times use {availability.data.timezone}. Default duration:{" "}
            {availability.data.durationMinutes} minutes.
          </p>
        ) : null}

        <FormField label="Notes" optional>
          <FormTextarea
            rows={3}
            placeholder="Add any extra context, links, or preparation notes."
            {...form.register("notes")}
          />
        </FormField>
        <Button
          type="submit"
          className="mt-1 w-full"
          disabled={!selectedTime}
          isLoading={createSession.isPending}
          loadingLabel="Sending request"
        >
          Request session
        </Button>
      </form>
    </Modal>
  );
}
