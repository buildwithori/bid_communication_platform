import type { User } from "@prisma/client";

export type RequestWithContext = {
  headers: Record<string, string | string[] | undefined>;
  ip?: string;
  requestId?: string;
  user?: User;
};

export type RequestContext = {
  requestId: string;
  correlationId: string;
  actorUserId: string | null;
  ipAddress: string | null;
  userAgent: string | null;
};
