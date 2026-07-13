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
