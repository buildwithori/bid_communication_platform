import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, createHash } from 'crypto';

export type SignedUrlInput = {
  method: 'PUT' | 'GET';
  storageKey: string;
  mimeType?: string;
  expiresInSeconds?: number;
};

@Injectable()
export class StorageService {
  constructor(private readonly config: ConfigService) {}

  presign(input: SignedUrlInput) {
    const bucket = this.config.get<string>('DO_SPACES_BUCKET');
    const endpoint = this.config.get<string>('DO_SPACES_ENDPOINT');
    const accessKeyId = this.config.get<string>('DO_SPACES_ACCESS_KEY_ID');
    const secretAccessKey = this.config.get<string>('DO_SPACES_SECRET_ACCESS_KEY');
    const region = this.config.get<string>('DO_SPACES_REGION') ?? 'nyc3';
    const expiresInSeconds = input.expiresInSeconds ?? (input.method === 'PUT' ? 900 : 300);

    if (!bucket || !endpoint || !accessKeyId || !secretAccessKey) {
      return this.devSignedUrl(input, expiresInSeconds);
    }

    const endpointUrl = new URL(endpoint);
    const host = `${bucket}.${endpointUrl.host}`;
    const encodedKey = input.storageKey.split('/').map(encodeURIComponent).join('/');
    const pathname = `/${encodedKey}`;
    const now = new Date();
    const amzDate = this.amzDate(now);
    const dateStamp = amzDate.slice(0, 8);
    const credentialScope = `${dateStamp}/${region}/s3/aws4_request`;
    const signedHeaders = input.method === 'PUT' ? 'content-type;host' : 'host';
    const query = new URLSearchParams({
      'X-Amz-Algorithm': 'AWS4-HMAC-SHA256',
      'X-Amz-Credential': `${accessKeyId}/${credentialScope}`,
      'X-Amz-Date': amzDate,
      'X-Amz-Expires': String(expiresInSeconds),
      'X-Amz-SignedHeaders': signedHeaders,
    });
    const canonicalHeaders = input.method === 'PUT'
      ? `content-type:${input.mimeType ?? 'application/octet-stream'}\nhost:${host}\n`
      : `host:${host}\n`;
    const canonicalRequest = [
      input.method,
      pathname,
      query.toString(),
      canonicalHeaders,
      signedHeaders,
      'UNSIGNED-PAYLOAD',
    ].join('\n');
    const stringToSign = [
      'AWS4-HMAC-SHA256',
      amzDate,
      credentialScope,
      this.sha256(canonicalRequest),
    ].join('\n');
    const signingKey = this.signingKey(secretAccessKey, dateStamp, region, 's3');
    const signature = createHmac('sha256', signingKey).update(stringToSign).digest('hex');
    query.set('X-Amz-Signature', signature);

    return {
      url: `${endpointUrl.protocol}//${host}${pathname}?${query.toString()}`,
      method: input.method,
      headers: input.method === 'PUT' ? { 'content-type': input.mimeType ?? 'application/octet-stream' } : {},
      expiresAt: new Date(now.getTime() + expiresInSeconds * 1000).toISOString(),
      provider: 'digitalocean_spaces' as const,
    };
  }

  private devSignedUrl(input: SignedUrlInput, expiresInSeconds: number) {
    const publicBase = this.config.get<string>('WEB_ORIGIN') ?? 'http://localhost:3000';
    return {
      url: `${publicBase}/dev-file-storage/${encodeURIComponent(input.storageKey)}`,
      method: input.method,
      headers: input.method === 'PUT' ? { 'content-type': input.mimeType ?? 'application/octet-stream' } : {},
      expiresAt: new Date(Date.now() + expiresInSeconds * 1000).toISOString(),
      provider: 'development_placeholder' as const,
    };
  }

  private amzDate(date: Date) {
    return date.toISOString().replace(/[:-]|\.\d{3}/g, '');
  }

  private sha256(value: string) {
    return createHash('sha256').update(value).digest('hex');
  }

  private signingKey(secret: string, dateStamp: string, region: string, service: string) {
    const dateKey = createHmac('sha256', `AWS4${secret}`).update(dateStamp).digest();
    const regionKey = createHmac('sha256', dateKey).update(region).digest();
    const serviceKey = createHmac('sha256', regionKey).update(service).digest();
    return createHmac('sha256', serviceKey).update('aws4_request').digest();
  }
}
