import { apiRequest } from './client';

export type ContentRatingPayload = {
  id: string;
  contentItemId: string;
  entrepreneurUserId: string;
  trainerId: string | null;
  rating: number;
  comment: string | null;
  createdAt: string;
  updatedAt: string;
};

export type SaveContentRatingInput = {
  contentItemId: string;
  rating: number;
  comment?: string;
};

export function getMyContentRating(contentItemId: string) {
  return apiRequest<ContentRatingPayload | null>(
    '/content/ratings/' + contentItemId + '/me',
  );
}

export function saveContentRating(input: SaveContentRatingInput) {
  return apiRequest<ContentRatingPayload>('/content/ratings', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}


export type CreateContentItemInput = {
  title: string;
  type: 'video' | 'pdf' | 'tool';
  trainerId?: string;
  durationSeconds?: number;
  fileAssetId?: string;
  videoAssetId?: string;
  toolId?: string;
  externalUrl?: string;
};

export type ContentItemPayload = {
  id: string;
  title: string;
  type: 'video' | 'pdf' | 'tool';
  trainerId: string | null;
  trainer: { id: string; name: string; email: string } | null;
  durationSeconds: number | null;
  durationLabel: string | null;
  status: 'draft' | 'processing' | 'ready' | 'failed' | 'archived';
  video: {
    id: string;
    durationSeconds: number | null;
    status: 'pending' | 'processing' | 'ready' | 'failed' | 'archived';
  } | null;
  file: {
    id: string;
    originalFilename: string;
    mimeType: string;
    sizeBytes: number;
    status: 'pending' | 'processing' | 'ready' | 'failed' | 'archived';
  } | null;
  toolLink: {
    id: string;
    toolId: string | null;
    externalUrl: string | null;
    source: 'library' | 'custom';
    toolName: string | null;
    url: string | null;
  } | null;
  modules: Array<{ moduleId: string; position: number }>;
  createdAt: string;
  updatedAt: string;
};

export function createModuleContentItem(moduleId: string, input: CreateContentItemInput) {
  return apiRequest<ContentItemPayload>(`/content/modules/${moduleId}/items`, {
    method: 'POST',
    body: JSON.stringify(input),
  });
}
