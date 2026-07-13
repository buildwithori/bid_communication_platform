import { apiRequest } from './client';

export type TrainerRecord = {
  trainerUserId: string;
  name: string;
  email: string;
  phone: string | null;
  userStatus: 'pending' | 'active' | 'inactive';
  roleLabel: 'mentor' | 'trainer' | 'guest_expert';
  accessLevel: 'full' | 'guest';
  capabilityStatus: 'active' | 'inactive';
  accessExpiresOn: string | null;
  specialisms: Array<{ id: string; name: string; key: string }>;
  portfolio: {
    contentItems: number;
    programmes: Array<{
      id: string;
      name: string;
      accessType: 'free' | 'assigned';
      startDate: string;
      endDate: string;
    }>;
    inferredEntrepreneurs: number;
    averageLearnerProgress: number;
  };
  ratings: {
    average: number | null;
    count: number;
  };
};

export type TrainerQuery = {
  search?: string;
  sectorId?: string;
  accessLevel?: TrainerRecord['accessLevel'];
  status?: TrainerRecord['capabilityStatus'];
  take?: number;
  cursor?: string;
};

function toQueryString(query?: TrainerQuery) {
  const params = new URLSearchParams();
  if (query?.search) params.set('search', query.search);
  if (query?.sectorId) params.set('sectorId', query.sectorId);
  if (query?.accessLevel) params.set('accessLevel', query.accessLevel);
  if (query?.status) params.set('status', query.status);
  if (query?.take) params.set('take', String(query.take));
  if (query?.cursor) params.set('cursor', query.cursor);
  const value = params.toString();
  return value ? `?${value}` : '';
}

export function listTrainers(query?: TrainerQuery) {
  return apiRequest<{ items: TrainerRecord[]; nextCursor: string | null }>(`/trainers${toQueryString(query)}`);
}

export function getTrainer(trainerUserId: string) {
  return apiRequest<TrainerRecord>(`/trainers/${trainerUserId}`);
}
