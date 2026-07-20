"use client";

import * as React from "react";
import { DatePicker } from "@/components/shared/DatePicker";
import {
  FormAutocomplete,
  FormField,
  FormRow2,
  FormSelect,
  FormTextarea,
} from "@/components/shared/FormField";
import { Button } from "@/components/shared/Button";
import { Modal } from "@/components/shared/Modal";
import { Notice } from "@/components/shared/PageHeader";
import { useCurrentUserQuery } from "@/lib/api/auth";
import { PLATFORM_DEFAULT_TIMEZONE } from "@/lib/timezones";
import { useLazyEntrepreneursLookup } from "@/lib/api/entrepreneurs";
import {
  useLazySessionTeamMembers,
  useSessionAvailabilityQuery,
  type SessionAvailability,
  type SessionRecord,
  type SessionType,
} from "@/lib/api/sessions";

const sessionTypes = [
  { value: "mentor_checkin", label: "Mentor check-in" },
  { value: "office_hours", label: "Office hours" },
  { value: "investor_prep", label: "Investor prep" },
];

export type SessionEditorValues = {
  entrepreneurUserId: string;
  ownerUserId: string;
  type: SessionType;
  topic: string;
  startAt: string;
  endAt: string;
  timezone: string;
  reason?: string;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "reschedule";
  actor: "admin" | "trainer";
  initialSession?: SessionRecord | null;
  onSubmit: (values: SessionEditorValues) => void;
  isSubmitting?: boolean;
};

function dateValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return year + "-" + month + "-" + day;
}

function initialDate() {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  return dateValue(date);
}

export function SessionEditorModal(props: Props) {
  const formKey = [
    props.open ? "open" : "closed",
    props.mode,
    props.actor,
    props.initialSession?.id ?? "new",
    props.initialSession?.startAt ?? "",
  ].join(":");
  return <SessionEditorModalForm key={formKey} {...props} />;
}

