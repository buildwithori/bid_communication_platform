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
  learnerProgress: {
    average: number;
    trackedLearners: number;
  };
};

export type ProgrammeContentItem = {
  id: string;
  title: string;
  type: ProgrammeContentType;
  position: number;
  status: string;
  durationSeconds: number | null;
  trainer: {
    id: string;
    name: string;
    email: string;
  } | null;
  video: {
    muxAssetId: string | null;
    playbackId: string | null;
    status: string;
  } | null;
  files: Array<{
    id: string;
    originalFilename: string;
    mimeType: string;
    sizeBytes: string;
    status: string;
    downloadUrl: string | null;
  }>;
  tool: {
    source: string;
    toolId: string | null;
    toolName: string | null;
    externalUrl: string | null;
    url: string | null;
  } | null;
};

export type ProgrammeDetail = ProgrammeBase & {
  archiveReason: string | null;
  modules: Array<{
    id: string;
    title: string;
    description: string;
    position: number;
    isReusable: boolean;
    readiness: "ready" | "needs_content";
    contentItems: ProgrammeContentItem[];
  }>;
};

export type ProgrammeQuery = {
  search?: string;
  accessType?: ProgrammeAccessType;
  lifecycle?: ProgrammeLifecycle;
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
