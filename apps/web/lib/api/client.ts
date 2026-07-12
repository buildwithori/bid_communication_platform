const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:4000/api';

type ApiErrorBody = {
  message?: string | string[];
  error?: string;
};

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
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

  const body = (await response.json().catch(() => null)) as ApiErrorBody | TResponse | null;

  if (!response.ok) {
    throw new ApiError(readErrorMessage(body), response.status);
  }

  return body as TResponse;
}

function readErrorMessage(body: ApiErrorBody | unknown) {
  if (!body || typeof body !== 'object') {
    return 'Something went wrong. Please try again.';
  }

  const message = (body as ApiErrorBody).message;
  if (Array.isArray(message)) {
    return message[0] ?? 'Something went wrong. Please try again.';
  }

  return message ?? (body as ApiErrorBody).error ?? 'Something went wrong. Please try again.';
}
