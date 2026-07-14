import { Injectable } from '@nestjs/common';
import { AuditOutboxStatus, Prisma, PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';
import { PrismaService } from '../database/prisma.service';

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

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  enqueue(input: AuditEventInput, client: AuditClient = this.prisma) {
    const eventKey = input.eventKey ?? `${input.action}:${input.entityType}:${input.entityId ?? 'none'}:${randomUUID()}`;
    return client.auditOutbox.upsert({
      where: { eventKey },
      create: {
        eventKey,
        actorUserId: input.actorUserId ?? null,
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
    const events = await this.prisma.auditOutbox.findMany({
      where: { status: { in: [AuditOutboxStatus.pending, AuditOutboxStatus.failed] } },
      orderBy: { createdAt: 'asc' },
      take: limit,
    });

    let processed = 0;
    for (const event of events) {
      await this.prisma.$transaction(async (tx) => {
        const locked = await tx.auditOutbox.updateMany({
          where: { id: event.id, status: { in: [AuditOutboxStatus.pending, AuditOutboxStatus.failed] } },
          data: {
            status: AuditOutboxStatus.processing,
            lockedAt: new Date(),
            attempts: { increment: 1 },
            error: null,
          },
        });
        if (locked.count === 0) return;

        const payload = this.readPayload(event.payload);
        await tx.auditLog.upsert({
          where: { outboxId: event.id },
          create: {
            outboxId: event.id,
            actorUserId: event.actorUserId,
            action: event.action,
            entityType: event.entityType,
            entityId: event.entityId,
            summary: event.summary,
            metadata: payload.metadata === null ? Prisma.JsonNull : payload.metadata,
            ipAddress: payload.ipAddress,
            userAgent: payload.userAgent,
          },
          update: {},
        });

        await tx.auditOutbox.update({
          where: { id: event.id },
          data: { status: AuditOutboxStatus.processed, processedAt: new Date(), lockedAt: null },
        });
        processed += 1;
      }).catch(async (error: unknown) => {
        await this.prisma.auditOutbox.update({
          where: { id: event.id },
          data: {
            status: AuditOutboxStatus.failed,
            lockedAt: null,
            error: error instanceof Error ? error.message : 'Unknown audit processing error',
          },
        });
      });
    }

    return { processed, total: events.length };
  }

  private buildPayload(input: AuditEventInput): Prisma.InputJsonObject {
    return {
      metadata: input.payload ?? null,
      ipAddress: input.ipAddress ?? null,
      userAgent: input.userAgent ?? null,
    };
  }

  private readPayload(payload: Prisma.JsonValue | null) {
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
      return { metadata: null, ipAddress: null, userAgent: null };
    }

    const value = payload as Record<string, Prisma.JsonValue>;
    return {
      metadata: value.metadata ?? null,
      ipAddress: typeof value.ipAddress === 'string' ? value.ipAddress : null,
      userAgent: typeof value.userAgent === 'string' ? value.userAgent : null,
    };
  }
}
