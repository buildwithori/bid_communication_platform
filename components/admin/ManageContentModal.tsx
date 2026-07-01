'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { PlayCircle, FileText, Wrench, Check } from 'lucide-react';
import { Modal } from '@/components/shared/Modal';
import { FormField, FormInput, FormSelect } from '@/components/shared/FormField';
import { Notice } from '@/components/shared/PageHeader';
import { Button } from '@/components/shared/Button';
import { useAdminStore } from '@/lib/stores/admin-store';
import { contentItemSchema, type ContentItemForm } from '@/lib/forms/schemas';
import type { Module, ContentItem } from '@/types';

const typeMeta = {
  video: { icon: PlayCircle, bg: 'bg-bid-light', fg: 'text-bid' },
  pdf: { icon: FileText, bg: 'bg-info-light', fg: 'text-info' },
  tool: { icon: Wrench, bg: 'bg-success-light', fg: 'text-success-dark' },
};

export function ManageContentModal({
  open,
  onOpenChange,
  module: mod,
  onAddItem,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  module?: Module;
  onAddItem: () => void;
}) {
  const { contentItems } = useAdminStore();
  if (!mod) return null;
  const items = contentItems.filter((c) => c.moduleId === mod.id);

  return (
    <Modal open={open} onOpenChange={onOpenChange} title={`Manage content — ${mod.title}`} width="wide">
      <div className="flex flex-col gap-2">
        {items.map((item) => {
          const meta = typeMeta[item.type];
          const Icon = meta.icon;
          return (
            <div
              key={item.id}
              className="flex items-center gap-2.5 rounded-lg border border-line px-3 py-2.5"
            >
              <span
                className={`flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-[7px] ${meta.bg}`}
              >
                <Icon className={`h-3.5 w-3.5 ${meta.fg}`} strokeWidth={1.5} />
              </span>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-medium leading-tight">
                  {item.chapter}: {item.title}
                </div>
                <div className="mt-0.5 text-[10px] text-ink-muted">{item.durationLabel}</div>
              </div>
              <div className="flex gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => import('sonner').then(({ toast }) => toast.info(`Previewing: ${item.title}`))}
                >
                  Preview
                </Button>
                <Button variant="outline" size="sm">
                  Edit
                </Button>
              </div>
            </div>
          );
        })}
        {items.length === 0 && (
          <p className="py-4 text-center text-[11px] text-ink-faint">
            No content items yet — add the first one below.
          </p>
        )}
      </div>
      <Button className="mt-1.5" onClick={onAddItem}>
        + Add content item
      </Button>
    </Modal>
  );
}

export function AddContentItemModal({
  open,
  onOpenChange,
  module,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  module?: Module;
}) {
  const { addContentItem } = useAdminStore();
  const form = useForm<ContentItemForm>({
    resolver: zodResolver(contentItemSchema),
    defaultValues: { title: '', type: 'video' },
  });

  if (!module) return null;

  const handleSubmit = (values: ContentItemForm) => {
    addContentItem(module.id, values.title, values.type);
    form.reset({ title: '', type: 'video' });
    onOpenChange(false);
  };

  return (
    <Modal open={open} onOpenChange={onOpenChange} title="Add content item">
      <form onSubmit={form.handleSubmit(handleSubmit)}>
        <FormField label="Chapter title" error={form.formState.errors.title?.message}>
          <FormInput
            placeholder="e.g. Chapter 3: Testing your hypothesis"
            {...form.register('title')}
          />
        </FormField>
        <FormField label="Content type" error={form.formState.errors.type?.message}>
          <FormSelect
            value={form.watch('type')}
            onValueChange={(value) => form.setValue('type', value as ContentItem['type'], { shouldValidate: true })}
            options={[
              { value: 'video', label: 'Video' },
              { value: 'pdf', label: 'PDF resource' },
              { value: 'tool', label: 'Embedded tool' },
            ]}
          />
        </FormField>
        <button
          type="button"
          onClick={() => import('sonner').then(({ toast }) => toast.info('File picker will connect when storage is added.'))}
          className="mb-3 flex w-full flex-col items-center rounded-bid border-[1.5px] border-dashed border-line-strong px-5 py-5 text-center transition-colors hover:border-bid hover:bg-bid-light"
          aria-label="Upload file"
        >
          <span className="text-sm text-ink-muted">Upload or select from content library</span>
          <strong className="mt-0.5 text-sm text-bid">MP4, PDF, or paste tool link</strong>
        </button>
        <Button type="submit" className="w-full">
          Add to module
        </Button>
      </form>
    </Modal>
  );
}
