export const BID_APP_NAME = 'BID Hub';

export const API_HEALTH_PATH = '/health';

export type ApiMeta = {
  requestId: string;
  timestamp: string;
};

export type ApiSuccess<T> = {
  data: T;
  meta: ApiMeta;
};

export type ApiErrorDetail = {
  field?: string;
  message: string;
};

export type ApiErrorResponse = {
  error: {
    code: string;
    message: string;
    details?: ApiErrorDetail[];
    requestId: string;
    timestamp: string;
  };
};

export type CursorPage<T> = {
  items: T[];
  nextCursor: string | null;
};
