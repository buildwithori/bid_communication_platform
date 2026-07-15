import {
  BadRequestException,
  Injectable,
  ServiceUnavailableException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  CalendarConnection,
  CalendarConnectionStatus,
  CalendarProvider,
  User,
} from "@prisma/client";
import { OAuth2Client } from "google-auth-library";
import { AuditService } from "../audit/audit.service";
import { createPlainToken } from "../auth/auth.tokens";
import { PrismaService } from "../database/prisma.service";
import { CalendarTokenService } from "./calendar-token.service";

const CALENDAR_SCOPES = [
  "openid",
  "email",
  "https://www.googleapis.com/auth/calendar.events",
  "https://www.googleapis.com/auth/calendar.freebusy",
];

@Injectable()
export class CalendarService {
  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly tokens: CalendarTokenService,
  ) {}

  authorization() {
    const state = createPlainToken(32);
    const url = this.client().generateAuthUrl({
      access_type: "offline",
      prompt: "consent select_account",
      state,
      scope: CALENDAR_SCOPES,
      include_granted_scopes: true,
    });
    return { state, url };
  }

  async handleCallback(
    user: User,
    code: string,
    expectedState: string,
    returnedState: string,
  ) {
    if (!code || !returnedState || returnedState !== expectedState) {
      throw new BadRequestException(
        "Google Calendar authorization state is invalid or expired.",
      );
    }

    const client = this.client();
    const { tokens } = await client.getToken(code);
    if (!tokens.access_token || !tokens.id_token) {
      throw new BadRequestException(
        "Google did not return complete Calendar credentials.",
      );
    }

    const ticket = await client.verifyIdToken({
      idToken: tokens.id_token,
      audience: this.clientId(),
    });
    const profile = ticket.getPayload();
    if (!profile?.email || !profile.email_verified) {
      throw new BadRequestException(
        "Google Calendar account email must be verified.",
      );
    }

    const existing = await this.prisma.calendarConnection.findUnique({
      where: {
        userId_provider: {
          userId: user.id,
          provider: CalendarProvider.google,
        },
      },
    });
    const refreshToken =
      tokens.refresh_token ??
      (existing
        ? this.tokens.decrypt(existing.encryptedRefreshToken)
        : undefined);
    if (!refreshToken) {
      throw new BadRequestException(
        "Google did not return an offline Calendar refresh token. Revoke BID Hub access in Google and try again.",
      );
    }

    const scopeValue = tokens.scope?.split(/\s+/).filter(Boolean);
    const connection = await this.audit.capture(
      {
        action: "calendar.connection.connected",
        entityType: "calendarConnection",
        entityId: (result) => result.id,
        summary: "Connected Google Calendar",
        payload: { provider: CalendarProvider.google },
      },
      (tx) =>
        tx.calendarConnection.upsert({
          where: {
            userId_provider: {
              userId: user.id,
              provider: CalendarProvider.google,
            },
          },
          create: {
            userId: user.id,
            provider: CalendarProvider.google,
            providerAccountEmail: profile.email!.trim().toLowerCase(),
            encryptedAccessToken: this.tokens.encrypt(tokens.access_token!),
            encryptedRefreshToken: this.tokens.encrypt(refreshToken),
            scopes: scopeValue?.length ? scopeValue : CALENDAR_SCOPES,
            status: CalendarConnectionStatus.connected,
            lastSyncedAt: new Date(),
          },
          update: {
            providerAccountEmail: profile.email!.trim().toLowerCase(),
            encryptedAccessToken: this.tokens.encrypt(tokens.access_token!),
            encryptedRefreshToken: this.tokens.encrypt(refreshToken),
            scopes: scopeValue?.length ? scopeValue : CALENDAR_SCOPES,
            status: CalendarConnectionStatus.connected,
            lastSyncedAt: new Date(),
          },
        }),
    );

    return this.mapConnection(connection);
  }

  async getConnection(userId: string) {
    const connection = await this.prisma.calendarConnection.findUnique({
      where: {
        userId_provider: {
          userId,
          provider: CalendarProvider.google,
        },
      },
    });
    return this.mapConnection(connection);
  }

  async disconnect(userId: string) {
    const connection = await this.prisma.calendarConnection.findUnique({
      where: {
        userId_provider: {
          userId,
          provider: CalendarProvider.google,
        },
      },
    });
    if (!connection) return this.mapConnection(null);

    await this.audit.capture(
      {
        action: "calendar.connection.disconnected",
        entityType: "calendarConnection",
        entityId: (result) => result.id,
        summary: "Disconnected Google Calendar",
        payload: { provider: CalendarProvider.google },
      },
      (tx) =>
        tx.calendarConnection.delete({
          where: { id: connection.id },
        }),
    );
    return this.mapConnection(null);
  }

  private mapConnection(connection: CalendarConnection | null) {
    return {
      connected: connection?.status === CalendarConnectionStatus.connected,
      provider: CalendarProvider.google,
      accountEmail: connection?.providerAccountEmail ?? null,
      scopes: connection?.scopes ?? [],
      lastSyncedAt: connection?.lastSyncedAt?.toISOString() ?? null,
    };
  }

  private client() {
    const secret = this.config.get<string>("GOOGLE_CLIENT_SECRET");
    if (!secret) {
      throw new ServiceUnavailableException(
        "Google Calendar is not configured.",
      );
    }
    return new OAuth2Client(this.clientId(), secret, this.redirectUri());
  }

  private clientId() {
    const value = this.config.get<string>("GOOGLE_CLIENT_ID");
    if (!value) {
      throw new ServiceUnavailableException(
        "Google Calendar is not configured.",
      );
    }
    return value;
  }

  private redirectUri() {
    return (
      this.config.get<string>("GOOGLE_CALENDAR_REDIRECT_URI") ??
      `${this.config
        .getOrThrow<string>("API_PUBLIC_URL")
        .replace(/\/$/, "")}/api/calendar/google/callback`
    );
  }
}
