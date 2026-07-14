import { apiRequest } from './client';

export type SessionType = 'mentor_checkin' | 'office_hours' | 'investor_prep';
export type SessionStatus = 'requested' | 'confirmed' | 'declined' | 'cancelled' | 'completed';
export type SessionSource = 'entrepreneur_request' | 'team_created';
export type SessionNoteVisibility = 'internal' | 'participant';

export type SessionRecord = {
  id: string;
  entrepreneurUserId: string;
  entrepreneur: {
    id: string;
    name: string;
    email: string;
    businessId: string | null;
    businessName: string;
    country: string | null;
  };
  programme: {
    id: string;
    name: string;
    accessType: 'free' | 'assigned';
  } | null;
  ownerUserId: string | null;
  owner: SessionUser | null;
  createdBy: SessionUser;
  type: SessionType;
  topic: string;
  notes: string | null;
  source: SessionSource;
  status: SessionStatus;
  startAt: string;
  endAt: string;
  timezone: string;
  meetingProvider: string;
  meetingUrl: string | null;
  declinedReason: string | null;
  cancelledReason: string | null;
  completedAt: string | null;
  notesHistory: Array<{
    id: string;
    note: string;
    visibility: SessionNoteVisibility;
    author: SessionUser;
    createdAt: string;
  }>;
  createdAt: string;
  updatedAt: string;
};

export type SessionUser = {
  id: string;
  name: string;
  email: string;
  role?: 'admin' | 'trainer' | 'entrepreneur';
};

export type SessionQuery = {
  search?: string;
  status?: SessionStatus;
  type?: SessionType;
  source?: SessionSource;
  ownerId?: string;
  programmeId?: string;
  dateFrom?: string;
  dateTo?: string;
  take?: number;
  cursor?: string;
};

export type CreateSessionPayload = {
  entrepreneurUserId?: string;
  programmeId?: string;
  ownerUserId?: string;
  type: SessionType;
  topic: string;
  notes?: string;
  startAt: string;
  endAt: string;
  timezone?: string;
  meetingProvider?: 'google_meet';
};

function toQueryString(query?: SessionQuery) {
  const params = new URLSearchParams();
  if (query?.search) params.set('search', query.search);
  if (query?.status) params.set('status', query.status);
  if (query?.type) params.set('type', query.type);
  if (query?.source) params.set('source', query.source);
  if (query?.ownerId) params.set('ownerId', query.ownerId);
  if (query?.programmeId) params.set('programmeId', query.programmeId);
  if (query?.dateFrom) params.set('dateFrom', query.dateFrom);
  if (query?.dateTo) params.set('dateTo', query.dateTo);
  if (query?.take) params.set('take', String(query.take));
  if (query?.cursor) params.set('cursor', query.cursor);
  const value = params.toString();
  return value ? `?${value}` : '';
}

export function listSessions(query?: SessionQuery) {
  return apiRequest<{ items: SessionRecord[]; nextCursor: string | null }>(
    `/sessions${toQueryString(query)}`,
  );
}

export function getSession(id: string) {
  return apiRequest<SessionRecord>(`/sessions/${id}`);
}

export function createSession(payload: CreateSessionPayload) {
  return apiRequest<SessionRecord>('/sessions', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function acceptSession(id: string) {
  return apiRequest<SessionRecord>(`/sessions/${id}/accept`, {
    method: 'POST',
  });
}

export function declineSession(id: string, payload: { reason: string }) {
  return apiRequest<SessionRecord>(`/sessions/${id}/decline`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function cancelSession(id: string, payload: { reason: string }) {
  return apiRequest<SessionRecord>(`/sessions/${id}/cancel`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function rescheduleSession(
  id: string,
  payload: { startAt: string; endAt: string; reason?: string },
) {
  return apiRequest<SessionRecord>(`/sessions/${id}/reschedule`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export function completeSession(id: string, payload: { note?: string }) {
  return apiRequest<SessionRecord>(`/sessions/${id}/complete`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function addSessionNote(
  id: string,
  payload: { note: string; visibility?: SessionNoteVisibility },
) {
  return apiRequest<SessionRecord>(`/sessions/${id}/notes`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}
