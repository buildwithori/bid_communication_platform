export type ContentItemType = "video" | "pdf" | "tool";
export type ContentItemStatus =
  | "draft"
  | "processing"
  | "ready"
  | "failed"
  | "archived";

export type ContentRatingPayload = {
  id: string;
  contentItemId: string;
  entrepreneurUserId: string;
  trainerId: string | null;
  rating: number;
  comment: string | null;
  createdAt: string;
  updatedAt: string;
};

export type SaveContentRatingInput = {
  contentItemId: string;
  rating: number;
  comment?: string;
};

export type CreateContentItemInput = {
  title: string;
  type: ContentItemType;
  trainerId?: string;
  durationSeconds?: number;
  fileAssetId?: string;
  videoAssetId?: string;
  toolId?: string;
  externalUrl?: string;
};

export type ContentItemRecord = {
  id: string;
  title: string;
  type: ContentItemType;
  trainerId: string | null;
  trainer: { id: string; name: string; email: string } | null;
  durationSeconds: number | null;
  durationLabel: string | null;
  status: ContentItemStatus;
  video: {
    id: string;
    durationSeconds: number | null;
    status: string;
  } | null;
  file: {
    id: string;
    originalFilename: string;
    mimeType: string;
    sizeBytes: number;
    status: string;
  } | null;
  toolLink: {
    id: string;
    toolId: string | null;
    externalUrl: string | null;
    source: "library" | "custom";
    toolName: string | null;
    url: string | null;
  } | null;
  usage: {
    modules: number;
    programmes: number;
    position: number | null;
  };
  learnerProgress: {
    status: "not_started" | "in_progress" | "completed";
    progressPercent: number;
    lastPositionSeconds: number | null;
    completedAt: string | null;
  } | null;
  createdAt: string;
  updatedAt: string;
};

export type ContentItemPage = {
  items: ContentItemRecord[];
  nextCursor: string | null;
  totalItems: number;
  summary: {
    total: number;
    video: number;
    pdf: number;
    tool: number;
  };
};

export type ContentItemQuery = {
  search?: string;
  programmeId?: string;
  type?: ContentItemType;
  status?: ContentItemStatus;
  trainerId?: string;
  moduleId?: string;
  excludeModuleId?: string;
  take?: number;
  cursor?: string;
};

export type CreateModuleContentVariables = {
  moduleId: string;
  payload: CreateContentItemInput;
};

export type UpdateContentItemVariables = {
  contentItemId: string;
  payload: { title?: string; trainerId?: string };
};

export type AttachContentItemVariables = {
  moduleId: string;
  contentItemId: string;
};

export type MoveModuleContentItemVariables = {
  moduleId: string;
  contentItemId: string;
  position: number;
};
