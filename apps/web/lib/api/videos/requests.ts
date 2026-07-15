import { apiRequest } from "../client";
import type {
  DirectVideoUpload,
  SignedVideoPlayback,
  VideoAsset,
} from "./types";

export const createDirectVideoUploadRequest = () =>
  apiRequest<DirectVideoUpload>("/videos/direct-uploads", { method: "POST" });

export const getVideoAssetRequest = (videoAssetId: string) =>
  apiRequest<VideoAsset>(`/videos/${videoAssetId}`);

export const cancelDirectVideoUploadRequest = (videoAssetId: string) =>
  apiRequest<VideoAsset>(`/videos/${videoAssetId}/direct-upload`, {
    method: "DELETE",
  });

export const getSignedVideoPlaybackRequest = (videoAssetId: string) =>
  apiRequest<SignedVideoPlayback>(`/videos/${videoAssetId}/playback`);
