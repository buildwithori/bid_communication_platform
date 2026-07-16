import { Injectable } from "@nestjs/common";
import { AuditOutboxStatus, Prisma, PrismaClient } from "@prisma/client";
import { randomUUID } from "crypto";
import { RequestContextService } from "../common/request-context/request-context.service";
import { PrismaService } from "../database/prisma.service";
import { redactAuditPayload } from "./audit-redaction";

type AuditClient = Prisma.TransactionClient | PrismaService | PrismaClient;

export type AuditEventInput = {
  eventKey?: string;
  actorUserId?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  summary?: string | null;
  payload?: Prisma.InputJsonValue | null;
  ipAddress?: string | null;
  userAgent?: string | null;
};

export type AuditableEntity = { id: string; name?: string };

export type AuditLifecycleDefinition = {
  action: string;
  entityType: string;
  entityId: (result: AuditableEntity) => string | null | undefined;
  summary?: string | ((result: AuditableEntity) => string | null | undefined);
  payload?: Prisma.InputJsonValue | null;
  eventKey?: (result: AuditableEntity) => string | undefined;
};

@Injectable()
export class AuditService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly requestContext: RequestContextService,
  ) {}

  capture<TResult extends AuditableEntity>(
    definition: AuditLifecycleDefinition,
    mutation: (tx: Prisma.TransactionClient) => Promise<TResult>,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const result = await mutation(tx);
      const summary =
        typeof definition.summary === "function"
          ? definition.summary(result)
          : definition.summary;
      await this.enqueue(
        {
          action: definition.action,
          entityType: definition.entityType,
          entityId: definition.entityId(result),
          summary,
          payload: definition.payload,
          eventKey: definition.eventKey?.(result),
        },
        tx,
      );
      return result;
    });
  }

  enqueue(input: AuditEventInput, client: AuditClient = this.prisma) {
    const context = this.requestContext.get();
    const eventKey =
      input.eventKey ??
      `${input.action}:${input.entityType}:${input.entityId ?? "none"}:${randomUUID()}`;
    return client.auditOutbox.upsert({
      where: { eventKey },
      create: {
        eventKey,
        actorUserId: input.actorUserId ?? context?.actorUserId ?? null,
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId ?? null,
        summary: input.summary ?? null,
        payload: this.buildPayload(input),
      },
      update: {},
    });
  }

  async processPending(limit = 50) {
    const now = new Date();
    await this.prisma.auditOutbox.updateMany({
      where: {
        status: AuditOutboxStatus.processing,
        lockedAt: { lt: new Date(now.getTime() - 5 * 60_000) },
      },
      data: {
        status: AuditOutboxStatus.failed,
        lockedAt: null,
        nextAttemptAt: now,
        error: "Audit worker stopped before completion.",
      },
    });

    const events = await this.prisma.auditOutbox.findMany({
      where: {
        status: { in: [AuditOutboxStatus.pending, AuditOutboxStatus.failed] },
        attempts: { lt: 10 },
        OR: [{ nextAttemptAt: null }, { nextAttemptAt: { lte: now } }],
      },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      take: limit,
    });

    let processed = 0;
    let failed = 0;
    for (const event of events) {
      const attemptNumber = event.attempts + 1;
      const locked = await this.prisma.auditOutbox.updateMany({
        where: {
          id: event.id,
          status: {
            in: [AuditOutboxStatus.pending, AuditOutboxStatus.failed],
          },
          attempts: { lt: 10 },
          OR: [{ nextAttemptAt: null }, { nextAttemptAt: { lte: now } }],
        },
        data: {
          status: AuditOutboxStatus.processing,
          lockedAt: new Date(),
          attempts: { increment: 1 },
          nextAttemptAt: null,
          error: null,
        },
      });
      if (locked.count === 0) continue;

      await this.prisma
        .$transaction(async (tx) => {
          const existingLog = await tx.auditLog.findUnique({
            where: { outboxId: event.id },
            select: { id: true },
          });
          if (!existingLog) {
            const payload = this.readPayload(event.payload);
            await tx.auditLog.create({
              data: {
                outboxId: event.id,
                actorUserId: event.actorUserId,
                action: event.action,
                entityType: event.entityType,
                entityId: event.entityId,
                summary: event.summary,
                metadata:
                  payload.metadata === null
                    ? Prisma.JsonNull
                    : payload.metadata,
                ipAddress: payload.ipAddress,
                userAgent: payload.userAgent,
              },
            });
          }

          await tx.auditOutbox.update({
            where: { id: event.id },
            data: {
              status: AuditOutboxStatus.processed,
              processedAt: new Date(),
              lockedAt: null,
              nextAttemptAt: null,
            },
          });
          processed += 1;
        })
        .catch(async (error: unknown) => {
          failed += 1;
          const exhausted = attemptNumber >= 10;
          const delayMinutes = Math.min(2 ** attemptNumber, 60);
          await this.prisma.auditOutbox.updateMany({
            where: { id: event.id, status: AuditOutboxStatus.processing },
            data: {
              status: AuditOutboxStatus.failed,
              lockedAt: null,
              nextAttemptAt: exhausted
                ? null
                : new Date(Date.now() + delayMinutes * 60_000),
              error: this.processingError(error),
            },
          });
        });
    }

    return {
      processed,
      failed,
      total: events.length,
      hasMore: events.length === limit,
    };
  }

  private processingError(error: unknown) {
    const message =
      error instanceof Error ? error.message : "Unknown audit processing error";
    return message.slice(0, 500);
  }

  private buildPayload(input: AuditEventInput): Prisma.InputJsonObject {
    const context = this.requestContext.get();
    return {
      metadata: {
        requestId: context?.requestId ?? null,
        correlationId: context?.correlationId ?? null,
        data: redactAuditPayload(input.payload ?? null),
      },
      ipAddress: input.ipAddress ?? context?.ipAddress ?? null,
      userAgent: input.userAgent ?? context?.userAgent ?? null,
    };
  }

  private readPayload(payload: Prisma.JsonValue | null) {
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
      return { metadata: null, ipAddress: null, userAgent: null };
    }

    const value = payload as Record<string, Prisma.JsonValue>;
    return {
      metadata: value.metadata ?? null,
      ipAddress: typeof value.ipAddress === "string" ? value.ipAddress : null,
      userAgent: typeof value.userAgent === "string" ? value.userAgent : null,
    };
  }
}
