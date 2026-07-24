import {
  ConflictException,
  Controller,
  Delete,
  Get,
  Post,
  Query,
  Req,
  Res,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { ApiTags } from "@nestjs/swagger";
import { User, UserRole } from "@prisma/client";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { Roles } from "../auth/decorators/roles.decorator";
import { CalendarService } from "./calendar.service";

const COOKIE_NAME = "bid_calendar_oauth";
const COOKIE_PATH = "/api/calendar/google";
const COOKIE_MAX_AGE_MS = 1000 * 60 * 10;

type CookieRequest = { headers: { cookie?: string } };
type CookieResponse = {
  cookie: (
    name: string,
    value: string,
    options: {
      httpOnly: boolean;
      secure: boolean;
      sameSite: "lax";
      path: string;
      maxAge?: number;
    },
  ) => void;
  clearCookie: (
    name: string,
    options: {
      httpOnly: boolean;
      secure: boolean;
      sameSite: "lax";
      path: string;
    },
  ) => void;
  redirect: (url: string) => void;
};

@ApiTags("calendar")
@Roles(UserRole.admin, UserRole.trainer)
@Controller("calendar")
export class CalendarController {
  constructor(
    private readonly calendar: CalendarService,
    private readonly config: ConfigService,
  ) {}

  @Get("connection")
  connection(@CurrentUser() user: User) {
    return this.calendar.getConnection(user.id);
  }

  @Post("google/authorization")
  authorization(@Res({ passthrough: true }) response: CookieResponse) {
    const authorization = this.calendar.authorization();
    response.cookie(COOKIE_NAME, authorization.state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: COOKIE_PATH,
      maxAge: COOKIE_MAX_AGE_MS,
    });
    return { url: authorization.url };
  }

  @Get("google/callback")
  async callback(
    @CurrentUser() user: User,
    @Query("code") code: string,
    @Query("state") state: string,
    @Req() request: CookieRequest,
    @Res() response: CookieResponse,
  ) {
    const expectedState = this.readCookie(request);
    if (!expectedState) {
      return response.redirect(
        `${this.settingsUrl(user.role)}?calendarError=expired`,
      );
    }

    try {
      await this.calendar.handleCallback(user, code, expectedState, state);
      this.clearCookie(response);
      return response.redirect(
        `${this.settingsUrl(user.role)}?calendar=connected`,
      );
    } catch (error) {
      this.clearCookie(response);
      if (error instanceof ConflictException) {
        return response.redirect(
          `${this.settingsUrl(user.role)}?calendarError=in-use`,
        );
      }
      return response.redirect(
        `${this.settingsUrl(user.role)}?calendarError=failed`,
      );
    }
  }

  @Delete("connection")
  disconnect(@CurrentUser() user: User) {
    return this.calendar.disconnect(user.id);
  }

  private settingsUrl(role: UserRole) {
    const webUrl = this.config
      .getOrThrow<string>("APP_WEB_URL")
      .replace(/\/$/, "");
    return role === UserRole.trainer
      ? `${webUrl}/trainer/settings`
      : `${webUrl}/admin/settings`;
  }

  private readCookie(request: CookieRequest) {
    return request.headers.cookie
      ?.split(";")
      .map((part) => part.trim().split("="))
      .find(([name]) => name === COOKIE_NAME)
      ?.slice(1)
      .join("=");
  }

  private clearCookie(response: CookieResponse) {
    response.clearCookie(COOKIE_NAME, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: COOKIE_PATH,
    });
  }
}
