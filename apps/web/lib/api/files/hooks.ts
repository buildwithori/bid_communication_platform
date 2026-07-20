"use client";

import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { fileKeys } from "./keys";
import {
  completeDirectUploadRequest,
  createDirectUploadRequest,
  getSignedFileUrlRequest,
  getWorkbookPreviewRequest,
} from "./requests";
import type {
  FileAsset,
  FileUploadProgress,
  UploadFileVariables,
  WorkbookPreviewQuery,
} from "./types";
import { uploadToSignedUrl } from "./upload";

type MutationHandlers<T> = {
  onSuccess?: (data: T) => void;
  onError?: (error: Error) => void;
};

const workbookMimeType =
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

const uploadMimeType = (file: File) =>
  file.type ||
  (file.name.toLowerCase().endsWith(".xlsx")
    ? workbookMimeType
    : "application/octet-stream");

const initialProgress: FileUploadProgress = {
  loadedBytes: 0,
  totalBytes: 0,
  percent: 0,
};

export function useDirectFileUploadMutation(
  handlers?: MutationHandlers<FileAsset>,
) {
  const [progress, setProgress] = useState(initialProgress);
  const mutation = useMutation<FileAsset, Error, UploadFileVariables>({
    mutationFn: async ({ file, usage, contentItemId, signal, onProgress }) => {
      setProgress({ loadedBytes: 0, totalBytes: file.size, percent: 0 });
      const directUpload = await createDirectUploadRequest({
        originalFilename: file.name,
        mimeType: uploadMimeType(file),
        sizeBytes: file.size,
        usage,
        contentItemId,
      });
      await uploadToSignedUrl(
        file,
        directUpload.upload,
        (nextProgress) => {
          setProgress(nextProgress);
          onProgress?.(nextProgress);
        },
        signal,
      );
      return completeDirectUploadRequest(directUpload.file.id);
    },
    onSuccess: handlers?.onSuccess,
    onError: handlers?.onError,
  });

  return {
    ...mutation,
    progress,
    reset: () => {
      setProgress(initialProgress);
      mutation.reset();
    },
  };
}

export const useSignedFileUrlQuery = (fileId?: string, enabled = true) =>
  useQuery({
    queryKey: fileKeys.signedUrl(fileId ?? "none"),
    queryFn: () => getSignedFileUrlRequest(fileId as string),
    enabled: Boolean(fileId) && enabled,
    staleTime: 4 * 60 * 1000,
  });

export const useSignedFileUrlMutation = (
  handlers?: MutationHandlers<{ file: FileAsset; download: { url: string } }>,
) =>
  useMutation({
    mutationFn: getSignedFileUrlRequest,
    onSuccess: handlers?.onSuccess,
    onError: handlers?.onError,
  });

export const useWorkbookPreviewQuery = (
  fileId: string | undefined,
  query: WorkbookPreviewQuery,
  enabled = true,
) =>
  useQuery({
    queryKey: fileKeys.workbookPreview(fileId ?? "none", query),
    queryFn: () => getWorkbookPreviewRequest(fileId as string, query),
    enabled: Boolean(fileId) && enabled,
    placeholderData: (previous) => previous,
  });
