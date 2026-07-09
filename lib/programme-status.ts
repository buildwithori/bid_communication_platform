import type { BadgeTone, Program, ProgramStatus } from '@/types';

function toDateOnly(value: Date) {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate());
}

function parseDateOnly(value?: string) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return toDateOnly(date);
}

export function getProgrammeStatus(program: Program, referenceDate = new Date()): ProgramStatus {
  if (program.archivedAt) return 'archived';
  if (!program.publishedAt) return 'draft';
  if (program.completedAt) return 'completed';

  const today = toDateOnly(referenceDate);
  const startDate = parseDateOnly(program.startDate);
  const endDate = parseDateOnly(program.endDate);

  if (startDate && today < startDate) return 'scheduled';
  if (endDate && today > endDate) return 'completed';
  return 'active';
}

export function getProgrammeStatusLabel(status: ProgramStatus) {
  if (status === 'draft') return 'Draft';
  if (status === 'scheduled') return 'Scheduled';
  if (status === 'active') return 'Active';
  if (status === 'completed') return 'Completed';
  return 'Archived';
}

export function getProgrammeStatusDescription(program: Program, referenceDate = new Date()) {
  const status = getProgrammeStatus(program, referenceDate);
  if (status === 'draft') return 'Not published to entrepreneurs yet';
  if (status === 'scheduled') return 'Published and waiting for the start date';
  if (status === 'active') return 'Published and currently inside the programme date window';
  if (status === 'completed') return program.completedAt ? 'Marked completed by BID' : 'Programme end date has passed';
  return 'Archived and hidden from day-to-day programme operations';
}

export function getProgrammeStatusTone(status: ProgramStatus): BadgeTone {
  if (status === 'active') return 'green';
  if (status === 'draft') return 'amber';
  if (status === 'scheduled') return 'blue';
  if (status === 'completed') return 'neutral';
  return 'red';
}

export function isProgrammeArchived(program: Program) {
  return getProgrammeStatus(program) === 'archived';
}
