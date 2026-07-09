'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Modal } from '@/components/shared/Modal';
import { Button } from '@/components/shared/Button';
import { FormField, FormInput, FormRow2, FormTextarea } from '@/components/shared/FormField';
import { adminInviteSchema, type AdminInviteForm } from '@/lib/forms/schemas';

export function AdminInviteModal({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const form = useForm<AdminInviteForm>({
    resolver: zodResolver(adminInviteSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      note: '',
    },
  });

  React.useEffect(() => {
    if (!open) {
      form.reset();
    }
  }, [form, open]);

  const onSubmit = (values: AdminInviteForm) => {
    toast.success(`Admin invite prepared for ${values.email}`);
    onOpenChange(false);
  };

  return (
    <Modal open={open} onOpenChange={onOpenChange} title="Invite admin" width="wide">
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormRow2>
          <FormField label="First name" error={form.formState.errors.firstName?.message} className="mb-0">
            <FormInput placeholder="e.g. Ama" {...form.register('firstName')} />
          </FormField>
          <FormField label="Last name" error={form.formState.errors.lastName?.message} className="mb-0">
            <FormInput placeholder="e.g. Darko" {...form.register('lastName')} />
          </FormField>
        </FormRow2>

        <FormField label="Email" error={form.formState.errors.email?.message} className="mb-0">
          <FormInput type="email" placeholder="admin@example.com" {...form.register('email')} />
        </FormField>

        <FormField label="Invitation note" optional error={form.formState.errors.note?.message} className="mb-0">
          <FormTextarea
            rows={4}
            placeholder="Add context for the invited admin."
            {...form.register('note')}
          />
        </FormField>

        <div className="flex flex-col-reverse gap-2 border-t border-line pt-4 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit">Send invite</Button>
        </div>
      </form>
    </Modal>
  );
}
