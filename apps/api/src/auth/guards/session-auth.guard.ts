import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthService } from '../auth.service';
import { readSessionCookie } from '../auth.cookies';
import { AuthenticatedRequest } from '../auth.types';

@Injectable()
export class SessionAuthGuard implements CanActivate {
  constructor(private readonly authService: AuthService) {}

  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const user = await this.authService.validateSession(readSessionCookie(request));

    if (!user) {
      throw new UnauthorizedException('Authentication is required.');
    }

    request.user = user;
    return true;
  }
}
