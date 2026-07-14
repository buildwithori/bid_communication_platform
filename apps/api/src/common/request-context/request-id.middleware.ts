import { Injectable, NestMiddleware } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { RequestWithContext } from './request-context.types';

type ResponseLike = { setHeader(name: string, value: string): void };

@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  use(request: RequestWithContext, response: ResponseLike, next: () => void) {
    const incoming = request.headers['x-request-id'];
    const requestId = typeof incoming === 'string' && incoming.trim() ? incoming.trim() : randomUUID();
    request.requestId = requestId;
    response.setHeader('x-request-id', requestId);
    next();
  }
}
