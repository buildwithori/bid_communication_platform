export type VideoAssetStatus =
  | "pending"
  | "processing"
  | "ready"
  | "failed"
  | "archived";

export type VideoAsset = {
  id: string;
  status: VideoAssetStatus;
  durationSeconds: number | null;
  readyAt: string | null;
  failureReason: string | null;
  attached: boolean;
  createdAt: string;
  updatedAt: string;
};

export type VideoUploadProgress = {
  loadedBytes: number;
  totalBytes: number;
  percent: number;
};

export type DirectVideoUpload = {
  video: VideoAsset;
  upload: { url: string; method: "PUT" };
};

export type UploadVideoVariables = {
  file: File;
  signal?: AbortSignal;
  onProgress?: (progress: VideoUploadProgress) => void;
};

export type SignedVideoPlayback = {
  playbackId: string;
  token: string;
  expiresAt: string;
};
