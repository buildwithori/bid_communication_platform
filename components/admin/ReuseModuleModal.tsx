'use client';

import { Modal } from '@/components/shared/Modal';
import { FormField, FormSelect } from '@/components/shared/FormField';
import { Notice } from '@/components/shared/PageHeader';
import { Button } from '@/components/shared/Button';
import { useAdminStore } from '@/lib/stores/admin-store';
import { useState } from 'react';

export function ReuseModuleModal({
  open,
  onOpenChange,
  programId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  programId: string;
}) {
  const { modules } = useAdminStore();
  const [selected, setSelected] = useState('');
  const reusable = modules.filter((m) => !m.contentItemIds.includes(programId));

  return (
    <Modal open={open} onOpenChange={onOpenChange} title="Reuse existing module">
      <FormField label="Select module to add into this programme">
        <FormSelect
          value={selected}
          onValueChange={setSelected}
          options={reusable.map((m) => ({
            value: m.id,
            label: `${m.title}${m.reuseCount ? ` (used in ${m.reuseCount} programmes)` : ''}`,
          }))}
        />
      </FormField>
      <Notice>
        This adds the same module (and its content) into this programme too — edits to
        the content will apply everywhere it&apos;s used.
      </Notice>
      <Button
        className="w-full"
        onClick={() => {
          onOpenChange(false);
          import('sonner').then(({ toast }) => toast.success('Module added to programme!'));
        }}
      >
        Add module
      </Button>
    </Modal>
  );
}
