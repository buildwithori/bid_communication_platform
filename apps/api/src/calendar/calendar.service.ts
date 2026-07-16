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

  async getBusyIntervals(userId: string, timeMin: Date, timeMax: Date) {
    const connection = await this.requireConnection(userId);
    const response = await this.googleRequest<{
      calendars?: Record<
        string,
        { busy?: Array<{ start: string; end: string }> }
      >;
    }>(connection, {
      url: "https://www.googleapis.com/calendar/v3/freeBusy",
      method: "POST",
      data: {
        timeMin: timeMin.toISOString(),
        timeMax: timeMax.toISOString(),
        items: [{ id: "primary" }],
      },
    });

    return (response.calendars?.primary?.busy ?? []).map((period) => ({
      startAt: new Date(period.start),
      endAt: new Date(period.end),
    }));
  }

  async isAvailable(userId: string, startAt: Date, endAt: Date) {
    const busy = await this.getBusyIntervals(userId, startAt, endAt);
    return !busy.some(
      (period) => period.startAt < endAt && period.endAt > startAt,
    );
  }

  async createSessionEvent(input: {
    ownerUserId: string;
    entrepreneurEmail: string;
    topic: string;
    notes?: string | null;
    startAt: Date;
    endAt: Date;
    timezone: string;
    requestId: string;
  }) {
    const connection = await this.requireConnection(input.ownerUserId);
    const response = await this.googleRequest<{
      id?: string;
      hangoutLink?: string;
      conferenceData?: {
        entryPoints?: Array<{ entryPointType?: string; uri?: string }>;
      };
    }>(connection, {
      url: "https://www.googleapis.com/calendar/v3/calendars/primary/events?conferenceDataVersion=1&sendUpdates=all",
      method: "POST",
      data: {
        summary: input.topic,
        description: input.notes || undefined,
        start: {
          dateTime: input.startAt.toISOString(),
          timeZone: input.timezone,
        },
        end: { dateTime: input.endAt.toISOString(), timeZone: input.timezone },
        attendees: [{ email: input.entrepreneurEmail }],
        conferenceData: {
          createRequest: {
            requestId: input.requestId,
            conferenceSolutionKey: { type: "hangoutsMeet" },
          },
        },
      },
    });

    if (!response.id) {
      throw new ServiceUnavailableException(
        "Google Calendar did not create the session event.",
      );
    }
    let meetingUrl =
      response.hangoutLink ??
      response.conferenceData?.entryPoints?.find(
        (entry) => entry.entryPointType === "video",
      )?.uri;
    for (let attempt = 0; !meetingUrl && attempt < 4; attempt += 1) {
      await new Promise((resolve) => setTimeout(resolve, 300));
      const refreshed = await this.googleRequest<{
        hangoutLink?: string;
        conferenceData?: {
          entryPoints?: Array<{
            entryPointType?: string;
            uri?: string;
          }>;
        };
      }>(connection, {
        url:
          "https://www.googleapis.com/calendar/v3/calendars/primary/events/" +
          encodeURIComponent(response.id) +
          "?conferenceDataVersion=1",
        method: "GET",
      });
      meetingUrl =
        refreshed.hangoutLink ??
        refreshed.conferenceData?.entryPoints?.find(
          (entry) => entry.entryPointType === "video",
        )?.uri;
    }
    if (!meetingUrl) {
      await this.deleteSessionEvent(input.ownerUserId, response.id).catch(
        () => undefined,
      );
      throw new ServiceUnavailableException(
        "Google Calendar did not finish creating the Meet link. Try again.",
      );
    }
    return { eventId: response.id, meetingUrl };
  }

  async updateSessionEvent(input: {
    ownerUserId: string;
    eventId: string;
    topic: string;
    notes?: string | null;
    startAt: Date;
    endAt: Date;
    timezone: string;
  }) {
    const connection = await this.requireConnection(input.ownerUserId);
    await this.googleRequest(connection, {
      url:
        "https://www.googleapis.com/calendar/v3/calendars/primary/events/" +
        encodeURIComponent(input.eventId) +
        "?sendUpdates=all",
      method: "PATCH",
      data: {
        summary: input.topic,
        description: input.notes || undefined,
        start: {
          dateTime: input.startAt.toISOString(),
          timeZone: input.timezone,
        },
        end: { dateTime: input.endAt.toISOString(), timeZone: input.timezone },
      },
    });
  }

  async deleteSessionEvent(ownerUserId: string, eventId: string) {
    const connection = await this.requireConnection(ownerUserId);
    await this.googleRequest(connection, {
      url:
        "https://www.googleapis.com/calendar/v3/calendars/primary/events/" +
        encodeURIComponent(eventId) +
        "?sendUpdates=all",
      method: "DELETE",
    });
  }

  private async requireConnection(userId: string) {
    const connection = await this.prisma.calendarConnection.findUnique({
      where: {
        userId_provider: { userId, provider: CalendarProvider.google },
      },
    });
    if (
      !connection ||
      connection.status !== CalendarConnectionStatus.connected
    ) {
      throw new BadRequestException(
        "Connect Google Calendar before using session availability.",
      );
    }
    return connection;
  }

  private async googleRequest<T = unknown>(
    connection: CalendarConnection,
    request: {
      url: string;
      method: "GET" | "POST" | "PATCH" | "DELETE";
      data?: unknown;
    },
  ): Promise<T> {
    const client = this.client();
    client.setCredentials({
      access_token: this.tokens.decrypt(connection.encryptedAccessToken),
      refresh_token: this.tokens.decrypt(connection.encryptedRefreshToken),
    });

    try {
      const response = await client.request<T>(request);
      const refreshedAccessToken = client.credentials.access_token;
      if (refreshedAccessToken) {
        await this.prisma.calendarConnection.update({
          where: { id: connection.id },
          data: {
            encryptedAccessToken: this.tokens.encrypt(refreshedAccessToken),
            status: CalendarConnectionStatus.connected,
            lastSyncedAt: new Date(),
          },
        });
      }
      return response.data;
    } catch (error) {
      const status = (error as { response?: { status?: number } }).response
        ?.status;
      if (request.method === "DELETE" && status === 404) {
        return undefined as T;
      }
      await this.prisma.calendarConnection.update({
        where: { id: connection.id },
        data: { status: CalendarConnectionStatus.error },
      });
      throw new ServiceUnavailableException(
        "Google Calendar availability is temporarily unavailable. Reconnect the calendar if the problem continues.",
      );
    }
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
