import { apiRequest } from './client';

export type EntrepreneurProgrammeAccess = {
  id: string;
  name: string;
  accessType: 'free' | 'assigned';
  grantedAt: string;
  startDate: string;
  endDate: string;
  progress: {
    status: 'not_started' | 'in_progress' | 'completed';
    percent: number;
    completedModules: number;
    totalModules: number;
    completedContent: number;
    totalContent: number;
  } | null;
};

export type EntrepreneurRecord = {
  entrepreneurUserId: string;
  businessId: string;
  businessName: string;
  representativeName: string;
  email: string;
  phone: string | null;
  country: string;
  status: 'active' | 'inactive' | 'archived';
  source: 'self_registered' | 'admin_invited';
  userStatus: 'pending' | 'active' | 'inactive';
  joinedAt: string;
  onboardingCompletedAt: string | null;
  sector: { id: string; name: string; key: string } | null;
  stage: { id: string; name: string; key: string; definition: string } | null;
  programmeAccess: {
    freeResources: boolean;
    assignedProgrammes: EntrepreneurProgrammeAccess[];
  };
  learnerProgress: {
    average: number;
    trackedProgrammes: number;
  };
};

export type EntrepreneurQuery = {
  search?: string;
  sectorId?: string;
  stageId?: string;
  status?: EntrepreneurRecord['status'];
  source?: EntrepreneurRecord['source'];
  take?: number;
  cursor?: string;
};

function toQueryString(query?: EntrepreneurQuery) {
  const params = new URLSearchParams();
  if (query?.search) params.set('search', query.search);
  if (query?.sectorId) params.set('sectorId', query.sectorId);
  if (query?.stageId) params.set('stageId', query.stageId);
  if (query?.status) params.set('status', query.status);
  if (query?.source) params.set('source', query.source);
  if (query?.take) params.set('take', String(query.take));
  if (query?.cursor) params.set('cursor', query.cursor);
  const value = params.toString();
  return value ? `?${value}` : '';
}

export function listEntrepreneurs(query?: EntrepreneurQuery) {
  return apiRequest<{ items: EntrepreneurRecord[]; nextCursor: string | null }>(
    `/entrepreneurs${toQueryString(query)}`,
  );
}

export function getEntrepreneur(entrepreneurUserId: string) {
  return apiRequest<EntrepreneurRecord>(`/entrepreneurs/${entrepreneurUserId}`);
}
