import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from '@nestjs/common';
import type { ApiErrorDetail, ApiErrorResponse } from '@bid/shared';
import { RequestWithContext } from '../request-context/request-context.types';

type ResponseLike = { status(code: number): ResponseLike; json(body: ApiErrorResponse): void };

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const http = host.switchToHttp();
    const request = http.getRequest<RequestWithContext>();
    const response = http.getResponse<ResponseLike>();
    const status = exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
    const exceptionResponse = exception instanceof HttpException ? exception.getResponse() : null;
    const messages = this.messages(exceptionResponse);

    response.status(status).json({
      error: {
        code: this.code(status),
        message: messages[0] ?? 'Something went wrong. Please try again.',
        ...(messages.length > 1 ? { details: messages.map<ApiErrorDetail>((message) => ({ message })) } : {}),
        requestId: request.requestId ?? 'unknown',
        timestamp: new Date().toISOString(),
      },
    });
  }

  private messages(value: unknown): string[] {
    if (typeof value === 'string') return [value];
    if (!value || typeof value !== 'object') return [];
    const message = (value as { message?: unknown }).message;
    if (Array.isArray(message)) return message.filter((item): item is string => typeof item === 'string');
    return typeof message === 'string' ? [message] : [];
  }

  private code(status: number) {
    const codes: Record<number, string> = {
      [HttpStatus.BAD_REQUEST]: 'VALIDATION_ERROR',
      [HttpStatus.UNAUTHORIZED]: 'UNAUTHENTICATED',
      [HttpStatus.FORBIDDEN]: 'FORBIDDEN',
      [HttpStatus.NOT_FOUND]: 'NOT_FOUND',
      [HttpStatus.CONFLICT]: 'CONFLICT',
      [HttpStatus.TOO_MANY_REQUESTS]: 'RATE_LIMITED',
    };
    return codes[status] ?? (status >= 500 ? 'INTERNAL_ERROR' : 'REQUEST_ERROR');
  }
}
