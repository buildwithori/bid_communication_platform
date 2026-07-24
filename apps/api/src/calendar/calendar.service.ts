import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  CalendarConnection,
  CalendarAttendeeResponseStatus,
  CalendarConnectionStatus,
  CalendarProvider,
  Prisma,
  User,
} from "@prisma/client";
import { OAuth2Client } from "google-auth-library";
import { createHash, randomUUID } from "node:crypto";
import { AuditService } from "../audit/audit.service";
import { createPlainToken } from "../auth/auth.tokens";
import { PrismaService } from "../database/prisma.service";
import { IntegrationLoggerService } from "../common/observability/integration-logger.service";
import { CalendarTokenService } from "./calendar-token.service";

const CALENDAR_SCOPES = [
  "openid",
  "email",
  "https://www.googleapis.com/auth/calendar.events",
  "https://www.googleapis.com/auth/calendar.freebusy",
];

type GoogleRequest = {
  url: string;
  method: "GET" | "POST" | "PATCH" | "DELETE";
  data?: unknown;
};

@Injectable()
export class CalendarService {
  private readonly logger = new Logger(CalendarService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly tokens: CalendarTokenService,
    private readonly integration: IntegrationLoggerService,
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
    const { tokens } = await this.integration.trackOutbound(
      {
        provider: "google_oauth",
        operation: "calendar.token_exchange",
        method: "POST",
      },
      () => client.getToken(code),
    );
    if (!tokens.access_token || !tokens.id_token) {
      throw new BadRequestException(
        "Google did not return complete Calendar credentials.",
      );
    }

    const ticket = await this.integration.trackOutbound(
      {
        provider: "google_oauth",
        operation: "calendar.identity_verify",
        method: "POST",
      },
      () =>
        client.verifyIdToken({
          idToken: tokens.id_token!,
          audience: this.clientId(),
        }),
    );
    const profile = ticket.getPayload();
    if (!profile?.sub || !profile.email || !profile.email_verified) {
      throw new BadRequestException(
        "Google Calendar account identity and email must be verified.",
      );
    }
    const providerAccountId = profile.sub;
    const providerAccountEmail = profile.email.trim().toLowerCase();

    const claimedConnection = await this.prisma.calendarConnection.findFirst({
      where: {
        provider: CalendarProvider.google,
        OR: [{ providerAccountId }, { providerAccountEmail }],
      },
      select: { userId: true },
    });
    if (claimedConnection && claimedConnection.userId !== user.id) {
      throw new ConflictException(
        "This Google Calendar is already connected to another BID Hub account.",
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
    let connection: CalendarConnection;
    try {
      connection = await this.audit.capture(
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
              providerAccountId,
              providerAccountEmail,
              encryptedAccessToken: this.tokens.encrypt(tokens.access_token!),
              encryptedRefreshToken: this.tokens.encrypt(refreshToken),
              scopes: scopeValue?.length ? scopeValue : CALENDAR_SCOPES,
              status: CalendarConnectionStatus.connected,
              lastSyncedAt: new Date(),
            },
            update: {
              providerAccountId,
              providerAccountEmail,
              encryptedAccessToken: this.tokens.encrypt(tokens.access_token!),
              encryptedRefreshToken: this.tokens.encrypt(refreshToken),
              scopes: scopeValue?.length ? scopeValue : CALENDAR_SCOPES,
              status: CalendarConnectionStatus.connected,
              lastSyncedAt: new Date(),
            },
          }),
      );
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        throw new ConflictException(
          "This Google Calendar is already connected to another BID Hub account.",
        );
      }
      throw error;
    }

    await this.ensureWatchChannel(connection.id).catch((error: unknown) => {
      this.logger.warn(
        JSON.stringify({
          event: "calendar.watch.setup_deferred",
          connectionId: connection.id,
          error: error instanceof Error ? error.name : "UnknownError",
        }),
      );
    });

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

    await this.stopWatchChannel(connection).catch(() => undefined);
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
      etag?: string;
      updated?: string;
      hangoutLink?: string;
      attendees?: Array<{ email?: string; responseStatus?: string }>;
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
    return {
      eventId: response.id,
      meetingUrl,
      eventEtag: response.etag ?? null,
      responseStatus: this.attendeeResponse(
        response.attendees,
        input.entrepreneurEmail,
      ),
      responseUpdatedAt: response.updated
        ? new Date(response.updated)
        : new Date(),
    };
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

  async getSessionEvent(
    connection: CalendarConnection,
    eventId: string,
    entrepreneurEmail: string,
  ) {
    const response = await this.googleRequest<{
      id?: string;
      etag?: string;
      status?: string;
      updated?: string;
      attendees?: Array<{ email?: string; responseStatus?: string }>;
    }>(
      connection,
      {
        url:
          "https://www.googleapis.com/calendar/v3/calendars/primary/events/" +
          encodeURIComponent(eventId),
        method: "GET",
      },
      { tolerateNotFound: true, preserveConnectionStatus: true },
    );
    if (!response) return null;
    return {
      eventId: response.id ?? eventId,
      eventEtag: response.etag ?? null,
      eventStatus: response.status ?? "confirmed",
      responseStatus: this.attendeeResponse(
        response.attendees,
        entrepreneurEmail,
      ),
      responseUpdatedAt: response.updated
        ? new Date(response.updated)
        : new Date(),
    };
  }

  async ensureWatchChannel(connectionId: string) {
    const connection = await this.prisma.calendarConnection.findUnique({
      where: { id: connectionId },
    });
    if (
      !connection ||
      connection.status !== CalendarConnectionStatus.connected ||
      !this.pushNotificationsAvailable()
    ) {
      return null;
    }
    if (
      connection.watchChannelId &&
      connection.watchResourceId &&
      connection.watchExpiresAt &&
      connection.watchExpiresAt.getTime() > Date.now() + 24 * 60 * 60_000
    ) {
      return connection;
    }

    const previous = connection.watchChannelId
      ? {
          id: connection.watchChannelId,
          resourceId: connection.watchResourceId,
        }
      : null;
    const channelId = randomUUID();
    const channelToken = createPlainToken(32);
    await this.prisma.calendarConnection.update({
      where: { id: connection.id },
      data: {
        watchChannelId: channelId,
        watchResourceId: null,
        watchTokenHash: this.hashChannelToken(channelToken),
        watchExpiresAt: null,
      },
    });

    try {
      const channel = await this.googleRequest<{
        id: string;
        resourceId: string;
        expiration?: string;
      }>(
        connection,
        {
          url: "https://www.googleapis.com/calendar/v3/calendars/primary/events/watch",
          method: "POST",
          data: {
            id: channelId,
            type: "web_hook",
            address: this.webhookUrl(),
            token: channelToken,
            params: { ttl: "604800" },
          },
        },
        { preserveConnectionStatus: true },
      );
      const updated = await this.prisma.calendarConnection.update({
        where: { id: connection.id },
        data: {
          watchChannelId: channel.id,
          watchResourceId: channel.resourceId,
          watchExpiresAt: channel.expiration
            ? new Date(Number(channel.expiration))
            : new Date(Date.now() + 6 * 24 * 60 * 60_000),
        },
      });
      if (previous?.resourceId) {
        await this.stopWatchChannel(connection, previous).catch(
          () => undefined,
        );
      }
      return updated;
    } catch (error) {
      await this.prisma.calendarConnection.updateMany({
        where: { id: connection.id, watchChannelId: channelId },
        data: {
          watchChannelId: previous?.id ?? null,
          watchResourceId: previous?.resourceId ?? null,
          watchTokenHash: previous ? connection.watchTokenHash : null,
          watchExpiresAt: previous ? connection.watchExpiresAt : null,
        },
      });
      throw error;
    }
  }

  channelTokenHash(value: string) {
    return this.hashChannelToken(value);
  }

  pushNotificationsAvailable() {
    return (
      new URL(this.config.getOrThrow<string>("API_PUBLIC_URL")).protocol ===
      "https:"
    );
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

  private googleRequest<T = unknown>(
    connection: CalendarConnection,
    request: GoogleRequest,
  ): Promise<T>;
  private googleRequest<T = unknown>(
    connection: CalendarConnection,
    request: GoogleRequest,
    options: {
      tolerateNotFound: true;
      preserveConnectionStatus?: boolean;
    },
  ): Promise<T | null>;
  private googleRequest<T = unknown>(
    connection: CalendarConnection,
    request: GoogleRequest,
    options: {
      tolerateNotFound?: false;
      preserveConnectionStatus: true;
    },
  ): Promise<T>;
  private async googleRequest<T = unknown>(
    connection: CalendarConnection,
    request: GoogleRequest,
    options: {
      tolerateNotFound?: boolean;
      preserveConnectionStatus?: boolean;
    } = {},
  ): Promise<T | null> {
    const client = this.client();
    client.setCredentials({
      access_token: this.tokens.decrypt(connection.encryptedAccessToken),
      refresh_token: this.tokens.decrypt(connection.encryptedRefreshToken),
    });

    return this.integration.trackOutbound(
      {
        provider: "google_calendar",
        operation: this.calendarOperation(request),
        method: request.method,
      },
      async () => {
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
          if (
            status === 404 &&
            (request.method === "DELETE" || options.tolerateNotFound)
          ) {
            return null;
          }
          if (!options.preserveConnectionStatus) {
            await this.prisma.calendarConnection.update({
              where: { id: connection.id },
              data: { status: CalendarConnectionStatus.error },
            });
          }
          throw new ServiceUnavailableException(
            "Google Calendar availability is temporarily unavailable. Reconnect the calendar if the problem continues.",
          );
        }
      },
    );
  }

  private calendarOperation(request: { url: string; method: string }) {
    if (request.url.includes("/freeBusy")) return "free_busy.query";
    if (request.url.endsWith("/events/watch")) return "events.watch";
    if (request.url.endsWith("/channels/stop")) return "channels.stop";
    if (request.method === "POST") return "event.create";
    if (request.method === "PATCH") return "event.update";
    if (request.method === "DELETE") return "event.delete";
    return "event.get";
  }

  private attendeeResponse(
    attendees: Array<{ email?: string; responseStatus?: string }> | undefined,
    entrepreneurEmail: string,
  ): CalendarAttendeeResponseStatus {
    const response = attendees?.find(
      (attendee) =>
        attendee.email?.trim().toLowerCase() ===
        entrepreneurEmail.trim().toLowerCase(),
    )?.responseStatus;
    if (response === "accepted") {
      return CalendarAttendeeResponseStatus.accepted;
    }
    if (response === "tentative") {
      return CalendarAttendeeResponseStatus.tentative;
    }
    if (response === "declined") {
      return CalendarAttendeeResponseStatus.declined;
    }
    return CalendarAttendeeResponseStatus.needs_action;
  }

  private async stopWatchChannel(
    connection: CalendarConnection,
    channel: { id: string; resourceId: string | null } = {
      id: connection.watchChannelId ?? "",
      resourceId: connection.watchResourceId,
    },
  ) {
    if (!channel.id || !channel.resourceId) return;
    await this.googleRequest(
      connection,
      {
        url: "https://www.googleapis.com/calendar/v3/channels/stop",
        method: "POST",
        data: { id: channel.id, resourceId: channel.resourceId },
      },
      { preserveConnectionStatus: true },
    );
  }

  private hashChannelToken(token: string) {
    return createHash("sha256").update(token).digest("hex");
  }

  private webhookUrl() {
    return `${this.config
      .getOrThrow<string>("API_PUBLIC_URL")
      .replace(/\/$/, "")}/api/webhooks/google-calendar`;
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
