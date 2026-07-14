'use client';

import * as React from 'react';
import { DatePicker } from '@/components/shared/DatePicker';
import {
  FormAutocomplete,
  FormField,
  FormRow2,
  FormSelect,
  FormTextarea,
} from '@/components/shared/FormField';
import { Button } from '@/components/shared/Button';
import { Modal } from '@/components/shared/Modal';
import { entrepreneurs } from '@/lib/mock-data/entrepreneurs';
import { trainers } from '@/lib/mock-data/trainers';
import type { AdminSession } from '@/lib/mock-data/admin-workflows';

const sessionTypes: Array<{ value: AdminSession['sessionType']; label: string }> = [
  { value: 'Mentoring', label: 'Mentoring' },
  { value: 'Group session', label: 'Group session' },
  { value: 'Investor prep', label: 'Investor prep' },
];

const meetingProviders = [
  { value: 'google-meet', label: 'Google Meet' },
];

const timeSlots = [
  '09:00',
  '09:30',
  '10:00',
  '10:30',
  '11:00',
  '11:30',
  '12:00',
  '12:30',
  '13:00',
  '13:30',
  '14:00',
  '14:30',
  '15:00',
  '15:30',
  '16:00',
  '16:30',
];

export type SessionEditorValues = {
  entrepreneurId: string;
  trainerId?: string;
  trainerName: string;
  sessionType: AdminSession['sessionType'];
  topic: string;
  date: string;
  startTime: string;
  endTime?: string;
  meetingProvider?: AdminSession['meetingProvider'];
  meetingUrl?: string;
  reason?: string;
};

type SessionOption = { value: string; label: string; description?: string };

type SessionEditorModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: 'create' | 'reschedule';
  actor: 'admin' | 'trainer';
  initialSession?: AdminSession | null;
  defaultTrainerId?: string;
  defaultTrainerName?: string;
  entrepreneurOptions?: SessionOption[];
  trainerOptions?: SessionOption[];
  isSubmitting?: boolean;
  onSubmit: (values: SessionEditorValues) => Promise<void> | void;
};

function addMinutes(time: string, minutes: number) {
  const [hour = '0', minute = '0'] = time.split(':');
  const date = new Date(2026, 0, 1, Number(hour), Number(minute));
  date.setMinutes(date.getMinutes() + minutes);
  return date.toTimeString().slice(0, 5);
}

function defaultEndTime(sessionType: AdminSession['sessionType'], startTime: string) {
  if (sessionType === 'Group session') return addMinutes(startTime, 90);
  if (sessionType === 'Investor prep') return addMinutes(startTime, 60);
  return addMinutes(startTime, 45);
}

