"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Modal } from "@/components/shared/Modal";
import { Button } from "@/components/shared/Button";
import { FormField, FormInput, FormRow2 } from "@/components/shared/FormField";
import { adminInviteSchema, type AdminInviteForm } from "@/lib/forms/schemas";

export function AdminInviteModal({
  open,
  isPending,
  onOpenChange,
  onSubmit,
}: {
  open: boolean;
  isPending: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: AdminInviteForm) => void;
}) {
  const form = useForm<AdminInviteForm>({
    resolver: zodResolver(adminInviteSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
    },
  });

  React.useEffect(() => {
    if (!open) form.reset();
  }, [form, open]);

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="Invite admin"
      width="wide"
    >
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormRow2>
          <FormField
            label="First name"
            error={form.formState.errors.firstName?.message}
            className="mb-0"
          >
            <FormInput placeholder="e.g. Ama" {...form.register("firstName")} />
          </FormField>
          <FormField
            label="Last name"
            error={form.formState.errors.lastName?.message}
            className="mb-0"
          >
            <FormInput
              placeholder="e.g. Darko"
              {...form.register("lastName")}
            />
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
              autoComplete="email"
              placeholder="admin@example.com"
              {...form.register("email")}
            />
          </FormField>
          <FormField
            label="Phone"
            optional
            error={form.formState.errors.phone?.message}
            className="mb-0"
          >
            <FormInput
              type="tel"
              autoComplete="tel"
              placeholder="+250 700 000 000"
              {...form.register("phone")}
            />
          </FormField>
        </FormRow2>

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
            loadingLabel="Sending invite"
          >
            Send invite
          </Button>
        </div>
      </form>
    </Modal>
  );
}
