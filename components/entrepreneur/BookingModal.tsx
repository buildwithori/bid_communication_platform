'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Modal } from '@/components/shared/Modal';
import { FormAutocomplete, FormField, FormInput, FormRow2, FormSelect, FormTextarea } from '@/components/shared/FormField';
import { Button } from '@/components/shared/Button';
import { bookingSchema, type BookingForm } from '@/lib/forms/schemas';
import { useEntrepreneurStore } from '@/lib/stores/entrepreneur-store';
import { trainers } from '@/lib/mock-data/trainers';

const sessionTypes = [
  { value: 'mentor-checkin', label: '1:1 Mentor check-in (45 min)' },
  { value: 'office-hours', label: 'Office Hours – Group (90 min)' },
  { value: 'investor-prep', label: 'Investor Prep Session (60 min)' },
];

const timeSlots = ['09:00', '10:00', '11:00', '14:00', '15:00'];

export function BookingModal({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { bookSession } = useEntrepreneurStore();
  const form = useForm<BookingForm>({
    resolver: zodResolver(bookingSchema),
    defaultValues: {
      sessionType: 'mentor-checkin',
      recipient: 'specific',
      trainerId: trainers[0]?.id ?? '',
      date: '2025-04-14',
      time: '10:00',
      notes: '',
    },
  });

  const recipient = form.watch('recipient');

  const onSubmit = (values: BookingForm) => {
    bookSession(values);
    onOpenChange(false);
    form.reset();
  };

  return (
    <Modal open={open} onOpenChange={onOpenChange} title="Book a session">
      <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col">
        <FormField label="Session type">
          <FormSelect
            value={form.watch('sessionType')}
            onValueChange={(v) => form.setValue('sessionType', v)}
            options={sessionTypes}
          />
        </FormField>

        <FormField label="Who would you like to meet?">
          <FormSelect
            value={form.watch('recipient')}
            onValueChange={(v) => form.setValue('recipient', v as 'specific' | 'general')}
            options={[
              { value: 'specific', label: 'A specific trainer' },
              { value: 'general', label: 'Any available BID team member' },
            ]}
          />
        </FormField>

        {recipient === 'specific' && (
          <FormField label="Trainer">
            <FormAutocomplete
              value={form.watch('trainerId') ?? ''}
              onValueChange={(v) => form.setValue('trainerId', v)}
              options={trainers.map((t) => ({
                value: t.id,
                label: t.fullName,
                description: t.role,
              }))}
              placeholder="Search trainer"
              searchPlaceholder="Search trainers..."
            />
          </FormField>
        )}

        <FormRow2>
          <FormField label="Date" error={form.formState.errors.date?.message}>
            <FormInput type="date" {...form.register('date')} />
          </FormField>

          <FormField label="Time">
            <FormSelect
              value={form.watch('time')}
              onValueChange={(v) => form.setValue('time', v)}
              options={timeSlots.map((t) => ({ value: t, label: t }))}
            />
          </FormField>
        </FormRow2>

        <FormField label="Notes" optional>
          <FormTextarea
            rows={3}
            placeholder="What would you like to discuss?"
            {...form.register('notes')}
          />
        </FormField>

        <Button type="submit" className="mt-1 w-full">
          Request session
        </Button>
      </form>
    </Modal>
  );
}
