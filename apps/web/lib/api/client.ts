import type { ApiErrorResponse, ApiSuccess } from '@bid/shared';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:4000/api';

export function apiResourceUrl(path: string) {
  return `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;
}

type ApiErrorBody = {
  message?: string | string[];
  error?: string | ApiErrorResponse['error'];
};

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code = 'REQUEST_ERROR',
    readonly requestId?: string,
    readonly details?: { field?: string; message: string }[],
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export async function apiRequest<TResponse>(
  path: string,
  options: RequestInit = {},
): Promise<TResponse> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    credentials: 'include',
    headers: {
      'content-type': 'application/json',
      ...options.headers,
    },
  });

  const body = (await response.json().catch(() => null)) as ApiErrorBody | ApiSuccess<TResponse> | TResponse | null;

  if (!response.ok) {
    const error = readApiError(body);
    throw new ApiError(error.message, response.status, error.code, error.requestId, error.details);
  }

  return isApiSuccess<TResponse>(body) ? body.data : (body as TResponse);
}

function isApiSuccess<T>(body: unknown): body is ApiSuccess<T> {
  return Boolean(body && typeof body === 'object' && 'data' in body && 'meta' in body);
}

function readApiError(body: unknown) {
  if (body && typeof body === 'object' && 'error' in body) {
    const error = (body as ApiErrorResponse).error;
    if (error && typeof error === 'object') return error;
  }

  return { code: 'REQUEST_ERROR', message: readErrorMessage(body), requestId: undefined, details: undefined };
}

function readErrorMessage(body: ApiErrorBody | unknown) {
  if (!body || typeof body !== 'object') {
    return 'Something went wrong. Please try again.';
  }

  const error = (body as ApiErrorBody).error;
  if (error && typeof error === 'object') return error.message;
  const message = (body as ApiErrorBody).message;
  if (Array.isArray(message)) {
    return message[0] ?? 'Something went wrong. Please try again.';
  }

  return message ?? (typeof error === 'string' ? error : undefined) ?? 'Something went wrong. Please try again.';
}
