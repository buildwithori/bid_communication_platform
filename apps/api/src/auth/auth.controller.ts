import { Body, Controller, Get, Post, Query, Req, Res } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { User } from '@prisma/client';
import { ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { GoogleAuthService } from './google-auth.service';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { GoogleOnboardingDto } from './dto/google-onboarding.dto';
import { LoginDto } from './dto/login.dto';
import { ResendVerificationDto } from './dto/resend-verification.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { SignupDto } from './dto/signup.dto';
import { TokenDto } from './dto/token.dto';
import { clearGoogleOAuthCookie, clearSessionCookie, readGoogleOAuthCookie, readSessionCookie, setGoogleOAuthCookie, setSessionCookie } from './auth.cookies';
import { CurrentUser } from './decorators/current-user.decorator';
import { Public } from './decorators/public.decorator';

type CookieRequest = { headers: { cookie?: string } };
type CookieResponse = {
  cookie: (name: string, value: string, options: CookieOptions) => void;
  clearCookie: (name: string, options: CookieOptions) => void;
  redirect: (url: string) => void;
};
type CookieOptions = { httpOnly: boolean; secure: boolean; sameSite: 'lax'; path: string; maxAge?: number };

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly googleAuth: GoogleAuthService,
    private readonly config: ConfigService,
  ) {}

  @Public() @Post('signup')
  signup(@Body() dto: SignupDto) { return this.authService.signup(dto); }

  @Public() @Post('login')
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) response: CookieResponse) {
    const result = await this.authService.login(dto);
    setSessionCookie(response, result.sessionToken);
    const { sessionToken: _sessionToken, ...body } = result;
    return body;
  }

  @Public() @Post('forgot-password')
  forgotPassword(@Body() dto: ForgotPasswordDto) { return this.authService.forgotPassword(dto); }

  @Public() @Post('reset-password')
  resetPassword(@Body() dto: ResetPasswordDto) { return this.authService.resetPassword(dto); }

  @Public() @Post('verify-email')
  verifyEmail(@Body() dto: TokenDto) { return this.authService.verifyEmail(dto); }

  @Public() @Post('resend-verification')
  resendVerification(@Body() dto: ResendVerificationDto) { return this.authService.resendVerification(dto); }

  @Public() @Get('google/start')
  googleStart(@Query('mode') requestedMode: string | undefined, @Res() response: CookieResponse) {
    const mode = requestedMode === 'signup' ? 'signup' : 'login';
    const authorization = this.googleAuth.createAuthorization(mode);
    setGoogleOAuthCookie(response, authorization.state, mode);
    response.redirect(authorization.url);
  }

  @Public() @Get('google/callback')
  async googleCallback(@Query('code') code: string, @Query('state') state: string, @Req() request: CookieRequest, @Res() response: CookieResponse) {
    const oauth = readGoogleOAuthCookie(request);
    if (!oauth) return response.redirect(`${this.webUrl()}/auth/login?oauthError=expired`);
    const result = await this.googleAuth.handleCallback(code, oauth.state, state);
    clearGoogleOAuthCookie(response);
    setSessionCookie(response, result.sessionToken);
    response.redirect(result.onboardingRequired ? `${this.webUrl()}/auth/onboarding` : `${this.webUrl()}/entrepreneur/dashboard`);
  }

  @Get('onboarding')
  onboarding(@CurrentUser() user: User) { return this.googleAuth.getOnboarding(user.id); }

  @Post('onboarding')
  completeOnboarding(@CurrentUser() user: User, @Body() dto: GoogleOnboardingDto) {
    return this.googleAuth.completeOnboarding(user.id, dto);
  }

  @Public() @Post('refresh')
  async refresh(@Req() request: CookieRequest, @Res({ passthrough: true }) response: CookieResponse) {
    const result = await this.authService.refresh(readSessionCookie(request));
    setSessionCookie(response, result.sessionToken);
    const { sessionToken: _sessionToken, ...body } = result;
    return body;
  }

  @Post('logout')
  async logout(@Req() request: CookieRequest, @Res({ passthrough: true }) response: CookieResponse) {
    const result = await this.authService.logout(readSessionCookie(request));
    clearSessionCookie(response);
    return result;
  }

  @Public() @Get('me')
  me(@Req() request: CookieRequest) { return this.authService.me(readSessionCookie(request)); }

  private webUrl() { return this.config.getOrThrow<string>('APP_WEB_URL').replace(/\/$/, ''); }
}
