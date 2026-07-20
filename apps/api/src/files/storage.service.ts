import { Injectable, ServiceUnavailableException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { IntegrationLoggerService } from "../common/observability/integration-logger.service";
import { createHmac, createHash } from "crypto";

export type SignedUrlInput = {
  method: "PUT" | "GET" | "HEAD" | "DELETE";
  storageKey: string;
  mimeType?: string;
  expiresInSeconds?: number;
};

@Injectable()
export class StorageService {
  constructor(
    private readonly config: ConfigService,
    private readonly integration: IntegrationLoggerService,
  ) {}

  presign(input: SignedUrlInput, options?: { internal?: boolean }) {
    const bucket = this.config.get<string>("DO_SPACES_BUCKET");
    const publicEndpoint = this.config.get<string>("DO_SPACES_ENDPOINT");
    const endpoint = options?.internal
      ? (this.config.get<string>("DO_SPACES_INTERNAL_ENDPOINT") ??
        publicEndpoint)
      : publicEndpoint;
    const accessKeyId = this.config.get<string>("DO_SPACES_ACCESS_KEY_ID");
    const secretAccessKey = this.config.get<string>(
      "DO_SPACES_SECRET_ACCESS_KEY",
    );
    const region = this.config.get<string>("DO_SPACES_REGION") ?? "nyc3";
    const expiresInSeconds =
      input.expiresInSeconds ?? (input.method === "PUT" ? 900 : 300);

    if (!bucket || !endpoint || !accessKeyId || !secretAccessKey) {
      throw new ServiceUnavailableException(
        "Object storage is not configured.",
      );
    }

    const endpointUrl = new URL(endpoint);
    const forcePathStyle =
      this.config.get<boolean>("DO_SPACES_FORCE_PATH_STYLE") ?? false;
    const host = forcePathStyle
      ? endpointUrl.host
      : `${bucket}.${endpointUrl.host}`;
    const encodedKey = input.storageKey
      .split("/")
      .map((segment) => this.encodeRfc3986(segment))
      .join("/");
    const pathname = forcePathStyle
      ? `/${this.encodeRfc3986(bucket)}/${encodedKey}`
      : `/${encodedKey}`;
    const now = new Date();
    const amzDate = this.amzDate(now);
    const dateStamp = amzDate.slice(0, 8);
    const credentialScope = `${dateStamp}/${region}/s3/aws4_request`;
    const signedHeaders = input.method === "PUT" ? "content-type;host" : "host";
    const queryParams: Array<[string, string]> = [
      ["X-Amz-Algorithm", "AWS4-HMAC-SHA256"],
      ["X-Amz-Credential", `${accessKeyId}/${credentialScope}`],
      ["X-Amz-Date", amzDate],
      ["X-Amz-Expires", String(expiresInSeconds)],
      ["X-Amz-SignedHeaders", signedHeaders],
    ];
    const canonicalQuery = this.canonicalQuery(queryParams);
    const canonicalHeaders =
      input.method === "PUT"
        ? `content-type:${input.mimeType ?? "application/octet-stream"}\nhost:${host}\n`
        : `host:${host}\n`;
    const canonicalRequest = [
      input.method,
      pathname,
      canonicalQuery,
      canonicalHeaders,
      signedHeaders,
      "UNSIGNED-PAYLOAD",
    ].join("\n");
    const stringToSign = [
      "AWS4-HMAC-SHA256",
      amzDate,
      credentialScope,
      this.sha256(canonicalRequest),
    ].join("\n");
    const signingKey = this.signingKey(
      secretAccessKey,
      dateStamp,
      region,
      "s3",
    );
    const signature = createHmac("sha256", signingKey)
      .update(stringToSign)
      .digest("hex");
    const signedQuery = this.canonicalQuery([
      ...queryParams,
      ["X-Amz-Signature", signature],
    ]);

    return {
      url: `${endpointUrl.protocol}//${host}${pathname}?${signedQuery}`,
      method: input.method,
      headers:
        input.method === "PUT"
          ? { "content-type": input.mimeType ?? "application/octet-stream" }
          : {},
      expiresAt: new Date(
        now.getTime() + expiresInSeconds * 1000,
      ).toISOString(),
      provider: "digitalocean_spaces" as const,
    };
  }

  async statObject(storageKey: string) {
    const signed = this.presign(
      { method: "HEAD", storageKey, expiresInSeconds: 60 },
      { internal: true },
    );
    const response = await this.request(
      signed.url,
      { method: "HEAD", signal: AbortSignal.timeout(10_000) },
      storageKey === "__bid-hub-healthcheck__" ? undefined : "object.stat",
    );
    if (response.status === 404) return null;
    if (!response.ok) {
      throw new ServiceUnavailableException(
        "Object storage could not verify the upload.",
      );
    }
    const contentLength = Number(response.headers.get("content-length"));
    return {
      sizeBytes: Number.isFinite(contentLength) ? contentLength : null,
      mimeType:
        response.headers
          .get("content-type")
          ?.split(";")[0]
          ?.trim()
          .toLowerCase() ?? null,
      etag: response.headers.get("etag"),
    };
  }

  async readObjectPrefix(storageKey: string, maxBytes = 16) {
    const signed = this.presign(
      { method: "GET", storageKey, expiresInSeconds: 60 },
      { internal: true },
    );
    const response = await this.request(
      signed.url,
      {
        method: "GET",
        headers: { range: `bytes=0-${Math.max(0, maxBytes - 1)}` },
        signal: AbortSignal.timeout(10_000),
      },
      "object.read_prefix",
    );
    if (!response.ok) {
      throw new ServiceUnavailableException(
        "Object storage could not inspect the upload.",
      );
    }
    return new Uint8Array(await response.arrayBuffer());
  }

  async healthCheck() {
    await this.statObject("__bid-hub-healthcheck__");
    return { provider: "s3-compatible" as const };
  }

  async putObject(storageKey: string, mimeType: string, body: Uint8Array) {
    const signed = this.presign(
      { method: "PUT", storageKey, mimeType, expiresInSeconds: 300 },
      { internal: true },
    );
    const response = await this.request(
      signed.url,
      {
        method: "PUT",
        headers: { "content-type": mimeType },
        body: body as unknown as BodyInit,
        signal: AbortSignal.timeout(30_000),
      },
      "object.put",
    );
    if (!response.ok) {
      throw new ServiceUnavailableException(
        "Object storage could not save the generated file.",
      );
    }
  }

  async deleteObject(storageKey: string) {
    const signed = this.presign(
      { method: "DELETE", storageKey, expiresInSeconds: 60 },
      { internal: true },
    );
    const response = await this.request(
      signed.url,
      { method: "DELETE", signal: AbortSignal.timeout(10_000) },
      "object.delete",
    );
    if (!response.ok && response.status !== 404) {
      throw new ServiceUnavailableException(
        "Object storage could not delete the file.",
      );
    }
  }

  private async request(url: string, init: RequestInit, operation?: string) {
    const execute = async () => {
      try {
        return await fetch(url, init);
      } catch {
        throw new ServiceUnavailableException(
          "Object storage is temporarily unavailable.",
        );
      }
    };
    if (!operation) return execute();
    return this.integration.trackOutbound(
      { provider: "digitalocean_spaces", operation, method: init.method },
      execute,
    );
  }

  private amzDate(date: Date) {
    return date.toISOString().replace(/[:-]|\.\d{3}/g, "");
  }

  private sha256(value: string) {
    return createHash("sha256").update(value).digest("hex");
  }

  private canonicalQuery(params: Array<[string, string]>) {
    return [...params]
      .sort(([leftKey, leftValue], [rightKey, rightValue]) => {
        const keySort = leftKey.localeCompare(rightKey);
        return keySort === 0 ? leftValue.localeCompare(rightValue) : keySort;
      })
      .map(
        ([key, value]) =>
          `${this.encodeRfc3986(key)}=${this.encodeRfc3986(value)}`,
      )
      .join("&");
  }

  private encodeRfc3986(value: string) {
    return encodeURIComponent(value).replace(
      /[!'()*]/g,
      (character) => `%${character.charCodeAt(0).toString(16).toUpperCase()}`,
    );
  }

  private signingKey(
    secret: string,
    dateStamp: string,
    region: string,
    service: string,
  ) {
    const dateKey = createHmac("sha256", `AWS4${secret}`)
      .update(dateStamp)
      .digest();
    const regionKey = createHmac("sha256", dateKey).update(region).digest();
    const serviceKey = createHmac("sha256", regionKey).update(service).digest();
    return createHmac("sha256", serviceKey).update("aws4_request").digest();
  }
}
