export type LearnerProgressStatus =
  | "not_started"
  | "in_progress"
  | "completed";
export type LearnerProgressSource = "player" | "explicit_action" | "system";
export type ClientProgressSource = Exclude<LearnerProgressSource, "system">;

export type ProgrammeProgressRecord = {
  programmeId: string;
  status: LearnerProgressStatus;
  progressPercent: number;
  completedModuleCount: number;
  totalModuleCount: number;
  completedContentCount: number;
  totalContentCount: number;
  startedAt: string | null;
  completedAt: string | null;
  lastSyncedAt: string;
};

export type ModuleProgressRecord = {
  programmeId: string;
  moduleId: string;
  status: LearnerProgressStatus;
  progressPercent: number;
  completedContentCount: number;
  totalContentCount: number;
  startedAt: string | null;
  completedAt: string | null;
  lastSyncedAt: string;
};

export type ContentProgressRecord = {
  programmeId: string | null;
  moduleId: string | null;
  contentItemId: string;
  status: LearnerProgressStatus;
  progressPercent: number;
  lastPositionSeconds: number | null;
  durationSeconds: number | null;
  startedAt: string | null;
  completedAt: string | null;
  lastOpenedAt: string | null;
  lastSyncedAt: string;
  source: LearnerProgressSource;
};

export type LearnerProgressLookup = {
  entrepreneurUserId: string;
  programme: ProgrammeProgressRecord | null;
  module: ModuleProgressRecord | null;
  content: ContentProgressRecord | null;
};

export type LearnerProgressQuery = {
  entrepreneurUserId?: string;
  programmeId: string;
  moduleId?: string;
  contentItemId?: string;
};

export type LearnerContentProgressInput = {
  programmeId: string;
  moduleId: string;
  contentItemId: string;
  status: LearnerProgressStatus;
  progressPercent: number;
  lastPositionSeconds?: number;
  durationSeconds?: number;
  clientEventAt: string;
  source: ClientProgressSource;
};

export type SyncLearnerProgressResult = {
  syncedItems: number;
  ignoredItems: number;
  programmeIds: string[];
};

export type TrainingCatalogueSummary = {
  programmes: {
    total: number;
    free: number;
    assigned: number;
    inProgress: number;
    completed: number;
    notStarted: number;
  };
};
