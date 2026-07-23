export type EntrepreneurStatus = "active" | "inactive" | "archived";
export type EntrepreneurDirectoryStatus = EntrepreneurStatus | "invited";
export type EntrepreneurSource = "self_registered" | "admin_invited";

export type EntrepreneurProgrammeAccess = {
  grantId: string;
  id: string;
  name: string;
  accessType: "free" | "assigned";
  grantedAt: string;
  startDate: string;
  endDate: string;
  progress: {
    status: "not_started" | "in_progress" | "completed";
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
  firstName: string;
  lastName: string;
  businessName: string;
  representativeName: string;
  email: string;
  phone: string | null;
  timezone: string;
  usesCompanyTimezone: boolean;
  country: string;
  status: EntrepreneurStatus;
  source: EntrepreneurSource;
  userStatus: "pending" | "active" | "inactive";
  joinedAt: string;
  onboardingCompletedAt: string | null;
  sector: { id: string; name: string; key: string } | null;
  stage: { id: string; name: string; key: string; definition: string } | null;
  programmeAccess: {
    freeResources: boolean;
    assignedProgrammes: EntrepreneurProgrammeAccess[];
    assignedProgrammeCount: number;
  };
  learnerProgress: { average: number; trackedProgrammes: number };
};

export type EntrepreneurSummary = {
  totalEntrepreneurs: number;
  activeEntrepreneurs: number;
  unassignedEntrepreneurs: number;
  withProgrammes: number;
  learnerImpact: {
    averageProgrammeProgress: number;
    trackedProgrammeProgress: number;
    completedContent: number;
    averageRating: number;
    ratingCount: number;
  };
};

export type EntrepreneurPage = {
  items: EntrepreneurRecord[];
  nextCursor: string | null;
  totalItems: number;
  summary: EntrepreneurSummary;
};

export type EntrepreneurQuery = {
  search?: string;
  sectorId?: string;
  stageId?: string;
  programmeId?: string;
  status?: EntrepreneurDirectoryStatus;
  source?: EntrepreneurSource;
  take?: number;
  cursor?: string;
};

export type EntrepreneurProfilePayload = {
  firstName: string;
  lastName: string;
  phone?: string;
  businessName: string;
  country: string;
  sectorId?: string | null;
  stageId?: string | null;
  timezone?: string;
};

export type InviteEntrepreneurPayload = EntrepreneurProfilePayload & {
  email: string;
  programmeIds: string[];
};

export type UpdateEntrepreneurVariables = {
  id: string;
  payload: EntrepreneurProfilePayload;
};

export type UpdateEntrepreneurStatusVariables = {
  id: string;
  status: EntrepreneurStatus;
};

export type ProgrammeAccessVariables = {
  id: string;
  programmeId: string;
  reason?: string;
};

export type ProgrammeAccessQuery = {
  search?: string;
  take?: number;
  cursor?: string;
  selectableOnly?: boolean;
};

export type EffectiveToolAccess = {
  id: string;
  name: string;
  description: string;
  type: "pdf" | "excel" | "embedded_tool";
  iconKey: string;
  visibility: "all_entrepreneurs" | "programmes" | "entrepreneurs";
  accessSource: "global" | "programme" | "individual" | "none";
  directGranted: boolean;
  hidden: boolean;
  visible: boolean;
  toolArea: { id: string; name: string; key: string };
};

export type EffectiveToolQuery = {
  search?: string;
  type?: EffectiveToolAccess["type"];
  toolAreaId?: string;
  includeUnavailable?: boolean;
  take?: number;
  cursor?: string;
};

export type ToolAccessVariables = {
  entrepreneurId: string;
  toolId: string;
};

export type ProfileRecordQuery = {
  search?: string;
  programmeId?: string;
  linkableOnly?: boolean;
  take?: number;
  cursor?: string;
};

export type CursorPage<T> = {
  items: T[];
  nextCursor: string | null;
  totalItems: number;
};

export type ProgrammeGoalRecord = {
  id: string;
  entrepreneurUserId: string;
  programme: { id: string; name: string; selectable: boolean } | null;
  goalType: {
    id: string;
    name: string;
    key: string;
    requiresTargetAmount: boolean;
  };
  targetAmountCents: number | null;
  description: string | null;
  milestoneAchieved: boolean;
  createdAt: string;
  updatedAt: string;
};

export type FundraisingRoundRecord = {
  id: string;
  entrepreneurUserId: string;
  programme: { id: string; name: string; selectable: boolean } | null;
  programmeGoal: {
    id: string;
    description: string | null;
    goalType: { id: string; name: string; key: string };
    linkable: boolean;
  } | null;
  name: string;
  amountCents: number;
  currency: string;
  source: string | null;
  date: string;
  createdAt: string;
  updatedAt: string;
};

export type PeriodicUpdateRecord = {
  id: string;
  entrepreneurUserId: string;
  programme: { id: string; name: string; selectable: boolean } | null;
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

export type ProgrammeGoalPayload = {
  programmeId?: string | null;
  goalTypeId: string;
  targetAmountCents?: number | null;
  description?: string | null;
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

export type RecordMutationVariables<T> = {
  entrepreneurId: string;
  recordId?: string;
  payload: T;
};

export type AcceptEntrepreneurInvitationPayload = {
  token: string;
  password: string;
};

export type InvitationResendResult = { ok: boolean; expiresAt: string };
