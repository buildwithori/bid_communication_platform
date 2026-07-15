export type FileAssetStatus =
  "pending" | "processing" | "ready" | "failed" | "archived";
export type DirectUploadUsage =
  "deliverable_submission" | "content_pdf" | "tool_pdf" | "report_export";

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
