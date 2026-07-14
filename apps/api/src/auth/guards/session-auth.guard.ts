import { CanActivate, ExecutionContext, ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { UserStatus } from '@prisma/client';
import { Reflector } from '@nestjs/core';
import { AuthService } from '../auth.service';
import { readSessionCookie } from '../auth.cookies';
import { AuthenticatedRequest } from '../auth.types';

import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
@Injectable()
export class SessionAuthGuard implements CanActivate {
  constructor(
    private readonly authService: AuthService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const user = await this.authService.validateSession(readSessionCookie(request));

    if (!user) {
      throw new UnauthorizedException('Authentication is required.');
    }

    if (user.status !== UserStatus.active || !user.emailVerifiedAt) {
      throw new ForbiddenException('Verify your email before accessing this resource.');
    }

    request.user = user;
    return true;
  }
}
