'use client';

import { UploadCloud } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Modal } from '@/components/shared/Modal';
import { FormField, FormTextarea, FormInput } from '@/components/shared/FormField';
import { Button } from '@/components/shared/Button';
import { deliverableSchema, type DeliverableForm } from '@/lib/forms/schemas';
import { useEntrepreneurStore } from '@/lib/stores/entrepreneur-store';

export function UploadDeliverableModal({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { submitDeliverable } = useEntrepreneurStore();
  const form = useForm<DeliverableForm>({
    resolver: zodResolver(deliverableSchema),
    defaultValues: { name: '', notes: '' },
  });

  const onSubmit = (values: DeliverableForm) => {
    submitDeliverable(values);
    onOpenChange(false);
    form.reset();
  };

  return (
    <Modal open={open} onOpenChange={onOpenChange} title="Upload deliverable">
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <FormField label="Deliverable name" error={form.formState.errors.name?.message}>
          <FormInput
            placeholder="e.g. Business Model Canvas, Financial Statements"
            {...form.register('name')}
          />
        </FormField>
        <button
          type="button"
          onClick={() => import('sonner').then(({ toast }) => toast.info('File picker will connect when storage is added.'))}
          className="mb-3 flex w-full flex-col items-center rounded-bid border-[1.5px] border-dashed border-line-strong px-5 py-5 text-center transition-colors hover:border-bid hover:bg-bid-light"
          aria-label="Upload file"
        >
          <UploadCloud className="mx-auto mb-1 h-6 w-6 text-bid" />
          <span className="text-[11px] text-ink-muted">
            Click to browse or drag a file here
          </span>
          <span className="mt-0.5 text-[11px] font-semibold text-bid">
            PDF, PPTX, DOCX, XLSX up to 25 MB
          </span>
        </button>
        <FormField label="Notes" optional>
          <FormTextarea
            rows={3}
            placeholder="Any context for this submission…"
            {...form.register('notes')}
          />
        </FormField>
        <Button type="submit" className="mt-1 w-full">
          Submit deliverable
        </Button>
      </form>
    </Modal>
  );
}
