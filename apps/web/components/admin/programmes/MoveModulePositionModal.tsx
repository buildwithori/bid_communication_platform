'use client';

import * as React from 'react';
import { Button } from '@/components/shared/Button';
import { FormField, FormInput } from '@/components/shared/FormField';
import { Modal } from '@/components/shared/Modal';

type MoveModule = { id: string; title: string };
type MoveProgramme = { name: string };

export function MoveModulePositionModal({
  open,
  onOpenChange,
  module,
  program,
  currentPosition,
  totalModules,
  onMove,
  isPending = false,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  module: MoveModule | null;
  program: MoveProgramme | null;
  currentPosition: number;
  totalModules: number;
  onMove: (position: number) => void | Promise<void>;
  isPending?: boolean;
}) {
  const [position, setPosition] = React.useState(() =>
    currentPosition ? String(currentPosition) : '',
  );
  const [error, setError] = React.useState('');
  const [submitting, setSubmitting] = React.useState(false);
  const busy = isPending || submitting;


  if (!module || !program) return null;

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextPosition = Number(position);

    if (
      !Number.isInteger(nextPosition) ||
      nextPosition < 1 ||
      nextPosition > totalModules
    ) {
      setError(`Enter a number from 1 to ${totalModules}.`);
      return;
    }

    setSubmitting(true);
    try {
      await onMove(nextPosition);
      onOpenChange(false);
    } catch {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      onOpenChange={(nextOpen) => {
        if (!busy) onOpenChange(nextOpen);
      }}
      title="Move module"
      width="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="rounded-xl border border-line bg-surface-subtle px-4 py-3">
          <div className="text-sm font-semibold text-ink">{module.title}</div>
          <div className="mt-1 text-sm text-ink-muted">
            Current position {currentPosition} of {totalModules} in {program.name}.
          </div>
        </div>

        <FormField label="New position" error={error || undefined}>
          <FormInput
            type="number"
            min={1}
            max={totalModules}
            value={position}
            disabled={busy}
            onChange={(event) => {
              setPosition(event.target.value);
              setError('');
            }}
            inputMode="numeric"
            placeholder="e.g. 3"
          />
        </FormField>

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="outline"
            disabled={busy}
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            isLoading={busy}
            loadingLabel="Moving module..."
          >
            Move module
          </Button>
        </div>
      </form>
    </Modal>
  );
}