function createDefaultMeetingUrl(topic: string, date: string) {
  const slug = `${topic || 'bid-session'}-${date || 'date'}`
    .replace(/[^a-z0-9]+/gi, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase();
  return `https://meet.google.com/${slug.slice(0, 32) || 'bid-session'}`;
}

export function SessionEditorModal({
  open,
  onOpenChange,
  mode,
  actor,
  initialSession,
  defaultTrainerId,
  defaultTrainerName,
  entrepreneurOptions,
  trainerOptions,
  isSubmitting = false,
  onSubmit,
}: SessionEditorModalProps) {
  const resolvedEntrepreneurOptions = entrepreneurOptions?.length
    ? entrepreneurOptions
    : entrepreneurs.map((entrepreneur) => ({
        value: entrepreneur.id,
        label: entrepreneur.businessName,
        description: entrepreneur.representative,
      }));
  const resolvedTrainerOptions = trainerOptions?.length
    ? trainerOptions
    : trainers.map((trainer) => ({ value: trainer.id, label: trainer.fullName, description: trainer.role }));
  const defaultEntrepreneurId = resolvedEntrepreneurOptions[0]?.value ?? '';
  const defaultOwnerId = defaultTrainerId ?? resolvedTrainerOptions[0]?.value ?? '';
  const [entrepreneurId, setEntrepreneurId] = React.useState(defaultEntrepreneurId);
  const [trainerId, setTrainerId] = React.useState(defaultOwnerId);
  const [sessionType, setSessionType] = React.useState<AdminSession['sessionType']>('Mentoring');
  const [topic, setTopic] = React.useState('');
  const [date, setDate] = React.useState('2026-07-20');
  const [startTime, setStartTime] = React.useState('10:00');
  const [endTime, setEndTime] = React.useState('10:45');
  const [meetingProvider, setMeetingProvider] = React.useState<NonNullable<AdminSession['meetingProvider']>>('google-meet');
  const [reason, setReason] = React.useState('');
  const [error, setError] = React.useState('');

  React.useEffect(() => {
    if (!open) return;

    setEntrepreneurId(initialSession?.entrepreneurId ?? defaultEntrepreneurId);
    setTrainerId(initialSession?.trainerId ?? defaultOwnerId);
    setSessionType(initialSession?.sessionType ?? 'Mentoring');
    setTopic(initialSession?.topic ?? '');
    setDate(initialSession?.date ?? '2026-07-20');
    setStartTime(initialSession?.startTime ?? '10:00');
    setEndTime(initialSession?.endTime ?? defaultEndTime(initialSession?.sessionType ?? 'Mentoring', initialSession?.startTime ?? '10:00'));
    setMeetingProvider(initialSession?.meetingProvider ?? 'google-meet');
    setReason('');
    setError('');
  }, [defaultEntrepreneurId, defaultOwnerId, initialSession, open]);

  React.useEffect(() => {
    if (mode === 'create') {
      setEndTime(defaultEndTime(sessionType, startTime));
    }
  }, [mode, sessionType, startTime]);

  const selectedTrainer = resolvedTrainerOptions.find((trainer) => trainer.value === trainerId);
  const lockedToTrainer = actor === 'trainer' && Boolean(defaultTrainerId);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!entrepreneurId) {
      setError('Select an entrepreneur.');
      return;
    }
    if (!topic.trim()) {
      setError('Add the session topic or goal.');
      return;
    }
    if (!date || !startTime || !endTime) {
      setError('Pick the session date and time.');
      return;
    }
    if (mode === 'reschedule' && reason.trim().length < 5) {
      setError('Add a short reason for the reschedule.');
      return;
    }

    await onSubmit({
      entrepreneurId,
      trainerId: trainerId || undefined,
      trainerName: selectedTrainer?.label ?? defaultTrainerName ?? 'BID programme team',
      sessionType,
      topic: topic.trim(),
      date,
      startTime,
      endTime,
      meetingProvider,
      meetingUrl: initialSession?.meetingUrl ?? createDefaultMeetingUrl(topic, date),
      reason: reason.trim() || undefined,
    });
  };

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={mode === 'create' ? 'Create session' : 'Reschedule session'}
      width="wide"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <FormField label="Entrepreneur">
          <FormAutocomplete
            value={entrepreneurId}
            onValueChange={setEntrepreneurId}
            options={resolvedEntrepreneurOptions}
            placeholder="Search entrepreneur"
            searchPlaceholder="Search entrepreneurs..."
          />
        </FormField>

        <FormRow2>
          <FormField label="Session type">
            <FormSelect
              value={sessionType}
              onValueChange={(value) => setSessionType(value as AdminSession['sessionType'])}
              options={sessionTypes}
            />
          </FormField>
          <FormField label="Trainer / owner">
            <FormAutocomplete
              value={trainerId}
              onValueChange={setTrainerId}
              options={resolvedTrainerOptions}
              disabled={lockedToTrainer}
              placeholder="Search trainer"
              searchPlaceholder="Search trainers..."
            />
          </FormField>
        </FormRow2>

        <FormField label="Session topic / goal">
          <FormTextarea
            rows={2}
            value={topic}
            onChange={(event) => setTopic(event.target.value)}
            placeholder="e.g. Prepare investor Q&A and next steps"
          />
        </FormField>

        <FormRow2 className="sm:grid-cols-[minmax(0,1fr)_132px_132px]">
          <FormField label="Date">
            <DatePicker value={date} onChange={setDate} />
          </FormField>
          <FormField label="Start">
            <FormAutocomplete
              value={startTime}
              onValueChange={setStartTime}
              options={timeSlots.map((time) => ({ value: time, label: time }))}
              searchPlaceholder="Search time..."
              className="w-[132px]"
              popoverClassName="w-[160px]"
              listClassName="max-h-[176px] overflow-y-auto overflow-x-hidden overscroll-contain touch-pan-y"
            />
          </FormField>
          <FormField label="End">
            <FormAutocomplete
              value={endTime}
              onValueChange={setEndTime}
              options={timeSlots.map((time) => ({ value: time, label: time }))}
              searchPlaceholder="Search time..."
              className="w-[132px]"
              popoverClassName="w-[160px]"
              listClassName="max-h-[176px] overflow-y-auto overflow-x-hidden overscroll-contain touch-pan-y"
            />
          </FormField>
        </FormRow2>

        <div className="grid gap-2 sm:max-w-[280px]">
          <FormField label="Meeting provider">
            <FormSelect
              value={meetingProvider}
              onValueChange={(value) => setMeetingProvider(value as NonNullable<AdminSession['meetingProvider']>)}
              options={meetingProviders}
              className="pointer-events-none bg-surface-subtle text-ink-muted"
            />
          </FormField>
          <p className="-mt-3 text-sm text-ink-muted">
            The meeting link is generated automatically after the session is saved.
          </p>
        </div>

        {mode === 'reschedule' && (
          <FormField label="Reason for rescheduling">
            <FormTextarea
              rows={3}
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder="Explain why the date or time changed. This note is visible in the session history."
            />
          </FormField>
        )}

        {error && <p className="text-sm text-danger">{error}</p>}

        <div className="flex justify-end gap-2 border-t border-line pt-4">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Saving...' : mode === 'create' ? 'Create session' : 'Save reschedule'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
