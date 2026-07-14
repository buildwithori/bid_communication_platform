import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { RequestContextService } from './request-context.service';
import { RequestWithContext } from './request-context.types';

@Injectable()
export class RequestContextInterceptor implements NestInterceptor {
  constructor(private readonly context: RequestContextService) {}

  intercept(executionContext: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = executionContext.switchToHttp().getRequest<RequestWithContext>();
    const userAgent = request.headers['user-agent'];

    return new Observable((subscriber) =>
      this.context.run(
        {
          requestId: request.requestId ?? 'unknown',
          actorUserId: request.user?.id ?? null,
          ipAddress: request.ip ?? null,
          userAgent: typeof userAgent === 'string' ? userAgent : null,
        },
        () => next.handle().subscribe(subscriber),
      ),
    );
  }
}
