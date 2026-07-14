import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import type { ApiSuccess } from '@bid/shared';
import { map, Observable } from 'rxjs';
import { RequestWithContext } from '../request-context/request-context.types';

@Injectable()
export class ApiResponseInterceptor<T> implements NestInterceptor<T, ApiSuccess<T>> {
  intercept(context: ExecutionContext, next: CallHandler<T>): Observable<ApiSuccess<T>> {
    const request = context.switchToHttp().getRequest<RequestWithContext>();

    return next.handle().pipe(
      map((data) => ({
        data,
        meta: {
          requestId: request.requestId ?? 'unknown',
          timestamp: new Date().toISOString(),
        },
      })),
    );
  }
}
