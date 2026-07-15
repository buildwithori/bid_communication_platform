import type { EffectiveToolQuery, EntrepreneurQuery, ProfileRecordQuery, ProgrammeAccessQuery } from './types';

export const entrepreneurKeys = {
  all: ['entrepreneurs'] as const,
  lists: () => [...entrepreneurKeys.all, 'list'] as const,
  list: (query?: EntrepreneurQuery) => [...entrepreneurKeys.lists(), query] as const,
  detail: (id: string) => [...entrepreneurKeys.all, 'detail', id] as const,
  profile: () => [...entrepreneurKeys.all, 'profile'] as const,
  records: (id: string) => [...entrepreneurKeys.detail(id), 'records'] as const,
  access: (id: string, query?: ProgrammeAccessQuery) => [...entrepreneurKeys.detail(id), 'access', query] as const,
  tools: (id: string, query?: EffectiveToolQuery) => [...entrepreneurKeys.detail(id), 'tools', query] as const,
  goals: (id: string, query?: ProfileRecordQuery) => [...entrepreneurKeys.records(id), 'goals', query] as const,
  rounds: (id: string, query?: ProfileRecordQuery) => [...entrepreneurKeys.records(id), 'rounds', query] as const,
  updates: (id: string, query?: ProfileRecordQuery) => [...entrepreneurKeys.records(id), 'updates', query] as const,
};
