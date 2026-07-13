import { apiRequest } from './client';

export type LearnerProgressStatus = 'not_started' | 'in_progress' | 'completed';
export type LearnerProgressSource = 'player' | 'explicit_action' | 'system';

export type LearnerProgressPayload = {
  entrepreneurUserId: string;
  programmes: Array<{
    programmeId: string;
    status: LearnerProgressStatus;
    progressPercent: number;
    completedModuleCount: number;
    totalModuleCount: number;
    completedContentCount: number;
    totalContentCount: number;
    startedAt: string | null;
    completedAt: string | null;
    lastSyncedAt: string;
  }>;
  modules: Array<{
    programmeId: string;
    moduleId: string;
    status: LearnerProgressStatus;
    progressPercent: number;
    completedContentCount: number;
    totalContentCount: number;
    startedAt: string | null;
    completedAt: string | null;
    lastSyncedAt: string;
  }>;
  content: Array<{
    programmeId: string | null;
    moduleId: string | null;
    contentItemId: string;
    status: LearnerProgressStatus;
    progressPercent: number;
    lastPositionSeconds: number | null;
    durationSeconds: number | null;
    startedAt: string | null;
    completedAt: string | null;
    lastOpenedAt: string | null;
    lastSyncedAt: string;
    source: LearnerProgressSource;
  }>;
};

export type LearnerProgressQuery = {
  entrepreneurUserId?: string;
  programmeId?: string;
};

export type LearnerContentProgressInput = {
  programmeId: string;
  moduleId: string;
  contentItemId: string;
  progressPercent: number;
  lastPositionSeconds?: number;
  durationSeconds?: number;
  completed?: boolean;
};

function toQueryString(query?: LearnerProgressQuery) {
  const params = new URLSearchParams();
  if (query?.entrepreneurUserId) params.set('entrepreneurUserId', query.entrepreneurUserId);
  if (query?.programmeId) params.set('programmeId', query.programmeId);
  const value = params.toString();
  return value ? `?${value}` : '';
}

export function getLearnerProgress(query?: LearnerProgressQuery) {
  return apiRequest<LearnerProgressPayload>(`/learning/progress${toQueryString(query)}`);
}

export function syncLearnerProgress(items: LearnerContentProgressInput[]) {
  return apiRequest<LearnerProgressPayload>('/learning/progress/sync', {
    method: 'POST',
    body: JSON.stringify({ items }),
  });
}
