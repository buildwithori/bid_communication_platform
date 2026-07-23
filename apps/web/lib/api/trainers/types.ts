export type TrainerRoleLabel =
  | "mentor"
  | "trainer"
  | "guest_expert"
  | "investment_analyst";
export type TrainerAccessLevel = "full" | "guest";
export type TrainerDirectoryStatus =
  | "active"
  | "invited"
  | "expired"
  | "inactive";
export type TrainerCalendarFilter = "connected" | "not_connected";

export type TrainerRecord = {
  trainerUserId: string;
  firstName: string | null;
  lastName: string | null;
  avatarUrl: string | null;
  directoryStatus: TrainerDirectoryStatus;
  name: string;
  email: string;
  phone: string | null;
  userStatus: "pending" | "active" | "inactive";
  roleLabel: TrainerRoleLabel;
  accessLevel: TrainerAccessLevel;
  capabilityStatus: "active" | "inactive";
  accessExpiresOn: string | null;
  calendar: {
    connected: boolean;
    provider: "google";
    accountEmail: string | null;
    lastSyncedAt: string | null;
  };
  specialisms: Array<{ id: string; name: string; key: string }>;
  portfolio: {
    contentItems: number;
    programmes: Array<{
      id: string;
      name: string;
      accessType: "free" | "assigned";
      startDate: string;
      endDate: string;
    }>;
    inferredEntrepreneurs: number;
    averageLearnerProgress: number;
  };
  ratings: { average: number | null; count: number };
};

export type TrainerSummary = {
  totalTrainers: number;
  activeTrainers: number;
  pendingInvites: number;
  calendarReady: number;
};

export type TrainerPage = {
  items: TrainerRecord[];
  nextCursor: string | null;
  totalItems: number;
  summary: TrainerSummary;
};

export type TrainerQuery = {
  search?: string;
  sectorId?: string;
  accessLevel?: TrainerAccessLevel;
  status?: TrainerDirectoryStatus;
  calendarStatus?: TrainerCalendarFilter;
  take?: number;
  cursor?: string;
};

export type TrainerCapabilityPayload = {
  roleLabel: TrainerRoleLabel;
  accessLevel: TrainerAccessLevel;
  accessExpiresOn?: string;
  sectorIds: string[];
};

export type InviteTrainerPayload = TrainerCapabilityPayload & {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
};

export type UpdateTrainerPayload = TrainerCapabilityPayload & {
  firstName: string;
  lastName: string;
  phone?: string;
};

export type UpdateTrainerVariables = {
  id: string;
  payload: UpdateTrainerPayload;
};

export type UpdateTrainerStatusVariables = {
  id: string;
  status: "active" | "inactive";
};

export type TrainerProfilePayload = {
  firstName: string;
  lastName: string;
  phone?: string;
};

export type AcceptTrainerInvitationPayload = {
  token: string;
  password: string;
};

export type InvitationResendResult = {
  ok: boolean;
  expiresAt: string;
};
