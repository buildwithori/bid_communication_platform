'use client';

import * as React from 'react';
import { X } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardHeader } from '@/components/shared/Card';
import { Badge } from '@/components/shared/Badge';
import { Button } from '@/components/shared/Button';
import { FormField, FormInput, FormTextarea } from '@/components/shared/FormField';
import { useAdminStore } from '@/lib/stores/admin-store';
import { toast } from 'sonner';

export default function AdminStagesSectorsPage() {
  const { sectors, stages, addSector, removeSector, updateStageDefinitions } = useAdminStore();
  const [newSectorName, setNewSectorName] = React.useState('');
  const [defs, setDefs] = React.useState<Record<string, string>>(
    Object.fromEntries(stages.map((s) => [s.id, s.definition])),
  );

  const addSectorHandler = () => {
    if (!newSectorName.trim()) return;
    addSector(newSectorName.trim());
    setNewSectorName('');
  };

  const saveDefs = () => {
    updateStageDefinitions(defs);
  };

  return (
    <>
      <PageHeader title="Stages & sectors" description="Define what each business stage means, and manage the sector list" />
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        {/* Stage definitions */}
        <Card>
          <CardHeader title="Business stage definitions" />
          {stages.map((s) => (
            <FormField label={s.label} key={s.id}>
              <FormTextarea
                rows={2}
                value={defs[s.id] ?? ''}
                onChange={(e) => setDefs((curr) => ({ ...curr, [s.id]: e.target.value }))}
              />
            </FormField>
          ))}
          <div className="flex gap-1.5">
            <Button onClick={saveDefs}>Save definitions</Button>
            <Button variant="outline" onClick={() => toast.success('New stage added')}>
              + Add new stage
            </Button>
          </div>
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
          <FormField label="Add new sector">
            <FormInput
              placeholder="e.g. Renewable Energy"
              value={newSectorName}
              onChange={(e) => setNewSectorName(e.target.value)}
            />
          </FormField>
          <Button onClick={addSectorHandler}>Add sector</Button>
        </Card>
      </div>
    </>
  );
}
