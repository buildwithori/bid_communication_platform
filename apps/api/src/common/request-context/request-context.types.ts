import type { User } from "@prisma/client";

export type RequestWithContext = {
  headers: Record<string, string | string[] | undefined>;
  method?: string;
  originalUrl?: string;
  url?: string;
  ip?: string;
  requestId?: string;
  correlationId?: string;
  user?: User;
};

export type RequestContext = {
  requestId: string;
  correlationId: string;
  actorUserId: string | null;
  ipAddress: string | null;
  userAgent: string | null;
};
