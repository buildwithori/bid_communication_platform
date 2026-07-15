"use client";

import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { videoKeys } from "./keys";
import {
  cancelDirectVideoUploadRequest,
  createDirectVideoUploadRequest,
  getSignedVideoPlaybackRequest,
  getVideoAssetRequest,
} from "./requests";
import type {
  UploadVideoVariables,
  VideoAsset,
  VideoUploadProgress,
} from "./types";
import { uploadVideoToMux } from "./upload";

type MutationHandlers<T> = {
  onSuccess?: (data: T) => void;
  onError?: (error: Error) => void;
};

const initialProgress: VideoUploadProgress = {
  loadedBytes: 0,
  totalBytes: 0,
  percent: 0,
};

export function useDirectVideoUploadMutation(
  handlers?: MutationHandlers<VideoAsset>,
) {
  const [progress, setProgress] = useState(initialProgress);
  const mutation = useMutation<VideoAsset, Error, UploadVideoVariables>({
    mutationFn: async ({ file, signal, onProgress }) => {
      if (!file.type.startsWith("video/")) {
        throw new Error("Choose a supported video file.");
      }

      setProgress({ loadedBytes: 0, totalBytes: file.size, percent: 0 });
      const directUpload = await createDirectVideoUploadRequest();
      try {
        await uploadVideoToMux(
          file,
          directUpload.upload.url,
          (nextProgress) => {
            setProgress(nextProgress);
            onProgress?.(nextProgress);
          },
          signal,
        );
      } catch (error) {
        await cancelDirectVideoUploadRequest(directUpload.video.id).catch(
          () => undefined,
        );
        throw error;
      }
      return directUpload.video;
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

export const useVideoAssetQuery = (videoAssetId?: string) =>
  useQuery({
    queryKey: videoKeys.asset(videoAssetId ?? "none"),
    queryFn: () => getVideoAssetRequest(videoAssetId as string),
    enabled: Boolean(videoAssetId),
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status === "pending" || status === "processing" ? 2_000 : false;
    },
  });

export const useSignedVideoPlaybackQuery = (
  videoAssetId?: string,
  enabled = true,
) =>
  useQuery({
    queryKey: videoKeys.playback(videoAssetId ?? "none"),
    queryFn: () => getSignedVideoPlaybackRequest(videoAssetId as string),
    enabled: Boolean(videoAssetId) && enabled,
    staleTime: 60 * 60 * 1000,
  });

export const useCancelVideoUploadMutation = (
  handlers?: MutationHandlers<VideoAsset>,
) =>
  useMutation({
    mutationFn: cancelDirectVideoUploadRequest,
    onSuccess: handlers?.onSuccess,
    onError: handlers?.onError,
  });
