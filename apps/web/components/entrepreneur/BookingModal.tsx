'use client';

import * as React from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Modal } from '@/components/shared/Modal';
import { FormAutocomplete, FormField, FormRow2, FormSelect, FormTextarea } from '@/components/shared/FormField';
import { Button } from '@/components/shared/Button';
import { DatePicker } from '@/components/shared/DatePicker';
import { bookingSchema, type BookingForm } from '@/lib/forms/schemas';
import { useEntrepreneurStore } from '@/lib/stores/entrepreneur-store';
import { trainers } from '@/lib/mock-data/trainers';

const sessionTypes = [
  { value: 'mentor-checkin', label: '1:1 Mentor check-in (45 min)' },
  { value: 'office-hours', label: 'Office Hours – Group (90 min)' },
  { value: 'investor-prep', label: 'Investor Prep Session (60 min)' },
];

const timeSlots = ['09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '12:00', '14:00', '14:30', '15:00', '15:30', '16:00'];

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
      recipient: 'general',
      trainerId: '',
      topic: '',
      date: '2026-07-08',
      time: '10:00',
      notes: '',
    },
  });

  const recipient = form.watch('recipient');

  React.useEffect(() => {
    if (recipient === 'general' && form.watch('trainerId')) {
      form.setValue('trainerId', '', { shouldValidate: true });
    }
  }, [form, recipient]);

  const onSubmit = (values: BookingForm) => {
    bookSession(values);
    onOpenChange(false);
    form.reset();
  };

  return (
    <Modal open={open} onOpenChange={onOpenChange} title="Book a session" width="wide">
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
            onValueChange={(v) => {
              form.setValue('recipient', v as 'specific' | 'general', { shouldValidate: true });
              if (v === 'specific' && !form.watch('trainerId')) {
                form.setValue('trainerId', trainers[0]?.id ?? '', { shouldValidate: true });
              }
            }}
            options={[
              { value: 'general', label: 'Any available BID team member' },
              { value: 'specific', label: 'A specific trainer' },
            ]}
          />
        </FormField>

        {recipient === 'general' && (
          <div className="mb-4 rounded-xl border border-line bg-surface-subtle px-4 py-3 text-sm leading-6 text-ink-muted">
            This request will go to the BID team queue. The first available team member who accepts it will own the session.
          </div>
        )}

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

        <FormField label="Session topic / goal" error={form.formState.errors.topic?.message}>
          <FormTextarea
            rows={2}
            placeholder="e.g. Review our pricing model before investor outreach"
            {...form.register('topic')}
          />
        </FormField>

        <FormRow2 className="sm:grid-cols-[minmax(0,1fr)_132px]">
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

          <FormField label="Time">
            <FormAutocomplete
              value={form.watch('time')}
              onValueChange={(value) => form.setValue('time', value, { shouldValidate: true })}
              options={timeSlots.map((time) => ({ value: time, label: time }))}
              placeholder="Select time"
              searchPlaceholder="Search time..."
              emptyMessage="No time slot found."
              className="w-[132px]"
              popoverClassName="w-[160px]"
              listClassName="max-h-[176px] overflow-y-auto overflow-x-hidden overscroll-contain touch-pan-y"
            />
          </FormField>
        </FormRow2>

        <FormField label="Notes" optional>
          <FormTextarea
            rows={3}
            placeholder="Add any extra context, links, or preparation notes."
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
