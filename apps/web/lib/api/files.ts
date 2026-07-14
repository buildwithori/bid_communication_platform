import { apiRequest } from './client';

export type FileAsset = {
  id: string;
  originalFilename: string;
  mimeType: string;
  sizeBytes: number;
  status: 'pending' | 'processing' | 'ready' | 'failed' | 'archived';
  createdAt: string;
  updatedAt: string;
};

export type DirectUploadUsage = 'deliverable_submission' | 'content_pdf' | 'tool_pdf' | 'report_export';

export type SignedFileUrl = {
  url: string;
  method: 'PUT' | 'GET';
  headers: Record<string, string>;
  expiresAt: string;
  provider: 'digitalocean_spaces' | 'development_placeholder';
};

export function createDirectUpload(payload: {
  originalFilename: string;
  mimeType: string;
  sizeBytes: number;
  usage: DirectUploadUsage;
  contentItemId?: string;
}) {
  return apiRequest<{ file: FileAsset; upload: SignedFileUrl }>('/files/direct-upload-url', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function getSignedFileUrl(fileId: string) {
  return apiRequest<{ file: FileAsset; download: SignedFileUrl }>(`/files/${fileId}/signed-url`);
}
