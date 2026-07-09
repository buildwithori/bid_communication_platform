import type { Entrepreneur, PeriodicUpdate, Program } from '@/types';
import { getEntrepreneurAssignedProgrammes } from '@/lib/programme-access';

export interface OverdueUpdateRow {
  entrepreneur: Entrepreneur;
  programmes: Program[];
  lastReportLabel: string;
  lastReportDateLabel: string;
  daysWithoutReport: number;
  daysOverdue: number;
}

const DAY_IN_MS = 86_400_000;

export function getOverduePeriodicUpdates({
  entrepreneurs,
  programs,
  overdueAfterDays,
  today = new Date(),
}: {
  entrepreneurs: Entrepreneur[];
  programs: Program[];
  overdueAfterDays: number;
  today?: Date;
}): OverdueUpdateRow[] {
  return entrepreneurs
    .filter((entrepreneur) => entrepreneur.status === 'active')
    .map((entrepreneur) => {
      const programmeAccess = getEntrepreneurAssignedProgrammes(entrepreneur, programs);

      const latestUpdate = getLatestPeriodicUpdate(entrepreneur);
      const daysWithoutReport = getDaysWithoutPeriodicReport(entrepreneur, today);

      if (daysWithoutReport <= overdueAfterDays) return null;

      return {
        entrepreneur,
        programmes: programmeAccess,
        lastReportLabel: latestUpdate ? formatDate(latestUpdate.submittedAt) : 'Never submitted',
        lastReportDateLabel: latestUpdate
          ? `Period: ${formatDateRange(latestUpdate.periodStart, latestUpdate.periodEnd)}`
          : `Joined ${formatDate(entrepreneur.joinedAt)}`,
        daysWithoutReport,
        daysOverdue: daysWithoutReport - overdueAfterDays,
      };
    })
    .filter((row): row is OverdueUpdateRow => row !== null)
    .sort((a, b) => b.daysOverdue - a.daysOverdue);
}

function getLatestPeriodicUpdate(entrepreneur: Entrepreneur): PeriodicUpdate | undefined {
  return [...(entrepreneur.periodicUpdates ?? [])].sort(
    (a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime(),
  )[0];
}

export function getDaysWithoutPeriodicReport(entrepreneur: Entrepreneur, today = new Date()) {
  const latestUpdate = getLatestPeriodicUpdate(entrepreneur);
  return getDaysBetween(latestUpdate?.submittedAt ?? entrepreneur.joinedAt, today);
}

function getDaysBetween(date: string, today: Date) {
  return Math.max(
    Math.floor(
      (startOfDay(today).getTime() - startOfDay(new Date(date)).getTime()) /
        DAY_IN_MS,
    ),
    0,
  );
}

function formatDate(date: string) {
  return new Intl.DateTimeFormat('en', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(date));
}

function formatDateRange(start: string, end: string) {
  return `${formatDate(start)} - ${formatDate(end)}`;
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}
