import { apiRequest } from "../client";
import type {
  DirectUploadPayload,
  FileAsset,
  SignedFileUrl,
  WorkbookPreview,
  WorkbookPreviewQuery,
} from "./types";

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

export const getWorkbookPreviewRequest = (
  fileId: string,
  query: WorkbookPreviewQuery,
) => {
  const params = new URLSearchParams();
  if (query.sheet) params.set("sheet", query.sheet);
  if (query.rowStart) params.set("rowStart", String(query.rowStart));
  if (query.columnStart) params.set("columnStart", String(query.columnStart));
  if (query.rowTake) params.set("rowTake", String(query.rowTake));
  if (query.columnTake) params.set("columnTake", String(query.columnTake));
  const search = params.toString();
  return apiRequest<WorkbookPreview>(
    "/files/" + fileId + "/workbook-preview" + (search ? "?" + search : ""),
  );
};
