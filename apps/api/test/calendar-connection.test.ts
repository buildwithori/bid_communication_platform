import assert from "node:assert/strict";
import test from "node:test";
import { ConflictException } from "@nestjs/common";
import { UserRole, UserStatus } from "@prisma/client";
import { CalendarService } from "../src/calendar/calendar.service";

function user(id: string) {
  return {
    id,
    email: `${id}@bid.org`,
    passwordHash: null,
    firstName: null,
    lastName: null,
    phone: null,
    timezone: null,
    avatarUrl: null,
    role: UserRole.trainer,
    status: UserStatus.active,
    emailVerifiedAt: new Date(),
    invitedById: null,
    lastLoginAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

test("a Google Calendar identity cannot be connected to another BID Hub user", async () => {
  const prisma = {
    calendarConnection: {
      findFirst: async () => ({ userId: "existing-user" }),
      findUnique: async () => null,
    },
  };
  const integration = {
    trackOutbound: async (
      _metadata: unknown,
      operation: () => Promise<unknown>,
    ) => operation(),
  };
  const service = new CalendarService(
    { get: () => "google-client-id" } as never,
    prisma as never,
    {} as never,
    {} as never,
    integration as never,
  );
  (
    service as unknown as {
      client: () => {
        getToken: () => Promise<{
          tokens: {
            access_token: string;
            refresh_token: string;
            id_token: string;
          };
        }>;
        verifyIdToken: () => Promise<{
          getPayload: () => {
            sub: string;
            email: string;
            email_verified: boolean;
          };
        }>;
      };
    }
  ).client = () => ({
    getToken: async () => ({
      tokens: {
        access_token: "access-token",
        refresh_token: "refresh-token",
        id_token: "identity-token",
      },
    }),
    verifyIdToken: async () => ({
      getPayload: () => ({
        sub: "google-account-1",
        email: "shared@example.com",
        email_verified: true,
      }),
    }),
  });

  await assert.rejects(
    service.handleCallback(user("new-user"), "code", "state", "state"),
    (error) =>
      error instanceof ConflictException &&
      error.message.includes("already connected"),
  );
});
