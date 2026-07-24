export type SessionType = string;
export type SessionStatus =
  "requested" | "confirmed" | "declined" | "cancelled" | "completed";
export type SessionSource = "entrepreneur_request" | "team_created";
export type SessionTargetType = "open_team" | "specific_user";
export type SessionNoteVisibility = "internal" | "participant";
export type SessionUser = {
  id: string;
  name: string;
  email: string;
  role?: "admin" | "trainer" | "entrepreneur";
};
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
    accessType: "free" | "assigned";
  } | null;
  ownerUserId: string | null;
  owner: SessionUser | null;
  targetType: SessionTargetType;
  targetUserId: string | null;
  target: SessionUser | null;
  createdBy: SessionUser;
  type: SessionType;
  typeName: string;
  durationMinutes: number;
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
  reschedules: Array<{
    id: string;
    previousStartAt: string;
    previousEndAt: string;
    newStartAt: string;
    newEndAt: string;
    reason: string | null;
    requestedBy: SessionUser;
    createdAt: string;
  }>;
  notesHistory: Array<{
    id: string;
    note: string;
    visibility: SessionNoteVisibility;
    author: SessionUser;
    createdAt: string;
  }>;
  declinedByCurrentUser?: boolean;
  createdAt: string;
  updatedAt: string;
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
export type SessionSummary = {
  total: number;
  byStatus: Partial<Record<SessionStatus, number>>;
};
export type SessionPage = {
  items: SessionRecord[];
  nextCursor: string | null;
  totalItems: number;
};
export type CreateSessionPayload = {
  entrepreneurUserId?: string;
  programmeId?: string;
  ownerUserId?: string;
  targetType?: SessionTargetType;
  targetUserId?: string;
  type: SessionType;
  topic: string;
  notes?: string;
  startAt: string;
  endAt: string;
  timezone?: string;
  meetingProvider?: "google_meet";
};
export type SessionTeamMember = SessionUser & { role: "admin" | "trainer" };
export type SessionTeamMemberQuery = {
  search?: string;
  take?: number;
  cursor?: string;
  role?: "admin" | "trainer";
};
export type SessionTeamMemberPage = {
  items: SessionTeamMember[];
  nextCursor: string | null;
};
export type SessionAvailabilityQuery = {
  dateFrom: string;
  dateTo: string;
  timezone: string;
  targetUserId?: string;
  sessionType: SessionType;
};
export type SessionAvailability = {
  dateFrom: string;
  dateTo: string;
  timezone: string;
  sessionType: {
    key: string;
    name: string;
    durationMinutes: number;
  };
  durationMinutes: number;
  slots: Array<{
    startAt: string;
    endAt: string;
    availableTeamMemberCount: number;
    targetUserId: string | null;
  }>;
};
export type SessionReasonVariables = { id: string; reason: string };
export type SessionRescheduleVariables = {
  id: string;
  startAt: string;
  endAt: string;
  reason?: string;
};
export type SessionCompleteVariables = { id: string; note?: string };
export type SessionNoteVariables = {
  id: string;
  note: string;
  visibility?: SessionNoteVisibility;
};
export type SessionMessageVariables = {
  id: string;
  subject: string;
  message: string;
  channel: "email" | "in_app";
  priority: "standard" | "needs-response" | "urgent";
};
export type SessionMessageResult = {
  id: string;
  deliveries: Array<{
    channel: "email" | "in_app";
    status: "pending" | "processing" | "sent" | "failed" | "skipped";
  }>;
};
