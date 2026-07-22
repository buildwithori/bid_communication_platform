import {
  BadGatewayException,
  Injectable,
  ServiceUnavailableException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { IntegrationLoggerService } from "../common/observability/integration-logger.service";

type MuxDirectUploadResponse = {
  data?: MuxDirectUpload;
  error?: { messages?: string[] };
};

export type MuxDirectUpload = {
  id?: string;
  url?: string;
  status?: "waiting" | "asset_created" | "errored" | "cancelled" | "timed_out";
  timeout?: number;
  asset_id?: string;
  error?: { type?: string; message?: string };
};

type MuxAssetResponse = {
  data?: MuxAsset;
  error?: { messages?: string[] };
};

export type MuxAsset = {
  id?: string;
  status?: "preparing" | "ready" | "errored";
  duration?: number;
  playback_ids?: Array<{ id?: string; policy?: string }>;
  errors?: { messages?: string[]; message?: string };
};

@Injectable()
export class MuxClient {
  constructor(
    private readonly config: ConfigService,
    private readonly integration: IntegrationLoggerService,
  ) {}

  async createDirectUpload(videoAssetId: string, userId: string) {
    const response = await this.request<MuxDirectUploadResponse>("/uploads", {
      method: "POST",
      body: JSON.stringify({
        cors_origin: this.config.getOrThrow<string>("WEB_ORIGIN"),
        new_asset_settings: {
          playback_policies: ["signed"],
          video_quality: "basic",
          passthrough: videoAssetId,
          meta: {
            external_id: videoAssetId,
            creator_id: userId,
          },
        },
      }),
    });
    const id = response?.data?.id;
    const url = response?.data?.url;
    if (!id || !url) {
      throw new BadGatewayException("Mux did not return a direct upload URL.");
    }
    return { id, url };
  }

  async cancelDirectUpload(uploadId: string) {
    await this.request(`/uploads/${encodeURIComponent(uploadId)}/cancel`, {
      method: "PUT",
    });
  }

  async getDirectUpload(uploadId: string) {
    const response = await this.request<MuxDirectUploadResponse>(
      `/uploads/${encodeURIComponent(uploadId)}`,
      { method: "GET" },
      true,
    );
    return response?.data ?? null;
  }

  async getAsset(assetId: string) {
    const response = await this.request<MuxAssetResponse>(
      `/assets/${encodeURIComponent(assetId)}`,
      { method: "GET" },
      true,
    );
    return response?.data ?? null;
  }

  async deleteAsset(assetId: string) {
    await this.request(`/assets/${encodeURIComponent(assetId)}`, {
      method: "DELETE",
    });
  }

  private async request<T = unknown>(
    path: string,
    init: RequestInit,
    notFoundAsNull = false,
  ): Promise<T | null> {
    const tokenId = this.config.get<string>("MUX_TOKEN_ID");
    const tokenSecret = this.config.get<string>("MUX_TOKEN_SECRET");
    if (!tokenId || !tokenSecret) {
      throw new ServiceUnavailableException(
        "Video uploads are not configured for this environment.",
      );
    }

    const method = init.method ?? "GET";
    const operation = this.operation(path, method);
    return this.integration.trackOutbound(
      { provider: "mux", operation, method },
      async () => {
        let response: Response;
        try {
          response = await fetch(`https://api.mux.com/video/v1${path}`, {
            ...init,
            headers: {
              authorization: `Basic ${Buffer.from(
                `${tokenId}:${tokenSecret}`,
              ).toString("base64")}`,
              "content-type": "application/json",
              ...init.headers,
            },
            signal: AbortSignal.timeout(10_000),
          });
        } catch {
          throw new BadGatewayException("Could not reach the video provider.");
        }

        if (!response.ok) {
          if (notFoundAsNull && response.status === 404) return null;
          if (method === "DELETE" && response.status === 404) {
            return undefined as T;
          }
          const body = (await response
            .json()
            .catch(() => null)) as MuxDirectUploadResponse | null;
          const message = body?.error?.messages?.[0];
          throw new BadGatewayException(
            message ?? "The video provider rejected the request.",
          );
        }

        if (response.status === 204) return undefined as T;
        return (await response.json()) as T;
      },
    );
  }

  private operation(path: string, method: string) {
    if (method === "POST" && path === "/uploads") {
      return "direct_upload.create";
    }
    if (method === "GET" && path.startsWith("/uploads/")) {
      return "direct_upload.retrieve";
    }
    if (method === "PUT" && path.endsWith("/cancel")) {
      return "direct_upload.cancel";
    }
    if (method === "GET" && path.startsWith("/assets/")) {
      return "asset.retrieve";
    }
    return "asset.delete";
  }
}
