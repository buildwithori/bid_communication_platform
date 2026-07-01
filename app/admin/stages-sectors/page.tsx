'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { X } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardHeader } from '@/components/shared/Card';
import { Badge } from '@/components/shared/Badge';
import { Button } from '@/components/shared/Button';
import { FormField, FormInput, FormTextarea } from '@/components/shared/FormField';
import { useAdminStore } from '@/lib/stores/admin-store';
import {
  newSectorSchema,
  stageDefinitionSchema,
  type NewSectorForm,
  type StageDefinitionForm,
} from '@/lib/forms/schemas';
import { toast } from 'sonner';

export default function AdminStagesSectorsPage() {
  const { sectors, stages, addSector, removeSector, updateStageDefinitions } = useAdminStore();
  const stageForm = useForm<StageDefinitionForm>({
    resolver: zodResolver(stageDefinitionSchema),
    defaultValues: {
      idea: stages.find((stage) => stage.id === 'idea')?.definition ?? '',
      growth: stages.find((stage) => stage.id === 'growth')?.definition ?? '',
      scale: stages.find((stage) => stage.id === 'scale')?.definition ?? '',
    },
  });
  const sectorForm = useForm<NewSectorForm>({
    resolver: zodResolver(newSectorSchema),
    defaultValues: { label: '' },
  });

  return (
    <>
      <PageHeader title="Stages & sectors" description="Define what each business stage means, and manage the sector list" />
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        {/* Stage definitions */}
        <Card>
          <CardHeader title="Business stage definitions" />
          <form
            onSubmit={stageForm.handleSubmit((values) => {
              updateStageDefinitions(values);
            })}
          >
            {stages.map((s) => (
              <FormField
                label={s.label}
                key={s.id}
                error={stageForm.formState.errors[s.id]?.message}
              >
                <FormTextarea
                  rows={2}
                  {...stageForm.register(s.id)}
                />
              </FormField>
            ))}
            <div className="flex gap-1.5">
              <Button type="submit">Save definitions</Button>
              <Button type="button" variant="outline" onClick={() => toast.success('Stage creation flow will connect when backend settings are added.')}>
                + Add new stage
              </Button>
            </div>
          </form>
        </Card>

        {/* Sectors */}
        <Card>
          <CardHeader title="Sectors" />
          <div className="mb-3 flex flex-wrap gap-1.5">
            {sectors.map((s) => (
              <span
                key={s.id}
                className="inline-flex items-center rounded-full bg-bid-light px-2 py-0.5 text-[10px] text-bid-dark"
              >
                {s.label}
                <button
                  type="button"
                  onClick={() => removeSector(s.id)}
                  className="ml-1 cursor-pointer"
                  aria-label={`Remove ${s.label} sector`}
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
          <form
            onSubmit={sectorForm.handleSubmit((values) => {
              addSector(values.label.trim());
              sectorForm.reset({ label: '' });
            })}
          >
            <FormField label="Add new sector" error={sectorForm.formState.errors.label?.message}>
              <FormInput
                placeholder="e.g. Renewable Energy"
                {...sectorForm.register('label')}
              />
            </FormField>
            <Button type="submit">Add sector</Button>
          </form>
        </Card>
      </div>
    </>
  );
}
