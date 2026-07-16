import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../database/prisma.service";

type RecurringSyncClient = Pick<
  Prisma.TransactionClient,
  "$executeRaw" | "$queryRaw"
>;

@Injectable()
export class RecurringDeliverableService {
  private fullSync?: Promise<number>;
  private lastFullSyncAt = 0;

  constructor(private readonly prisma: PrismaService) {}

  async ensureCurrent(maxAgeMs = 60_000) {
    if (Date.now() - this.lastFullSyncAt < maxAgeMs) return 0;
    if (!this.fullSync) {
      this.fullSync = this.sync(this.prisma).finally(() => {
        this.fullSync = undefined;
      });
    }
    return this.fullSync;
  }

  async sync(
    client: RecurringSyncClient,
    entrepreneurUserId: string | null = null,
  ) {
    await client.$executeRaw(Prisma.sql`
      UPDATE "deliverable_instances"
      SET "status" = 'overdue'::"DeliverableInstanceStatus",
          "updated_at" = CURRENT_TIMESTAMP
      WHERE "status" = 'not_submitted'::"DeliverableInstanceStatus"
        AND "due_date" < CURRENT_TIMESTAMP
        AND (${entrepreneurUserId}::text IS NULL
          OR "entrepreneur_user_id" = ${entrepreneurUserId}::text)
    `);
    const rows = await client.$queryRaw<Array<{ created: number }>>(Prisma.sql`
      SELECT sync_recurring_deliverable_instances(
        ${entrepreneurUserId}::text,
        CURRENT_TIMESTAMP::timestamp(3)
      ) AS created
    `);
    const created = Number(rows[0]?.created ?? 0);
    if (!entrepreneurUserId) this.lastFullSyncAt = Date.now();
    return created;
  }
}
