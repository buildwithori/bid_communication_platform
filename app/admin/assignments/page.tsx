'use client';

import * as React from 'react';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardHeader } from '@/components/shared/Card';
import { FormField, FormInput, FormSelect } from '@/components/shared/FormField';
import { Button } from '@/components/shared/Button';
import { useAdminStore } from '@/lib/stores/admin-store';
import { entrepreneurs as seedEntrepreneurs } from '@/lib/mock-data/entrepreneurs';
import { assignToProgramSchema, type AssignToProgramForm } from '@/lib/forms/schemas';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';

function AssignToProgramForm() {
  const { assignEntrepreneur, programs } = useAdminStore();
  const [selectedEnt, setSelectedEnt] = React.useState('');
  const [entQuery, setEntQuery] = React.useState('');
  const [entOpen, setEntOpen] = React.useState(false);

  const form = useForm<AssignToProgramForm>({
    resolver: zodResolver(assignToProgramSchema),
    defaultValues: {
      entrepreneurId: '',
      programmeId: programs[0]?.id ?? '',
      trainerId: 'none',
    },
  });

  const filtered = seedEntrepreneurs.filter((e) =>
    `${e.representative} ${e.businessName}`.toLowerCase().includes(entQuery.toLowerCase()),
  );

  const onSubmit = (values: AssignToProgramForm) => {
    assignEntrepreneur(values);
    form.reset();
    setSelectedEnt('');
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col">
      <FormField label="Entrepreneur (searchable)">
        <div className="relative">
          <FormInput
            placeholder="Search entrepreneur by name…"
            value={entQuery}
            onChange={(e) => setEntQuery(e.target.value)}
            onFocus={() => setEntOpen(true)}
          />
          {entOpen && (
            <div className="absolute left-0 right-0 top-full z-10 mt-1 max-h-40 overflow-y-auto rounded-lg border border-line-strong bg-surface-panel">
              {filtered.slice(0, 6).map((e) => (
                <button
                  key={e.id}
                  type="button"
                  className="block w-full px-2.5 py-1.5 text-left text-[11px] hover:bg-surface-subtle"
                  onClick={() => {
                    form.setValue('entrepreneurId', e.id);
                    setSelectedEnt(`${e.representative} – ${e.businessName}`);
                    setEntQuery(`${e.representative} – ${e.businessName}`);
                    setEntOpen(false);
                  }}
                >
                  {e.representative} – {e.businessName}
                </button>
              ))}
              {filtered.length === 0 && (
                <div className="px-2.5 py-2 text-[11px] text-ink-faint">No matches.</div>
              )}
            </div>
          )}
        </div>
        {selectedEnt && (
          <div className="mt-1 text-[10px] text-ink-muted">
            Selected: {selectedEnt}
          </div>
        )}
        {form.formState.errors.entrepreneurId && (
          <p className="mt-1 text-[10px] text-danger">
            {form.formState.errors.entrepreneurId.message}
          </p>
        )}
      </FormField>
      <FormField label="Program">
        <FormSelect
          value={form.watch('programmeId')}
          onValueChange={(v) => form.setValue('programmeId', v)}
          options={programs.map((p) => ({ value: p.id, label: p.name }))}
        />
      </FormField>
      <FormField label="Trainer" optional>
        <FormSelect
          value={form.watch('trainerId') ?? 'none'}
          onValueChange={(v) => form.setValue('trainerId', v)}
          options={[
            { value: 'none', label: '— Unassigned —' },
            { value: 't-kofi', label: 'Kofi Mensah – Mentor (8 assigned)' },
            { value: 't-esi', label: 'Esi Adu – Trainer (6 assigned)' },
          ]}
        />
      </FormField>
      <Button type="submit">Assign to program</Button>
    </form>
  );
}

function AssignTrainerForm() {
  const [entId, setEntId] = React.useState('');
  const [trainerId, setTrainerId] = React.useState('');
  const [engagement, setEngagement] = React.useState('Full mentorship');

  const submit = () => {
    if (!entId || !trainerId) {
      toast.error('Please select both an entrepreneur and a trainer.');
      return;
    }
    toast.success('Trainer assigned successfully!');
  };

  return (
    <div className="flex flex-col">
      <FormField label="Entrepreneur (searchable)">
        <FormSelect
          value={entId}
          onValueChange={setEntId}
          options={seedEntrepreneurs.map((e) => ({
            value: e.id,
            label: `${e.representative} – ${e.businessName}`,
          }))}
        />
      </FormField>
      <FormField label="Trainer">
        <FormSelect
          value={trainerId}
          onValueChange={setTrainerId}
          options={[
            { value: 't-kofi', label: 'Kofi Mensah – Mentor' },
            { value: 't-esi', label: 'Esi Adu – Trainer' },
            { value: 't-james', label: 'James Tetteh – Trainer' },
          ]}
        />
      </FormField>
      <FormField label="Engagement type">
        <FormSelect
          value={engagement}
          onValueChange={setEngagement}
          options={[
            { value: 'Full mentorship', label: 'Full mentorship' },
            { value: 'Guest session only', label: 'Guest session only' },
            { value: 'Workshop facilitator', label: 'Workshop facilitator' },
          ]}
        />
      </FormField>
      <Button onClick={submit}>Assign trainer</Button>
    </div>
  );
}

function BulkAssignment() {
  const [trainer, setTrainer] = React.useState('t-kofi');
  return (
    <div className="flex flex-col">
      <div className="mb-2.5 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
        <FormField label="Programme">
          <FormSelect
            value="p-accelerator-c6"
            onValueChange={() => {}}
            options={[{ value: 'p-accelerator-c6', label: 'BID Accelerator – Cohort 6' }]}
          />
        </FormField>
        <FormField label="Assign to trainer">
          <FormSelect
            value={trainer}
            onValueChange={setTrainer}
            options={[
              { value: 't-kofi', label: 'Assign to: Kofi Mensah' },
              { value: 't-esi', label: 'Assign to: Esi Adu' },
            ]}
          />
        </FormField>
      </div>
      <FormField label="Search and select multiple entrepreneurs">
        <FormInput placeholder="Search and select multiple entrepreneurs…" />
      </FormField>
      <Button onClick={() => toast.success('Bulk assignment saved!')}>
        Save bulk assignment
      </Button>
    </div>
  );
}

export default function AdminAssignmentsPage() {
  const { programs } = useAdminStore();
  return (
    <>
      <PageHeader title="Assignments" description="Assign entrepreneurs to programs and trainers" />
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <Card>
          <CardHeader title="Assign to program" />
          <AssignToProgramForm />
        </Card>
        <Card>
          <CardHeader title="Assign to trainer" />
          <AssignTrainerForm />
        </Card>
      </div>
      <Card className="mt-3">
        <CardHeader title="Bulk assignment" />
        <BulkAssignment />
      </Card>
    </>
  );
}
