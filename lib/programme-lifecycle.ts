import type { Program } from '@/types';
import { getProgrammeStatus } from '@/lib/programme-status';

const SYSTEM_ACTOR = 'BID admin';

function isoNow() {
  return new Date().toISOString();
}

function dateOnly(date: Date) {
  return date.toISOString().slice(0, 10);
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function isPastDate(value?: string) {
  if (!value) return false;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;
  const today = new Date();
  return date < new Date(today.getFullYear(), today.getMonth(), today.getDate());
}

export function publishProgrammePatch(): Partial<Program> {
  return {
    publishedAt: isoNow(),
    completedAt: undefined,
    completedBy: undefined,
    completionReason: undefined,
    archivedAt: undefined,
    archivedBy: undefined,
    archiveReason: undefined,
  };
}

export function unpublishProgrammePatch(): Partial<Program> {
  return {
    publishedAt: undefined,
    completedAt: undefined,
    completedBy: undefined,
    completionReason: undefined,
  };
}

export function completeProgrammePatch(reason = 'Marked complete from programme workspace'): Partial<Program> {
  return {
    completedAt: isoNow(),
    completedBy: SYSTEM_ACTOR,
    completionReason: reason,
  };
}

export function archiveProgrammePatch(program: Program, reason: string): Partial<Program> {
  const status = getProgrammeStatus(program);
  const now = isoNow();
  const shouldCompleteFirst = status === 'active';

  return {
    ...(shouldCompleteFirst && !program.completedAt
      ? {
          completedAt: now,
          completedBy: SYSTEM_ACTOR,
          completionReason: 'Ended while archiving programme',
        }
      : {}),
    archivedAt: now,
    archivedBy: SYSTEM_ACTOR,
    archiveReason: reason,
  };
}

export function restoreProgrammePatch(): Partial<Program> {
  return {
    archivedAt: undefined,
    archivedBy: undefined,
    archiveReason: undefined,
  };
}

export function reopenProgrammePatch(program: Program): Partial<Program> {
  return {
    publishedAt: program.publishedAt ?? isoNow(),
    completedAt: undefined,
    completedBy: undefined,
    completionReason: undefined,
    archivedAt: undefined,
    archivedBy: undefined,
    archiveReason: undefined,
    endDate: isPastDate(program.endDate) ? dateOnly(addDays(new Date(), 90)) : program.endDate,
  };
}