function SessionEditorModalForm({
  open,
  onOpenChange,
  mode,
  actor,
  initialSession,
  onSubmit,
  isSubmitting = false,
}: Props) {
  const currentUser = useCurrentUserQuery();
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone ||
    PLATFORM_DEFAULT_TIMEZONE;
  const initialStartAt = initialSession
    ? new Date(initialSession.startAt)
    : null;
  const [entrepreneurId, setEntrepreneurId] = React.useState(
    initialSession?.entrepreneurUserId ?? "",
  );
  const [ownerId, setOwnerId] = React.useState(
    initialSession?.ownerUserId ?? "",
  );
  const [sessionType, setSessionType] = React.useState<SessionType>(
    initialSession?.type ?? "mentor_checkin",
  );
  const [topic, setTopic] = React.useState(initialSession?.topic ?? "");
  const [date, setDate] = React.useState(
    initialStartAt ? dateValue(initialStartAt) : initialDate(),
  );
  const [slotStartAt, setSlotStartAt] = React.useState("");
  const [reason, setReason] = React.useState("");
  const [error, setError] = React.useState("");
  const [entrepreneurSearch, setEntrepreneurSearch] = React.useState("");
  const [ownerSearch, setOwnerSearch] = React.useState("");

  const entrepreneurs = useLazyEntrepreneursLookup({
    enabled: open && mode === "create",
    search: entrepreneurSearch || undefined,
    take: 20,
  });
  const owners = useLazySessionTeamMembers({
    enabled: open && actor === "admin" && mode === "create",
    search: ownerSearch || undefined,
    take: 20,
  });
  const effectiveOwnerId =
    mode === "reschedule"
      ? (initialSession?.ownerUserId ?? "")
      : actor === "trainer"
        ? (currentUser.data?.user?.id ?? "")
        : ownerId;
  const availability = useSessionAvailabilityQuery(
    {
      dateFrom: date,
      dateTo: date,
      timezone,
      targetUserId: effectiveOwnerId,
    },
    open && Boolean(date) && Boolean(effectiveOwnerId),
  );

  const entrepreneurOptions = [
    ...(initialSession
      ? [
          {
            value: initialSession.entrepreneurUserId,
            label: initialSession.entrepreneur.businessName,
            description: initialSession.entrepreneur.name,
          },
        ]
      : []),
    ...entrepreneurs.rows
      .filter(
        (entry) =>
          entry.entrepreneurUserId !== initialSession?.entrepreneurUserId,
      )
      .map((entry) => ({
        value: entry.entrepreneurUserId,
        label: entry.businessName,
        description: entry.representativeName,
      })),
  ];
  const ownerOptions = [
    ...(initialSession?.owner
      ? [
          {
            value: initialSession.owner.id,
            label: initialSession.owner.name,
            description:
              initialSession.owner.role === "trainer" ? "Trainer" : "BID admin",
          },
        ]
      : []),
    ...owners.rows
      .filter((entry) => entry.id !== initialSession?.ownerUserId)
      .map((entry) => ({
        value: entry.id,
        label: entry.name,
        description: entry.role === "trainer" ? "Trainer" : "BID admin",
      })),
  ];
  const slotOptions = (availability.data?.slots ?? []).map(
    (slot: SessionAvailability["slots"][number]) => ({
      value: slot.startAt,
      label: new Date(slot.startAt).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
    }),
  );

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const slot = availability.data?.slots.find(
      (entry: SessionAvailability["slots"][number]) =>
        entry.startAt === slotStartAt,
    );
    if (!entrepreneurId || !effectiveOwnerId) {
      setError("Choose an entrepreneur and a calendar-connected owner.");
      return;
    }
    if (!topic.trim()) {
      setError("Add the session topic or goal.");
      return;
    }
    if (!slot) {
      setError("Choose a currently available calendar slot.");
      return;
    }
    if (mode === "reschedule" && reason.trim().length < 5) {
      setError("Add a short reason for the reschedule.");
      return;
    }
    setError("");
    onSubmit({
      entrepreneurUserId: entrepreneurId,
      ownerUserId: effectiveOwnerId,
      type: sessionType,
      topic: topic.trim(),
      startAt: slot.startAt,
      endAt: slot.endAt,
      timezone,
      reason: reason.trim() || undefined,
    });
  };

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={mode === "create" ? "Create session" : "Reschedule session"}
      width="wide"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <FormField label="Entrepreneur">
          <FormAutocomplete
            value={entrepreneurId}
            onValueChange={setEntrepreneurId}
            options={entrepreneurOptions}
            disabled={mode === "reschedule"}
            placeholder="Search entrepreneur"
            searchPlaceholder="Search entrepreneurs..."
            isLoading={
              entrepreneurs.isLoading || entrepreneurs.isFetchingNextPage
            }
            onSearchChange={setEntrepreneurSearch}
            hasMore={Boolean(entrepreneurs.hasNextPage)}
            onLoadMore={() => void entrepreneurs.fetchNextPage()}
          />
        </FormField>

        <FormRow2>
          <FormField label="Session type">
            <FormSelect
              value={sessionType}
              onValueChange={(value) => setSessionType(value as SessionType)}
              options={sessionTypes}
              disabled={mode === "reschedule"}
            />
          </FormField>
          <FormField label="Calendar owner">
            {actor === "trainer" ? (
              <div className="flex h-10 items-center rounded-lg border border-line bg-surface-subtle px-3 text-sm text-ink-muted">
                You will own this session
              </div>
            ) : (
              <FormAutocomplete
                value={effectiveOwnerId}
                onValueChange={(nextOwnerId) => {
                  setOwnerId(nextOwnerId);
                  setSlotStartAt("");
                }}
                options={ownerOptions}
                disabled={mode === "reschedule"}
                placeholder="Search connected team members"
                searchPlaceholder="Search team members..."
                isLoading={owners.isLoading || owners.isFetchingNextPage}
                onSearchChange={setOwnerSearch}
                hasMore={Boolean(owners.hasNextPage)}
                onLoadMore={() => void owners.fetchNextPage()}
              />
            )}
          </FormField>
        </FormRow2>

        <FormField label="Session topic / goal">
          <FormTextarea
            rows={2}
            value={topic}
            onChange={(event) => setTopic(event.target.value)}
            disabled={mode === "reschedule"}
            placeholder="e.g. Prepare investor Q&A and next steps"
          />
        </FormField>

        <FormRow2>
          <FormField label="Date">
            <DatePicker
              value={date}
              onChange={(nextDate) => {
                setDate(nextDate);
                setSlotStartAt("");
              }}
            />
          </FormField>
          <FormField label="Available time">
            <FormAutocomplete
              value={slotStartAt}
              onValueChange={setSlotStartAt}
              options={slotOptions}
              placeholder={
                availability.isLoading
                  ? "Checking calendar..."
                  : "Select available time"
              }
              searchPlaceholder="Search available times..."
              emptyMessage="No available times on this date."
              disabled={!effectiveOwnerId || availability.isError}
              isLoading={availability.isLoading}
              loadingMessage="Checking connected calendar..."
            />
          </FormField>
        </FormRow2>

        {availability.data ? (
          <p className="text-sm text-ink-muted">
            Google Meet is created automatically. Default duration:{" "}
            {availability.data.durationMinutes} minutes.
          </p>
        ) : null}
        {availability.isError ? (
          <Notice>{availability.error.message}</Notice>
        ) : null}

        {mode === "reschedule" ? (
          <FormField label="Reason for rescheduling">
            <FormTextarea
              rows={3}
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder="Explain why the date or time changed."
            />
          </FormField>
        ) : null}

        {error ? <p className="text-sm text-danger">{error}</p> : null}
        <div className="flex justify-end gap-2 border-t border-line pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            isLoading={isSubmitting}
            loadingLabel={
              mode === "create" ? "Creating session" : "Updating Calendar"
            }
          >
            {mode === "create" ? "Create session" : "Save reschedule"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
