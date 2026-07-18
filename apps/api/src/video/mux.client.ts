import {
  BadGatewayException,
  Injectable,
  ServiceUnavailableException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

type MuxDirectUploadResponse = {
  data?: {
    id?: string;
    url?: string;
    status?: string;
  };
  error?: { messages?: string[] };
};

@Injectable()
export class MuxClient {
  constructor(private readonly config: ConfigService) {}

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
    const id = response.data?.id;
    const url = response.data?.url;
    if (!id || !url) {
      throw new BadGatewayException("Mux did not return a direct upload URL.");
    }
    return { id, url };
  }

  async cancelDirectUpload(uploadId: string) {
    await this.request(`/uploads/${encodeURIComponent(uploadId)}`, {
      method: "DELETE",
    });
  }

  private async request<T = unknown>(path: string, init: RequestInit): Promise<T> {
    const tokenId = this.config.get<string>("MUX_TOKEN_ID");
    const tokenSecret = this.config.get<string>("MUX_TOKEN_SECRET");
    if (!tokenId || !tokenSecret) {
      throw new ServiceUnavailableException(
        "Video uploads are not configured for this environment.",
      );
    }

    let response: Response;
    try {
      response = await fetch(`https://api.mux.com/video/v1${path}`, {
        ...init,
        headers: {
          authorization: `Basic ${Buffer.from(`${tokenId}:${tokenSecret}`).toString("base64")}`,
          "content-type": "application/json",
          ...init.headers,
        },
        signal: AbortSignal.timeout(10_000),
      });
    } catch {
      throw new BadGatewayException("Could not reach the video provider.");
    }

    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as
        | MuxDirectUploadResponse
        | null;
      const message = body?.error?.messages?.[0];
      throw new BadGatewayException(
        message ?? "The video provider rejected the request.",
      );
    }

    if (response.status === 204) return undefined as T;
    return (await response.json()) as T;
  }
}
