import { apiRequest } from "../client";
import type { DirectUploadPayload, FileAsset, SignedFileUrl } from "./types";

export const createDirectUploadRequest = (payload: DirectUploadPayload) =>
  apiRequest<{ file: FileAsset; upload: SignedFileUrl }>(
    "/files/direct-upload-url",
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );

export const completeDirectUploadRequest = (fileId: string) =>
  apiRequest<FileAsset>(`/files/${fileId}/complete`, {
    method: "POST",
  });

export const getSignedFileUrlRequest = (fileId: string) =>
  apiRequest<{ file: FileAsset; download: SignedFileUrl }>(
    `/files/${fileId}/signed-url`,
  );
