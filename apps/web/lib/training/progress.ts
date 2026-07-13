import * as React from 'react';
import { useQuery } from "@tanstack/react-query";
import type { LearnerProgressPayload, LearnerProgressStatus } from '@/lib/api/learning';
import { getLearnerProgress } from '@/lib/api/learning';
import type { ContentItem, ContentProgress, Module, ModuleStatus, ModuleWithProgress, Program } from '@/types';
import { contentForModule } from '@/lib/mock-data/programs';

function toUiProgressStatus(status: LearnerProgressStatus): ContentProgress {
  if (status === 'completed') return 'completed';
  if (status === 'in_progress') return 'in-progress';
  return 'not-started';
}

function toModuleStatus(status: LearnerProgressStatus): ModuleStatus {
  if (status === 'completed') return 'completed';
  if (status === 'in_progress') return 'in-progress';
  return 'not-started';
}

export function moduleWithProgress(module: Module): ModuleWithProgress {
  const items = contentForModule(module.id);
  const total = items.length || 1;
  const done = items.filter((content) => content.progress === 'completed').length;
  const inProgress = items.some((content) => content.progress === 'in-progress');
  const progress = Math.round((done / total) * 100);

  let status: ModuleStatus = 'not-started';
  if (done === items.length && items.length > 0) status = 'completed';
  else if (done > 0 || inProgress) status = 'in-progress';

  return { ...module, status, progress };
}

export function contentProgressPercent(items: ContentItem[]): number {
  if (items.length === 0) return 0;
  const done = items.filter((content) => content.progress === 'completed').length;
  return Math.round((done / items.length) * 100);
}

type ProgrammeProgressRow = LearnerProgressPayload['programmes'][number];
type ModuleProgressRow = LearnerProgressPayload['modules'][number];
type ContentProgressRow = LearnerProgressPayload['content'][number];

export function useLearnerProgressOverlay(programmeId?: string) {
  const progressQuery = useQuery<LearnerProgressPayload>({
    queryKey: ['learning', 'progress', programmeId ?? 'all'],
    queryFn: () => getLearnerProgress(programmeId ? { programmeId } : undefined),
    staleTime: 15_000,
  });

  const programmeProgressById = React.useMemo(
    () => new Map<string, ProgrammeProgressRow>(progressQuery.data?.programmes.map((row: ProgrammeProgressRow) => [row.programmeId, row]) ?? []),
    [progressQuery.data?.programmes],
  );

  const moduleProgressById = React.useMemo(
    () => new Map<string, ModuleProgressRow>(progressQuery.data?.modules.map((row: ModuleProgressRow) => [row.moduleId, row]) ?? []),
    [progressQuery.data?.modules],
  );

  const contentProgressById = React.useMemo(
    () => new Map<string, ContentProgressRow>(progressQuery.data?.content.map((row: ContentProgressRow) => [row.contentItemId, row]) ?? []),
    [progressQuery.data?.content],
  );

  const overlayProgramme = React.useCallback(
    (programme: Program): Program => {
      const progress = programmeProgressById.get(programme.id);
      return progress ? { ...programme, progress: progress.progressPercent } : programme;
    },
    [programmeProgressById],
  );

  const overlayModule = React.useCallback(
    (module: Module): ModuleWithProgress => {
      const progress = moduleProgressById.get(module.id);
      if (!progress) return moduleWithProgress(module);
      return { ...module, status: toModuleStatus(progress.status), progress: progress.progressPercent };
    },
    [moduleProgressById],
  );

  const overlayContentItem = React.useCallback(
    (item: ContentItem): ContentItem => {
      const progress = contentProgressById.get(item.id);
      return progress ? { ...item, progress: toUiProgressStatus(progress.status) } : item;
    },
    [contentProgressById],
  );

  return {
    contentProgressById,
    moduleProgressById,
    overlayContentItem,
    overlayModule,
    overlayProgramme,
    progressQuery,
    programmeProgressById,
  };
}
