export type FileAssetStatus =
  "pending" | "processing" | "ready" | "failed" | "archived";
export type DirectUploadUsage =
  | "deliverable_submission"
  | "content_pdf"
  | "content_excel"
  | "tool_pdf"
  | "tool_excel"
  | "report_export";

export type FileAsset = {
  id: string;
  originalFilename: string;
  mimeType: string;
  sizeBytes: number;
  status: FileAssetStatus;
  usage: DirectUploadUsage | null;
  verifiedAt: string | null;
  failureReason: string | null;
  createdAt: string;
  updatedAt: string;
};

export type SignedFileUrl = {
  url: string;
  method: "PUT" | "GET";
  headers: Record<string, string>;
  expiresAt: string;
  provider: "digitalocean_spaces";
};

export type DirectUploadPayload = {
  originalFilename: string;
  mimeType: string;
  sizeBytes: number;
  usage: DirectUploadUsage;
  contentItemId?: string;
};

export type FileUploadProgress = {
  loadedBytes: number;
  totalBytes: number;
  percent: number;
};

export type UploadFileVariables = {
  file: File;
  usage: DirectUploadUsage;
  contentItemId?: string;
  signal?: AbortSignal;
  onProgress?: (progress: FileUploadProgress) => void;
};

export type WorkbookPreviewQuery = {
  sheet?: string;
  rowStart?: number;
  columnStart?: number;
  rowTake?: number;
  columnTake?: number;
};

export type WorkbookPreview = {
  file: FileAsset;
  workbook: {
    sheets: Array<{ name: string; rowCount: number; columnCount: number }>;
    activeSheet: string;
  };
  window: {
    rowStart: number;
    rowEnd: number;
    columnStart: number;
    columnEnd: number;
    rowTake: number;
    columnTake: number;
    nextRowStart: number | null;
    previousColumnStart: number | null;
    nextColumnStart: number | null;
  };
  columns: Array<{ index: number; label: string }>;
  rows: Array<{ index: number; cells: string[] }>;
};
