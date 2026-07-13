import { apiRequest } from './client';

export type ProgrammeLifecycle = 'draft' | 'scheduled' | 'active' | 'completed' | 'archived';
export type ProgrammeAccessType = 'free' | 'assigned';
export type ProgrammeContentType = 'video' | 'pdf' | 'tool';

type ProgrammeBase = {
  id: string;
  name: string;
  description: string;
  accessType: ProgrammeAccessType;
  lifecycle: ProgrammeLifecycle;
  startDate: string;
  endDate: string;
  maxEntrepreneurs: number;
  publishedAt: string | null;
  archivedAt: string | null;
  enrollment: {
    active: number;
    capacity: number;
  };
  content: {
    total: number;
    videos: number;
    pdfs: number;
    tools: number;
  };
  readiness: number;
};

export type ProgrammeListItem = ProgrammeBase & {
  modules: {
    total: number;
    ready: number;
  };
};

export type ProgrammeContentItem = {
  id: string;
  title: string;
  type: ProgrammeContentType;
  position: number;
  status: string;
  durationSeconds: number | null;
  trainer: {
    id: string;
    name: string;
    email: string;
  } | null;
  video: {
    muxAssetId: string | null;
    playbackId: string | null;
    status: string;
  } | null;
  files: Array<{
    id: string;
    originalFilename: string;
    mimeType: string;
    sizeBytes: string;
    status: string;
  }>;
  tool: {
    source: string;
    toolId: string | null;
    externalUrl: string | null;
  } | null;
};

export type ProgrammeDetail = ProgrammeBase & {
  archiveReason: string | null;
  modules: Array<{
    id: string;
    title: string;
    description: string;
    position: number;
    isReusable: boolean;
    readiness: 'ready' | 'needs_content';
    contentItems: ProgrammeContentItem[];
  }>;
};

export type ProgrammeQuery = {
  search?: string;
  accessType?: ProgrammeAccessType;
  lifecycle?: ProgrammeLifecycle;
  includeArchived?: boolean;
  take?: number;
  cursor?: string;
};

function toQueryString(query?: ProgrammeQuery) {
  const params = new URLSearchParams();
  if (query?.search) params.set('search', query.search);
  if (query?.accessType) params.set('accessType', query.accessType);
  if (query?.lifecycle) params.set('lifecycle', query.lifecycle);
  if (typeof query?.includeArchived === 'boolean') params.set('includeArchived', String(query.includeArchived));
  if (query?.take) params.set('take', String(query.take));
  if (query?.cursor) params.set('cursor', query.cursor);
  const value = params.toString();
  return value ? `?${value}` : '';
}

export function listProgrammes(query?: ProgrammeQuery) {
  return apiRequest<{ items: ProgrammeListItem[]; nextCursor: string | null }>(
    `/programmes${toQueryString(query)}`,
  );
}

export function getProgramme(id: string) {
  return apiRequest<ProgrammeDetail>(`/programmes/${id}`);
}
