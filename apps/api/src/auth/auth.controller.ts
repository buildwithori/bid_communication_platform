import { Body, Controller, Get, Post, Req, Res } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { LoginDto } from './dto/login.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { SignupDto } from './dto/signup.dto';
import { TokenDto } from './dto/token.dto';
import { clearSessionCookie, readSessionCookie, setSessionCookie } from './auth.cookies';

type CookieRequest = {
  headers: {
    cookie?: string;
  };
};

type CookieResponse = {
  cookie: (name: string, value: string, options: CookieOptions) => void;
  clearCookie: (name: string, options: CookieOptions) => void;
};

type CookieOptions = {
  httpOnly: boolean;
  secure: boolean;
  sameSite: 'lax';
  path: string;
  maxAge?: number;
};

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('signup')
  signup(@Body() dto: SignupDto) {
    return this.authService.signup(dto);
  }

  @Post('login')
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) response: CookieResponse) {
    const result = await this.authService.login(dto);
    setSessionCookie(response, result.sessionToken);
    const { sessionToken: _sessionToken, ...body } = result;

    return body;
  }

  @Post('forgot-password')
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto);
  }

  @Post('reset-password')
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }

  @Post('verify-email')
  verifyEmail(@Body() dto: TokenDto) {
    return this.authService.verifyEmail(dto);
  }

  @Post('refresh')
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

  @Get('me')
  me(@Req() request: CookieRequest) {
    return this.authService.me(readSessionCookie(request));
  }
}

