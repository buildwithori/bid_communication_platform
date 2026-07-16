export type ApiToolType = "pdf" | "embedded_tool";
export type ApiToolVisibility =
  "all_entrepreneurs" | "programmes" | "entrepreneurs";
export type ApiToolStatus = "draft" | "published" | "archived";

export type ToolRecord = {
  id: string;
  name: string;
  description: string;
  type: ApiToolType;
  toolArea: { id: string; name: string; key: string };
  iconKey: string;
  visibility: ApiToolVisibility;
  status: ApiToolStatus;
  embeddedUrl: string | null;
  pdfAsset: {
    id: string;
    originalFilename: string;
    mimeType: string;
    sizeBytes: string;
    status: string;
    storageKey: string;
    downloadUrl: string | null;
  } | null;
  audience: {
    programmeIds: string[];
    entrepreneurUserIds: string[];
    hiddenEntrepreneurUserIds: string[];
    programmes: Array<{ id: string; name: string }>;
    entrepreneurs: Array<{ id: string; name: string }>;
    hiddenEntrepreneurs: Array<{ id: string; name: string }>;
  };
  createdBy: { id: string; name: string; email: string };
  updatedBy: { id: string; name: string; email: string } | null;
  publishedAt: string | null;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ToolQuery = {
  search?: string;
  type?: ApiToolType;
  visibility?: ApiToolVisibility;
  status?: ApiToolStatus;
  toolAreaId?: string;
  take?: number;
  cursor?: string;
};

export type ToolPage = {
  items: ToolRecord[];
  nextCursor: string | null;
  totalItems: number;
  summary: {
    statuses: { published: number; draft: number; archived: number };
    visibility: {
      allEntrepreneurs: number;
      programmes: number;
      entrepreneurs: number;
    };
  };
};

export type ToolPayload = {
  name?: string;
  description?: string;
  type?: ApiToolType;
  toolAreaId?: string;
  iconKey?: string;
  visibility?: ApiToolVisibility;
  status?: ApiToolStatus;
  pdfAssetId?: string | null;
  embeddedUrl?: string | null;
  programmeIds?: string[];
  entrepreneurUserIds?: string[];
  hiddenEntrepreneurUserIds?: string[];
};

export type CreateToolPayload = Required<
  Pick<
    ToolPayload,
    | "name"
    | "description"
    | "type"
    | "toolAreaId"
    | "iconKey"
    | "visibility"
    | "status"
  >
> &
  ToolPayload;

export type UpdateToolVariables = { id: string; payload: ToolPayload };
