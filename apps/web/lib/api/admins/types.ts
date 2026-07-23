export type AdminDirectoryStatus = "active" | "invited" | "disabled";
export type AdminCalendarFilter = "connected" | "not_connected";

export type AdminRecord = {
  id: string;
  firstName: string | null;
  lastName: string | null;
  name: string;
  email: string;
  phone: string | null;
  avatarUrl: string | null;
  status: AdminDirectoryStatus;
  userStatus: "pending" | "active" | "inactive";
  calendar: {
    connected: boolean;
    provider: "google";
    accountEmail: string | null;
    lastSyncedAt: string | null;
  };
  invitedBy: {
    id: string;
    name: string;
  } | null;
  invitation: {
    id: string;
    sentAt: string;
    expiresAt: string;
  } | null;
  lastActiveAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type AdminDirectorySummary = {
  totalAdmins: number;
  activeAdmins: number;
  pendingInvites: number;
  calendarReady: number;
};

export type AdminPage = {
  items: AdminRecord[];
  nextCursor: string | null;
  totalItems: number;
};

export type AdminQuery = {
  search?: string;
  status?: AdminDirectoryStatus;
  calendarStatus?: AdminCalendarFilter;
  take?: number;
  cursor?: string;
};

export type InviteAdminPayload = {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
};

export type UpdateAdminStatusVariables = {
  id: string;
  status: "active" | "inactive";
};

export type AdminProfilePayload = {
  firstName: string;
  lastName: string;
  phone?: string;
};

export type AcceptAdminInvitationPayload = {
  token: string;
  password: string;
};

export type InvitationResendResult = {
  ok: boolean;
  expiresAt: string;
};
