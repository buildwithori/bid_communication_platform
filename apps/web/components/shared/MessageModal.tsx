'use client';

import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Modal } from '@/components/shared/Modal';
import { Button } from '@/components/shared/Button';
import { FormField, FormInput, FormSelect, FormTextarea } from '@/components/shared/FormField';
import { messageSchema, type MessageForm } from '@/lib/forms/schemas';

interface MessageModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  recipientName: string;
  recipientDetail?: string;
  defaultSubject?: string;
  defaultMessage?: string;
  showPriority?: boolean;
  onSubmit?: (
    values: Pick<MessageForm, 'subject' | 'channel' | 'message'>,
  ) => Promise<void> | void;
}

export function MessageModal({
  open,
  onOpenChange,
  recipientName,
  recipientDetail,
  defaultSubject = '',
  defaultMessage = '',
  showPriority = true,
  onSubmit: deliverMessage,
}: MessageModalProps) {
  const form = useForm<MessageForm>({
    resolver: zodResolver(messageSchema),
    values: {
      subject: defaultSubject,
      channel: 'email',
      priority: 'standard',
      message: defaultMessage,
    },
  });
  const channel = useWatch({ control: form.control, name: 'channel' });
  const priority = useWatch({ control: form.control, name: 'priority' });

  const onSubmit = async (values: MessageForm) => {
    if (deliverMessage) {
      await deliverMessage(values);
    } else {
      const channelLabel = values.channel === 'in-app' ? 'In-app message' : 'Email';
      toast.success('Message prepared', {
        description: `${channelLabel} for ${recipientName}`,
      });
    }
    onOpenChange(false);
    form.reset(values);
  };

  return (
    <Modal open={open} onOpenChange={onOpenChange} title="Send message" width="wide">
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="rounded-xl border border-line bg-surface-subtle px-4 py-3">
          <div className="text-sm font-medium text-ink">{recipientName}</div>
          {recipientDetail && <div className="mt-1 text-sm text-ink-muted">{recipientDetail}</div>}
        </div>

        <FormField label="Subject" error={form.formState.errors.subject?.message}>
          <FormInput {...form.register('subject')} placeholder="e.g. Follow-up on programme access" />
        </FormField>

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Channel" error={form.formState.errors.channel?.message}>
            <FormSelect
              value={channel}
              onValueChange={(value) => form.setValue('channel', value as MessageForm['channel'], { shouldValidate: true })}
              options={[
                { value: 'email', label: 'Email' },
                { value: 'in-app', label: 'In-app message' },
              ]}
            />
          </FormField>
          {showPriority && (
            <FormField label="Priority" error={form.formState.errors.priority?.message}>
              <FormSelect
                value={priority}
                onValueChange={(value) => form.setValue('priority', value as MessageForm['priority'], { shouldValidate: true })}
                options={[
                  { value: 'standard', label: 'Standard follow-up' },
                  { value: 'needs-response', label: 'Needs response' },
                  { value: 'urgent', label: 'Urgent issue' },
                ]}
              />
            </FormField>
          )}
        </div>

        <FormField label="Message" error={form.formState.errors.message?.message}>
          <FormTextarea
            rows={6}
            {...form.register('message')}
            placeholder="Write the message the entrepreneur should receive..."
          />
        </FormField>

        <div className="flex flex-col gap-2 border-t border-line pt-4 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            type="submit"
            isLoading={form.formState.isSubmitting}
            loadingLabel="Sending..."
          >
            Send message
          </Button>
        </div>
      </form>
    </Modal>
  );
}
