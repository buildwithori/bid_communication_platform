export type ApiToolRequestStatus =
  "under_review" | "in_development" | "built" | "declined";

export type ToolRequestRecord = {
  id: string;
  entrepreneurUserId: string;
  title: string;
  businessNeed: string;
  toolArea: { id: string; name: string; key: string };
  neededBy: string | null;
  status: ApiToolRequestStatus;
  availableTransitions: ApiToolRequestStatus[];
  adminDecisionNote: string | null;
  decidedAt: string | null;
  decidedBy: { id: string; name: string; email: string } | null;
  linkedTool: { id: string; name: string; status: string } | null;
  entrepreneur: {
    userId: string;
    name: string;
    email: string;
    businessId: string | null;
    businessName: string;
    country: string | null;
    programmes: Array<{ id: string; name: string }>;
  };
  createdAt: string;
  updatedAt: string;
};

export type ToolRequestQuery = {
  search?: string;
  status?: ApiToolRequestStatus;
  toolAreaId?: string;
  take?: number;
  cursor?: string;
};

export type ToolRequestPage = {
  items: ToolRequestRecord[];
  nextCursor: string | null;
  totalItems: number;
};

export type ToolRequestSummary = Record<ApiToolRequestStatus, number>;

export type CreateToolRequestPayload = {
  title: string;
  businessNeed: string;
  toolAreaId: string;
  neededBy?: string | null;
};

export type UpdateToolRequestPayload = {
  status?: ApiToolRequestStatus;
  adminDecisionNote?: string | null;
  linkedToolId?: string | null;
};

export type UpdateToolRequestVariables = {
  id: string;
  payload: UpdateToolRequestPayload;
};
