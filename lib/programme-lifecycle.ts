import type { Program } from '@/types';

const SYSTEM_ACTOR = 'BID admin';

function isoNow() {
  return new Date().toISOString();
}

export function publishProgrammePatch(): Partial<Program> {
  return {
    publishedAt: isoNow(),
    archivedAt: undefined,
    archivedBy: undefined,
    archiveReason: undefined,
  };
}

export function archiveProgrammePatch(reason: string): Partial<Program> {
  const now = isoNow();

  return {
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
