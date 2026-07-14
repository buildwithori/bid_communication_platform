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

export type EntrepreneurProgrammeGoalRecord = {
  id: string;
  entrepreneurUserId: string;
  programme: { id: string; name: string } | null;
  goalType: { id: string; name: string; key: string; requiresTargetAmount: boolean };
  targetAmountCents: number | null;
  description: string | null;
  evidence: string | null;
  milestoneAchieved: boolean;
  createdAt: string;
  updatedAt: string;
};

export type EntrepreneurFundraisingRoundRecord = {
  id: string;
  entrepreneurUserId: string;
  programme: { id: string; name: string } | null;
  programmeGoal: {
    id: string;
    description: string | null;
    goalType: { id: string; name: string; key: string };
  } | null;
  name: string;
  amountCents: number;
  currency: string;
  source: string | null;
  date: string;
  createdAt: string;
  updatedAt: string;
};

export type EntrepreneurPeriodicUpdateRecord = {
  id: string;
  entrepreneurUserId: string;
  programme: { id: string; name: string } | null;
  periodStart: string;
  periodEnd: string;
  submittedAt: string;
  jobsCreated: number;
  jobsWomen: number;
  jobsMen: number;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

export type EntrepreneurProfileRecords = {
  programmeGoals: EntrepreneurProgrammeGoalRecord[];
  fundraisingRounds: EntrepreneurFundraisingRoundRecord[];
  periodicUpdates: EntrepreneurPeriodicUpdateRecord[];
};

export type ProgrammeGoalPayload = {
  programmeId?: string | null;
  goalTypeId: string;
  targetAmountCents?: number | null;
  description?: string | null;
  evidence?: string | null;
  milestoneAchieved?: boolean;
};

export type FundraisingRoundPayload = {
  name: string;
  amountCents: number;
  currency?: string;
  programmeId?: string | null;
  programmeGoalId?: string | null;
  source?: string | null;
  date: string;
};

export type PeriodicUpdatePayload = {
  periodStart: string;
  periodEnd: string;
  programmeId?: string | null;
  jobsCreated: number;
  jobsWomen: number;
  jobsMen: number;
  notes?: string | null;
};

export function getEntrepreneurProfileRecords(entrepreneurUserId: string) {
  return apiRequest<EntrepreneurProfileRecords>(`/entrepreneurs/${entrepreneurUserId}/profile-records`);
}

export function createProgrammeGoal(entrepreneurUserId: string, payload: ProgrammeGoalPayload) {
  return apiRequest<EntrepreneurProgrammeGoalRecord>(`/entrepreneurs/${entrepreneurUserId}/programme-goals`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function updateProgrammeGoal(entrepreneurUserId: string, goalId: string, payload: ProgrammeGoalPayload) {
  return apiRequest<EntrepreneurProgrammeGoalRecord>(`/entrepreneurs/${entrepreneurUserId}/programme-goals/${goalId}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export function createFundraisingRound(entrepreneurUserId: string, payload: FundraisingRoundPayload) {
  return apiRequest<EntrepreneurFundraisingRoundRecord>(`/entrepreneurs/${entrepreneurUserId}/fundraising-rounds`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function updateFundraisingRound(entrepreneurUserId: string, roundId: string, payload: FundraisingRoundPayload) {
  return apiRequest<EntrepreneurFundraisingRoundRecord>(`/entrepreneurs/${entrepreneurUserId}/fundraising-rounds/${roundId}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export function createPeriodicUpdate(entrepreneurUserId: string, payload: PeriodicUpdatePayload) {
  return apiRequest<EntrepreneurPeriodicUpdateRecord>(`/entrepreneurs/${entrepreneurUserId}/periodic-updates`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function updatePeriodicUpdate(entrepreneurUserId: string, updateId: string, payload: PeriodicUpdatePayload) {
  return apiRequest<EntrepreneurPeriodicUpdateRecord>(`/entrepreneurs/${entrepreneurUserId}/periodic-updates/${updateId}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}
