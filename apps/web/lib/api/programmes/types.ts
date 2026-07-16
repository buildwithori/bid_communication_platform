export type ProgrammeLifecycle =
  | "draft"
  | "scheduled"
  | "active"
  | "completed"
  | "archived";
export type ProgrammeAccessType = "free" | "assigned";
export type ProgrammeContentType = "video" | "pdf" | "tool";
export type ProgrammePublishState = "draft" | "published";

type ProgrammeBase = {
  id: string;
  name: string;
  description: string;
  accessType: ProgrammeAccessType;
  lifecycle: ProgrammeLifecycle;
  startDate: string;
  endDate: string;
  maxEntrepreneurs: number;
  publishedAt: string | null;
  archivedAt: string | null;
  enrollment: {
    active: number;
    capacity: number;
  };
  content: {
    total: number;
    videos: number;
    pdfs: number;
    tools: number;
  };
  readiness: number;
  learnerProgress: {
    average: number;
    trackedLearners: number;
  };
  nextLearning: {
    moduleId: string;
    moduleTitle: string;
    contentItemId: string;
    contentTitle: string;
    contentType: ProgrammeContentType;
    resumePositionSeconds: number | null;
  } | null;
};

export type ProgrammeListItem = ProgrammeBase & {
  modules: {
    total: number;
    ready: number;
  };
};

export type ProgrammePage = {
  items: ProgrammeListItem[];
  nextCursor: string | null;
  totalItems: number;
};

export type ProgrammeSummary = {
  programmes: {
    total: number;
    active: number;
  };
  modules: {
    total: number;
  };
  enrollment: {
    active: number;
  };
  entrepreneurs: {
    active: number;
  };
  content: {
    total: number;
    owned: number;
  };
  learnerProgress: {
    average: number;
    trackedLearners: number;
  };
};

export type ProgrammeDetail = ProgrammeBase & {
  archiveReason: string | null;
  modules: {
    total: number;
    ready: number;
  };
};

export type ProgrammeModuleRecord = {
  linkId: string;
  id: string;
  title: string;
  description: string;
  isReusable: boolean;
  position: number;
  programmeUses: number;
  content: {
    total: number;
    videos: number;
    pdfs: number;
    tools: number;
  };
  readiness: "ready" | "needs_content";
  learnerProgress: {
    status: "not_started" | "in_progress" | "completed";
    progressPercent: number;
    completedContentCount: number;
    totalContentCount: number;
  } | null;
  updatedAt: string;
};

export type ProgrammeModuleDetail = ProgrammeModuleRecord & {
  navigation: {
    previous: { id: string; title: string } | null;
    next: { id: string; title: string } | null;
  };
};

export type ProgrammeModulePage = {
  items: ProgrammeModuleRecord[];
  nextCursor: string | null;
  totalItems: number;
};

export type ReusableProgrammeModule = {
  id: string;
  title: string;
  description: string;
  isReusable: boolean;
  contentItems: number;
  programmeUses: number;
  updatedAt: string;
};

export type ReusableProgrammeModulePage = {
  items: ReusableProgrammeModule[];
  nextCursor: string | null;
  totalItems: number;
};

export type ProgrammeModuleQuery = {
  search?: string;
  contentType?: ProgrammeContentType;
  progressStatus?: "not_started" | "in_progress" | "completed";
  take?: number;
  cursor?: string;
};

export type CreateProgrammeModulePayload = {
  title: string;
  description?: string;
  isReusable?: boolean;
};

export type CreateProgrammeModuleVariables = {
  programmeId: string;
  payload: CreateProgrammeModulePayload;
};

export type UpdateProgrammeModulePayload =
  Partial<CreateProgrammeModulePayload>;

export type UpdateProgrammeModuleVariables = {
  programmeId: string;
  moduleId: string;
  payload: UpdateProgrammeModulePayload;
};

export type ReuseProgrammeModuleVariables = {
  programmeId: string;
  moduleId: string;
};

export type MoveProgrammeModuleVariables = {
  programmeId: string;
  moduleId: string;
  position: number;
};

export type ProgrammeQuery = {
  search?: string;
  accessType?: ProgrammeAccessType;
  lifecycle?: ProgrammeLifecycle;
  progressStatus?: "not_started" | "in_progress" | "completed";
  includeArchived?: boolean;
  grantableOnly?: boolean;
  take?: number;
  cursor?: string;
};

export type CreateProgrammePayload = {
  name: string;
  description?: string;
  accessType: ProgrammeAccessType;
  startDate: string;
  endDate: string;
  maxEntrepreneurs: number;
  publishState?: ProgrammePublishState;
};

export type UpdateProgrammePayload = Partial<
  Omit<CreateProgrammePayload, "publishState">
>;

export type UpdateProgrammeVariables = {
  id: string;
  payload: UpdateProgrammePayload;
};

export type ArchiveProgrammeVariables = {
  id: string;
  reason: string;
};

export type ProgrammeDeliverableDueType =
  | "fixed_date"
  | "module_completion"
  | "recurring";
export type ProgrammeDeliverableRecurringCadence =
  | "monthly"
  | "quarterly"
  | "six_monthly";
export type ProgrammeDeliverableRequiredScope = "all" | "stage";

export type ProgrammeDeliverableRule = {
  id: string;
  programmeId: string;
  name: string;
  dueType: ProgrammeDeliverableDueType;
  dueDate: string | null;
  dueAfterModule: { id: string; title: string } | null;
  recurringCadence: ProgrammeDeliverableRecurringCadence | null;
  requiredForScope: ProgrammeDeliverableRequiredScope;
  requiredStage: { id: string; name: string; key: string } | null;
  active: boolean;
  submittedCount: number;
  assignedCount: number;
  createdAt: string;
  updatedAt: string;
};

export type UpsertProgrammeDeliverableRulePayload = {
  name?: string;
  dueType?: ProgrammeDeliverableDueType;
  dueDate?: string;
  dueAfterModuleId?: string;
  recurringCadence?: ProgrammeDeliverableRecurringCadence;
  requiredForScope?: ProgrammeDeliverableRequiredScope;
  requiredStageId?: string;
  active?: boolean;
};

export type CreateProgrammeDeliverableRuleVariables = {
  programmeId: string;
  payload: UpsertProgrammeDeliverableRulePayload & {
    name: string;
    dueType: ProgrammeDeliverableDueType;
  };
};

export type UpdateProgrammeDeliverableRuleVariables = {
  programmeId: string;
  ruleId: string;
  payload: UpsertProgrammeDeliverableRulePayload;
};
