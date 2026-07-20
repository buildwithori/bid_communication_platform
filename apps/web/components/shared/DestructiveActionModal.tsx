"use client";

import * as React from "react";
import { AlertTriangle, Trash2 } from "lucide-react";
import { Button } from "./Button";
import { FormField, FormInput } from "./FormField";
import { Modal } from "./Modal";

export function DestructiveActionModal({
  open,
  onOpenChange,
  title,
  resourceName,
  description,
  consequences,
  confirmLabel,
  isPending = false,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  resourceName: string;
  description: string;
  consequences: string[];
  confirmLabel: string;
  isPending?: boolean;
  onConfirm: () => void | Promise<void>;
}) {
  const [confirmationState, setConfirmationState] = React.useState({
    resourceName: "",
    value: "",
  });
  const confirmation =
    confirmationState.resourceName === resourceName
      ? confirmationState.value
      : "";
  const resetConfirmation = () =>
    setConfirmationState({ resourceName: "", value: "" });

  const matches = confirmation.trim() === resourceName;

  return (
    <Modal
      open={open}
      onOpenChange={(nextOpen) => {
        if (!isPending) {
          if (!nextOpen) resetConfirmation();
          onOpenChange(nextOpen);
        }
      }}
      title={title}
      width="md"
    >
      <div className="rounded-xl border border-danger/30 bg-danger/5 p-4">
        <div className="flex items-start gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-danger/10 text-danger">
            <AlertTriangle className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <div className="font-semibold text-ink">This action cannot be undone</div>
            <p className="mt-1 text-sm leading-6 text-ink-muted">{description}</p>
          </div>
        </div>
      </div>

      <div className="mt-4 rounded-xl border border-border bg-surface-subtle p-4">
        <div className="text-sm font-semibold text-ink">What will happen</div>
        <ul className="mt-2 space-y-2 text-sm leading-5 text-ink-muted">
          {consequences.map((consequence) => (
            <li key={consequence} className="flex gap-2">
              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-danger" />
              <span>{consequence}</span>
            </li>
          ))}
        </ul>
      </div>

      <FormField
        className="mt-4"
        label={<>Type <span className="font-semibold text-ink">{resourceName}</span> to confirm</>}
      >
        <FormInput
          value={confirmation}
          onChange={(event) =>
            setConfirmationState({
              resourceName,
              value: event.target.value,
            })
          }
          autoComplete="off"
          spellCheck={false}
          placeholder={resourceName}
          disabled={isPending}
        />
      </FormField>

      <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button variant="outline" disabled={isPending} onClick={() => {
            resetConfirmation();
            onOpenChange(false);
          }}>
          Cancel
        </Button>
        <Button
          variant="destructive"
          disabled={!matches || isPending}
          isLoading={isPending}
          loadingLabel="Deleting..."
          onClick={() => {
            void Promise.resolve(onConfirm())
              .then(resetConfirmation)
              .catch(() => undefined);
          }}
        >
          <Trash2 className="h-4 w-4" aria-hidden="true" />
          {confirmLabel}
        </Button>
      </div>
    </Modal>
  );
}
