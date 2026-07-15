"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import {
  completeDirectUploadRequest,
  createDirectUploadRequest,
  getSignedFileUrlRequest,
} from "./requests";
import type {
  FileAsset,
  FileUploadProgress,
  UploadFileVariables,
} from "./types";
import { uploadToSignedUrl } from "./upload";

type MutationHandlers<T> = {
  onSuccess?: (data: T) => void;
  onError?: (error: Error) => void;
};

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
        mimeType: file.type,
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

export const useSignedFileUrlMutation = (
  handlers?: MutationHandlers<{ file: FileAsset; download: { url: string } }>,
) =>
  useMutation({
    mutationFn: getSignedFileUrlRequest,
    onSuccess: handlers?.onSuccess,
    onError: handlers?.onError,
  });
