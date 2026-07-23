import assert from "node:assert/strict";
import test from "node:test";
import * as ExcelJS from "exceljs";
import {
  ContentItemStatus,
  DeliverableDueType,
  ProgrammeAccessType,
  UserRole,
} from "@prisma/client";
import { ProgrammesService } from "../src/programmes/programmes.service";
import { ContentService } from "../src/content/content.service";
import { FilesService } from "../src/files/files.service";
import { ToolsService } from "../src/tools/tools.service";
import { ResourceDeletionService } from "../src/resource-deletion/resource-deletion.service";

const entrepreneur = {
  id: "entrepreneur-1",
  role: UserRole.entrepreneur,
};

test("programme player returns the complete ordered ready curriculum with learner progress", async () => {
  let curriculumQuery: any;
  const prisma = {
    programme: {
      findUnique: async () => ({
        id: "programme-1",
        name: "Growth readiness",
        description: "A practical programme",
        accessType: ProgrammeAccessType.assigned,
        publishedAt: new Date("2026-01-01"),
        archivedAt: null,
        startDate: new Date("2026-01-01"),
        endDate: new Date("2027-01-01"),
      }),
      count: async () => 1,
    },
    programmeModule: {
      findMany: async (query: unknown) => {
        curriculumQuery = query;
        return [
          {
            id: "link-1",
            moduleId: "module-1",
            position: 1,
            module: {
              id: "module-1",
              title: "Foundations",
              description: "Start here",
              contentItems: [
                {
                  contentItemId: "content-1",
                  position: 1,
                  contentItem: {
                    id: "content-1",
                    title: "Welcome",
                    type: "video",
                    status: ContentItemStatus.ready,
                    durationSeconds: 600,
                    trainer: null,
                    videoAsset: {
                      id: "video-1",
                      duration: 600,
                      status: "ready",
                    },
                    fileAssets: [],
                    toolLink: null,
                  },
                },
                {
                  contentItemId: "content-2",
                  position: 2,
                  contentItem: {
                    id: "content-2",
                    title: "Next steps",
                    type: "video",
                    status: ContentItemStatus.ready,
                    durationSeconds: 300,
                    trainer: null,
                    videoAsset: {
                      id: "video-2",
                      duration: 300,
                      status: "ready",
                    },
                    fileAssets: [],
                    toolLink: null,
                  },
                },
              ],
            },
          },
        ];
      },
    },
    learnerProgrammeProgress: {
      findUnique: async () => ({ status: "in_progress", progressPercent: 25 }),
    },
    learnerModuleProgress: {
      findMany: async () => [
        {
          moduleId: "module-1",
          status: "in_progress",
          progressPercent: 25,
          completedContentCount: 0,
          totalContentCount: 1,
        },
      ],
    },
    learnerContentProgress: {
      findMany: async () => [
        {
          moduleId: "module-1",
          contentItemId: "content-1",
          status: "in_progress",
          progressPercent: 25,
          lastPositionSeconds: 150,
          durationSeconds: 600,
          completedAt: null,
          lastSyncedAt: new Date("2026-06-01T12:00:00.000Z"),
          lastOpenedAt: new Date("2026-06-01T12:00:00.000Z"),
        },
        {
          moduleId: "module-1",
          contentItemId: "content-2",
          status: "completed",
          progressPercent: 100,
          lastPositionSeconds: 300,
          durationSeconds: 300,
          completedAt: new Date("2026-06-02T12:00:00.000Z"),
          lastSyncedAt: new Date("2026-06-02T12:00:00.000Z"),
          lastOpenedAt: new Date("2026-06-02T12:00:00.000Z"),
        },
      ],
    },
  };
  const service = new ProgrammesService(
    prisma as never,
    {} as never,
    {} as never,
  );

  const result = await service.getProgrammePlayer(
    entrepreneur as never,
    "programme-1",
  );

  assert.deepEqual(curriculumQuery.orderBy, [
    { position: "asc" },
    { id: "asc" },
  ]);
  assert.deepEqual(curriculumQuery.include.module.include.contentItems.where, {
    contentItem: { status: ContentItemStatus.ready },
  });
  assert.equal(result.modules.length, 1);
  assert.equal(result.modules[0]?.items.length, 2);
  assert.equal(result.modules[0]?.items[0]?.progress?.lastPositionSeconds, 150);
  assert.equal(result.modules[0]?.items[0]?.progress?.durationSeconds, 600);
  assert.equal(
    result.modules[0]?.items[0]?.progress?.lastSyncedAt,
    "2026-06-01T12:00:00.000Z",
  );
  assert.equal(result.viewer.userId, entrepreneur.id);
  assert.deepEqual(result.resume, {
    moduleId: "module-1",
    contentItemId: "content-2",
  });
  assert.deepEqual(result.summary, {
    modules: 1,
    contentItems: 2,
    videos: 2,
    pdfs: 0,
    excels: 0,
    tools: 0,
  });
});

test("preview visibility exposes non-ready content only to admins", async () => {
  let contentWhere: unknown = "not-called";
  const prisma = {
    programme: {
      findUnique: async () => ({
        id: "programme-1",
        name: "Draft curriculum",
        description: "",
        accessType: ProgrammeAccessType.assigned,
        publishedAt: null,
        archivedAt: null,
        startDate: new Date("2026-01-01"),
        endDate: new Date("2027-01-01"),
      }),
      count: async () => 1,
    },
    programmeModule: {
      findMany: async (query: any) => {
        contentWhere = query.include.module.include.contentItems.where;
        return [];
      },
    },
  };
  const service = new ProgrammesService(
    prisma as never,
    {} as never,
    {} as never,
  );

  const result = await service.getProgrammePlayer(
    { id: "admin-1", role: UserRole.admin } as never,
    "programme-1",
  );

  assert.equal(contentWhere, undefined);
  assert.equal(result.viewer.canTrackProgress, false);
  assert.equal(result.progress, null);
  assert.deepEqual(result.modules, []);

  contentWhere = "not-called";
  const trainerResult = await service.getProgrammePlayer(
    { id: "trainer-1", role: UserRole.trainer } as never,
    "programme-1",
  );

  assert.deepEqual(contentWhere, {
    contentItem: { status: ContentItemStatus.ready },
  });
  assert.equal(trainerResult.viewer.canTrackProgress, false);
  assert.equal(trainerResult.progress, null);
});

test("programme reuse lookup excludes programmes already containing the content", () => {
  const service = new ProgrammesService({} as never, {} as never, {} as never);
  const builder = service as unknown as {
    buildProgrammeWhere: (
      user: unknown,
      query: { excludeContentItemId: string },
    ) => { AND: unknown[] };
  };
  const where = builder.buildProgrammeWhere(
    { id: "admin-1", role: UserRole.admin },
    { excludeContentItemId: "content-1" },
  );

  assert.deepEqual(where.AND[0], {
    modules: {
      none: {
        module: {
          contentItems: { some: { contentItemId: "content-1" } },
        },
      },
    },
  });
});

test("trainer programme scope excludes archived programmes even when requested", () => {
  const service = new ProgrammesService({} as never, {} as never, {} as never);
  const builder = service as unknown as {
    buildProgrammeWhere: (
      user: unknown,
      query: { includeArchived: boolean },
    ) => { AND: Array<Record<string, unknown>> };
  };
  const where = builder.buildProgrammeWhere(
    { id: "trainer-1", role: UserRole.trainer },
    { includeArchived: true },
  );

  assert.deepEqual(where.AND, [
    {
      archivedAt: null,
      modules: {
        some: {
          module: {
            contentItems: {
              some: {
                contentItem: {
                  trainerId: "trainer-1",
                },
              },
            },
          },
        },
      },
    },
  ]);
});

test("archived programmes reject deliverable rule creation and editing", async () => {
  let deliverableLookupCalled = false;
  const prisma = {
    programme: {
      findUnique: async () => ({
        id: "programme-1",
        archivedAt: new Date("2026-06-01T00:00:00.000Z"),
      }),
    },
    programmeDeliverableRule: {
      findFirst: async () => {
        deliverableLookupCalled = true;
        return { id: "rule-1" };
      },
    },
  };
  const service = new ProgrammesService(
    prisma as never,
    {} as never,
    {} as never,
  );
  const admin = { id: "admin-1", role: UserRole.admin } as never;

  await assert.rejects(
    service.createDeliverableRule(admin, "programme-1", {} as never),
    /Restore this programme before making changes/,
  );
  await assert.rejects(
    service.updateDeliverableRule(
      admin,
      "programme-1",
      "rule-1",
      {} as never,
    ),
    /Restore this programme before making changes/,
  );
  assert.equal(deliverableLookupCalled, false);
});

test("fixed-date deliverables reject dates before today", async () => {
  const service = new ProgrammesService({} as never, {} as never, {} as never);
  const internals = service as unknown as {
    validateDeliverableRuleInput(
      programmeId: string,
      dto: unknown,
      currentRuleId?: string,
      timezone?: string,
    ): Promise<void>;
  };

  await assert.rejects(
    internals.validateDeliverableRuleInput(
      "programme-1",
      {
        name: "Past deliverable",
        dueType: DeliverableDueType.fixed_date,
        dueDate: "2000-01-01",
      },
      undefined,
      "Africa/Kigali",
    ),
    /cannot be before today/,
  );
});

test("module reuse lookup excludes shared modules that would duplicate content", async () => {
  let moduleQuery: any;
  const prisma = {
    programme: { count: async () => 1 },
    programmeModule: {
      findMany: async (query: unknown) => {
        moduleQuery = query;
        return [];
      },
      count: async () => 0,
    },
  };
  const service = new ProgrammesService(
    prisma as never,
    {} as never,
    {} as never,
  );

  await service.listProgrammeModules(
    { id: "admin-1", role: UserRole.admin } as never,
    "programme-1",
    { excludeContentItemId: "content-1" },
  );

  assert.deepEqual(moduleQuery.where.module.AND[0], {
    programmes: {
      none: {
        programme: {
          modules: {
            some: {
              module: {
                contentItems: { some: { contentItemId: "content-1" } },
              },
            },
          },
        },
      },
    },
  });
});

test("module summaries expose processing content until readiness can refresh", async () => {
  const service = new ProgrammesService(
    {
      $queryRaw: async () => [
        {
          moduleId: "module-1",
          type: "video",
          status: "processing",
          count: 1n,
        },
      ],
    } as never,
    {} as never,
    {} as never,
  );
  const internals = service as unknown as {
    moduleContentMetrics(moduleIds: string[]): Promise<Map<string, any>>;
    mapProgrammeModule(row: unknown, metrics: unknown): {
      readiness: string;
      processingContentCount: number;
    };
  };
  const metrics = await internals.moduleContentMetrics(["module-1"]);
  const summary = internals.mapProgrammeModule(
    {
      id: "link-1",
      moduleId: "module-1",
      position: 1,
      module: {
        id: "module-1",
        title: "Foundations",
        description: "",
        isReusable: true,
        updatedAt: new Date("2026-07-22T00:00:00.000Z"),
        _count: { contentItems: 1, programmes: 1 },
      },
    },
    metrics.get("module-1"),
  );

  assert.equal(summary.processingContentCount, 1);
  assert.equal(summary.readiness, "processing");
});

test("module readiness distinguishes empty, ready, and attention states", () => {
  const service = new ProgrammesService({} as never, {} as never, {} as never);
  const internals = service as unknown as {
    mapProgrammeModule(row: unknown, metrics: unknown): {
      readiness: string;
    };
  };
  const row = {
    id: "link-1",
    moduleId: "module-1",
    position: 1,
    module: {
      id: "module-1",
      title: "Foundations",
      description: "",
      isReusable: true,
      updatedAt: new Date("2026-07-22T00:00:00.000Z"),
      _count: { contentItems: 1, programmes: 1 },
    },
  };
  const content = { total: 1, videos: 1, pdfs: 0, excels: 0, tools: 0 };

  assert.equal(internals.mapProgrammeModule(row, undefined).readiness, "needs_content");
  assert.equal(
    internals.mapProgrammeModule(row, {
      content,
      readyItems: 1,
      processingItems: 0,
      learnerProgress: null,
    }).readiness,
    "ready",
  );
  assert.equal(
    internals.mapProgrammeModule(row, {
      content,
      readyItems: 0,
      processingItems: 0,
      learnerProgress: null,
    }).readiness,
    "needs_attention",
  );
});

test("content attachment rejects duplicates anywhere in a connected programme", async () => {
  let created = false;
  let locked = false;
  const transaction = {
    learningModule: {
      findUnique: async () => ({
        id: "module-target",
        programmes: [
          { programmeId: "programme-2" },
          { programmeId: "programme-1" },
        ],
      }),
    },
    contentItem: {
      findUnique: async () => ({ id: "content-1", title: "Welcome" }),
    },
    moduleContentItem: {
      aggregate: async () => ({ _max: { position: 2 } }),
      findFirst: async () => ({ moduleId: "module-existing" }),
      create: async () => {
        created = true;
      },
    },
    $queryRaw: async () => {
      locked = true;
      return [];
    },
  };
  const audit = {
    capture: async (_definition: unknown, mutation: (tx: unknown) => unknown) =>
      mutation(transaction),
  };
  const service = new ContentService({} as never, {} as never, audit as never);

  await assert.rejects(
    service.attachModuleContentItem(
      { id: "admin-1", role: UserRole.admin } as never,
      "module-target",
      { contentItemId: "content-1" },
    ),
    /already used in a programme connected to this module/,
  );
  assert.equal(locked, true);
  assert.equal(created, false);
});

test("published PDF entrepreneur tools can be attached to learning content", async () => {
  const service = new ContentService(
    {
      tool: {
        findUnique: async () => ({
          id: "tool-1",
          type: "pdf",
          status: "published",
          embeddedUrl: null,
          fileAssetId: "file-1",
        }),
      },
    } as never,
    {} as never,
    {} as never,
  );
  const validateTool = (
    service as unknown as {
      ensureToolSource(input: { toolId: string }): Promise<void>;
    }
  ).ensureToolSource.bind(service);

  await validateTool({ toolId: "tool-1" });
});

test("unpublished entrepreneur tools cannot be attached to learning content", async () => {
  const service = new ContentService(
    {
      tool: {
        findUnique: async () => ({
          id: "tool-1",
          type: "pdf",
          status: "draft",
          embeddedUrl: null,
          fileAssetId: "file-1",
        }),
      },
    } as never,
    {} as never,
    {} as never,
  );
  const validateTool = (
    service as unknown as {
      ensureToolSource(input: { toolId: string }): Promise<void>;
    }
  ).ensureToolSource.bind(service);

  await assert.rejects(
    validateTool({ toolId: "tool-1" }),
    /Only published entrepreneur tools/,
  );
});

test("content without an assigned trainer cannot be rated", async () => {
  let ratingSaved = false;
  const service = new ContentService(
    {
      programmeModule: {
        findFirst: async () => ({ id: "programme-module-1" }),
      },
      contentItem: {
        findUnique: async () => ({ id: "content-1", trainerId: null }),
      },
      contentRating: {
        upsert: async () => {
          ratingSaved = true;
          return {};
        },
      },
    } as never,
    {} as never,
    {} as never,
  );

  await assert.rejects(
    service.upsertRating(entrepreneur as never, {
      programmeId: "programme-1",
      moduleId: "module-1",
      contentItemId: "content-1",
      rating: 5,
    }),
    /does not have a trainer to rate/,
  );
  assert.equal(ratingSaved, false);
});

test("reused content keeps an independent rating in each learning context", async () => {
  const ratings = new Map<string, any>();
  const service = new ContentService(
    {
      programmeModule: {
        findFirst: async () => ({ id: "programme-module" }),
      },
      contentItem: {
        findUnique: async () => ({ id: "content-1", trainerId: "trainer-1" }),
      },
      contentRating: {
        upsert: async (query: any) => {
          const context =
            query.where
              .programmeId_moduleId_contentItemId_entrepreneurUserId;
          const key = [
            context.programmeId,
            context.moduleId,
            context.contentItemId,
            context.entrepreneurUserId,
          ].join(":");
          const now = new Date("2026-07-22T12:00:00.000Z");
          const rating = {
            id: "rating-" + ratings.size,
            ...query.create,
            comment: query.create.comment ?? null,
            createdAt: now,
            updatedAt: now,
          };
          ratings.set(key, rating);
          return rating;
        },
      },
    } as never,
    {} as never,
    {} as never,
  );

  const first = await service.upsertRating(entrepreneur as never, {
    programmeId: "programme-1",
    moduleId: "module-1",
    contentItemId: "content-1",
    rating: 4,
  });
  const reused = await service.upsertRating(entrepreneur as never, {
    programmeId: "programme-2",
    moduleId: "module-2",
    contentItemId: "content-1",
    rating: 5,
  });

  assert.equal(ratings.size, 2);
  assert.equal(first.programmeId, "programme-1");
  assert.equal(reused.programmeId, "programme-2");
  assert.notEqual(first.id, reused.id);
});

test("deleting a deliverable rule removes generated work and queues file cleanup", async () => {
  const deleted: string[] = [];
  let queuedStorageKey: string | undefined;
  const transaction = {
    programmeDeliverableRule: {
      findFirst: async () => ({ id: "rule-1", name: "First Deliverable" }),
      delete: async () => deleted.push("rule"),
    },
    deliverableInstance: {
      findMany: async () => [{ id: "instance-1" }],
      deleteMany: async () => deleted.push("instances"),
    },
    deliverableSubmission: {
      findMany: async () => [
        {
          id: "submission-1",
          fileAsset: { id: "file-1", storageKey: "deliverables/file.pdf" },
        },
      ],
      deleteMany: async () => deleted.push("submissions"),
    },
    deliverableReview: {
      deleteMany: async () => deleted.push("reviews"),
    },
    notification: {
      findMany: async () => [],
    },
    fileAsset: {
      deleteMany: async () => deleted.push("files"),
    },
    externalResourceDeletion: {
      createMany: async (query: any) => {
        queuedStorageKey = query.data[0]?.externalId;
      },
    },
  };
  const auditEvents: any[] = [];
  const service = new ResourceDeletionService(
    {
      $transaction: async (operation: (tx: unknown) => unknown) =>
        operation(transaction),
    } as never,
    {
      enqueue: async (event: unknown) => auditEvents.push(event),
    } as never,
  );

  const result = await service.deleteProgrammeDeliverableRule(
    { id: "admin-1", role: UserRole.admin } as never,
    "programme-1",
    "rule-1",
    { confirmation: "First Deliverable" },
  );

  assert.deepEqual(deleted, [
    "reviews",
    "submissions",
    "instances",
    "files",
    "rule",
  ]);
  assert.equal(queuedStorageKey, "deliverables/file.pdf");
  assert.equal(result.externalCleanupQueued, 1);
  assert.equal(auditEvents.length, 1);
});

test("deleting a module's final programme use removes exclusive content and queues media cleanup", async () => {
  const queuedResources: Array<{ provider: string; externalId: string }> = [];
  let deletedContentIds: string[] = [];
  let learningModuleDeleted = false;
  const transaction = {
    programmeModule: {
      findUnique: async () => ({
        id: "programme-module-1",
        programme: { id: "programme-1", name: "Growth" },
        module: { id: "module-1", title: "Foundations" },
      }),
      delete: async () => undefined,
      count: async () => 0,
      updateMany: async () => undefined,
      findMany: async () => [],
    },
    programmeDeliverableRule: {
      findMany: async () => [],
      count: async () => 0,
      deleteMany: async () => undefined,
    },
    contentItem: {
      findMany: async () => [
        {
          id: "content-exclusive",
          videoAsset: {
            id: "video-1",
            muxAssetId: "mux-asset-1",
            muxUploadId: "mux-upload-1",
          },
          fileAssets: [
            { id: "file-1", storageKey: "content/foundations.pdf" },
          ],
          _count: { modules: 1 },
        },
        {
          id: "content-shared",
          videoAsset: null,
          fileAssets: [],
          _count: { modules: 2 },
        },
      ],
      deleteMany: async (query: any) => {
        deletedContentIds = query.where.id.in;
      },
    },
    contentRating: { deleteMany: async () => undefined },
    learnerContentProgress: { deleteMany: async () => undefined },
    learnerModuleProgress: { deleteMany: async () => undefined },
    learnerProgrammeProgress: { deleteMany: async () => undefined },
    moduleContentItem: { deleteMany: async () => undefined },
    learningModule: {
      delete: async () => {
        learningModuleDeleted = true;
      },
    },
    videoWebhookEvent: { deleteMany: async () => undefined },
    videoAsset: { deleteMany: async () => undefined },
    contentToolLink: { deleteMany: async () => undefined },
    fileAsset: { deleteMany: async () => undefined },
    notification: { findMany: async () => [] },
    externalResourceDeletion: {
      createMany: async (query: any) => {
        queuedResources.push(...query.data);
      },
    },
  };
  const service = new ResourceDeletionService(
    {
      $transaction: async (operation: (tx: unknown) => unknown) =>
        operation(transaction),
    } as never,
    { enqueue: async () => undefined } as never,
  );

  const result = await service.deleteProgrammeModule(
    { id: "admin-1", role: UserRole.admin } as never,
    "programme-1",
    "module-1",
    { confirmation: "Foundations" },
  );

  assert.equal(learningModuleDeleted, true);
  assert.deepEqual(deletedContentIds, ["content-exclusive"]);
  assert.deepEqual(
    queuedResources.map((resource) => [resource.provider, resource.externalId]),
    [
      ["mux_asset", "mux-asset-1"],
      ["object_storage", "content/foundations.pdf"],
    ],
  );
  assert.equal(result.externalCleanupQueued, 2);
  assert.equal(result.reusableAssetsPreserved, true);
});

test("deleting a programme removes orphaned curriculum media and preserves shared content", async () => {
  const queuedResources: Array<{ provider: string; externalId: string }> = [];
  let deletedContentIds: string[] = [];
  let deletedModuleIds: string[] = [];
  let programmeDeleted = false;
  const transaction = {
    programme: {
      findUnique: async () => ({ id: "programme-1", name: "Growth" }),
      delete: async () => {
        programmeDeleted = true;
      },
    },
    programmeGoal: {
      findMany: async () => [],
      deleteMany: async () => undefined,
    },
    programmeDeliverableRule: {
      findMany: async () => [],
      deleteMany: async () => undefined,
    },
    session: { findMany: async () => [] },
    reportExport: { findMany: async () => [] },
    programmeModule: {
      findMany: async () => [
        { moduleId: "module-orphan" },
        { moduleId: "module-shared" },
      ],
      deleteMany: async () => undefined,
    },
    learningModule: {
      findMany: async () => [{ id: "module-orphan" }],
      deleteMany: async (query: any) => {
        deletedModuleIds = query.where.id.in;
      },
    },
    contentItem: {
      findMany: async () => [
        {
          id: "content-orphan",
          modules: [{ moduleId: "module-orphan" }],
          videoAsset: {
            id: "video-1",
            muxAssetId: "mux-asset-1",
            muxUploadId: "mux-upload-1",
          },
          fileAssets: [
            { id: "file-1", storageKey: "content/growth.pdf" },
          ],
        },
        {
          id: "content-shared",
          modules: [
            { moduleId: "module-orphan" },
            { moduleId: "module-surviving" },
          ],
          videoAsset: null,
          fileAssets: [],
        },
      ],
      deleteMany: async (query: any) => {
        deletedContentIds = query.where.id.in;
      },
    },
    deliverableInstance: { findMany: async () => [] },
    externalResourceDeletion: {
      createMany: async (query: any) => {
        queuedResources.push(...query.data);
      },
    },
    notification: { findMany: async () => [] },
    fundraisingRound: { deleteMany: async () => undefined },
    periodicUpdate: { deleteMany: async () => undefined },
    programmeAccessGrant: { deleteMany: async () => undefined },
    learnerContentProgress: { deleteMany: async () => undefined },
    learnerModuleProgress: { deleteMany: async () => undefined },
    learnerProgrammeProgress: { deleteMany: async () => undefined },
    contentRating: { deleteMany: async () => undefined },
    toolProgrammeAccess: { deleteMany: async () => undefined },
    videoWebhookEvent: { deleteMany: async () => undefined },
    videoAsset: { deleteMany: async () => undefined },
    contentToolLink: { deleteMany: async () => undefined },
    fileAsset: { deleteMany: async () => undefined },
    moduleContentItem: { deleteMany: async () => undefined },
  };
  const auditEvents: any[] = [];
  const service = new ResourceDeletionService(
    {
      $transaction: async (operation: (tx: unknown) => unknown) =>
        operation(transaction),
    } as never,
    {
      enqueue: async (event: unknown) => auditEvents.push(event),
    } as never,
  );

  const result = await service.deleteProgramme(
    { id: "admin-1", role: UserRole.admin } as never,
    "programme-1",
    { confirmation: "Growth" },
  );

  assert.equal(programmeDeleted, true);
  assert.deepEqual(deletedModuleIds, ["module-orphan"]);
  assert.deepEqual(deletedContentIds, ["content-orphan"]);
  assert.deepEqual(
    queuedResources.map((resource) => [resource.provider, resource.externalId]),
    [
      ["mux_asset", "mux-asset-1"],
      ["object_storage", "content/growth.pdf"],
    ],
  );
  assert.equal(result.externalCleanupQueued, 2);
  assert.equal(result.reusableAssetsPreserved, true);
  assert.equal(auditEvents.length, 1);
});

test("programme access authorizes a linked PDF entrepreneur tool", async () => {
  let programmeQuery: unknown;
  const service = new FilesService(
    {
      programme: {
        findFirst: async (query: unknown) => {
          programmeQuery = query;
          return { id: "programme-1" };
        },
      },
    } as never,
    {} as never,
    {} as never,
    {} as never,
  );
  const canReadFile = (
    service as unknown as {
      canReadFile(user: unknown, file: unknown): Promise<boolean>;
    }
  ).canReadFile.bind(service);

  const allowed = await canReadFile(entrepreneur, {
    contentItem: null,
    deliverableSubmissions: [],
    toolFileAsset: {
      id: "tool-1",
      visibility: "programmes",
      hiddenEntrepreneurs: [],
      entrepreneurAccess: [],
      programmeAccess: [],
    },
  });

  assert.equal(allowed, true);
  assert.ok(programmeQuery);
});

test("published Excel entrepreneur tools can be attached to learning content", async () => {
  const service = new ContentService(
    {
      tool: {
        findUnique: async () => ({
          id: "tool-excel",
          type: "excel",
          status: "published",
          embeddedUrl: null,
          fileAssetId: "file-excel",
        }),
      },
    } as never,
    {} as never,
    {} as never,
  );
  const validateTool = (
    service as unknown as {
      ensureToolSource(input: { toolId: string }): Promise<void>;
    }
  ).ensureToolSource.bind(service);
  await validateTool({ toolId: "tool-excel" });
});

test("workbook preview returns a bounded worksheet window", async () => {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Forecast");
  sheet.addRow(["Month", "Revenue", "Notes"]);
  sheet.addRow(["January", 12500, "Confirmed"]);
  sheet.addRow(["February", 18000, "Pipeline"]);
  const bytes = await workbook.xlsx.writeBuffer();
  const now = new Date("2026-07-20T00:00:00.000Z");
  const file = {
    id: "file-excel",
    originalFilename: "forecast.xlsx",
    mimeType:
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    sizeBytes: BigInt(bytes.byteLength),
    status: "ready",
    usage: "content_excel",
    verifiedAt: now,
    failureReason: null,
    createdAt: now,
    updatedAt: now,
    storageKey: "uploads/test/forecast.xlsx",
    uploadedById: "admin-1",
    contentItemId: "content-excel",
    contentItem: null,
    toolFileAsset: null,
    deliverableSubmissions: [],
  };
  let storageReads = 0;
  const service = new FilesService(
    { fileAsset: { findUnique: async () => file } } as never,
    {
      readObject: async () => {
        storageReads += 1;
        return new Uint8Array(bytes as ArrayBuffer);
      },
    } as never,
    {} as never,
    {} as never,
  );
  const result = await service.getWorkbookPreview(
    { id: "admin-1", role: UserRole.admin } as never,
    file.id,
    {
      sheet: "Forecast",
      rowStart: 2,
      columnStart: 2,
      rowTake: 10,
      columnTake: 5,
    },
  );
  assert.equal(result.workbook.activeSheet, "Forecast");
  assert.deepEqual(
    result.columns.map((column) => column.label),
    ["B", "C"],
  );
  assert.deepEqual(
    result.rows.map((row) => row.cells),
    [
      ["12500", "Confirmed"],
      ["18000", "Pipeline"],
    ],
  );
  assert.equal(result.window.nextRowStart, null);
  await service.getWorkbookPreview(
    { id: "admin-1", role: UserRole.admin } as never,
    file.id,
    {
      sheet: "Forecast",
      rowStart: 1,
      columnStart: 1,
      rowTake: 10,
      columnTake: 5,
    },
  );
  assert.equal(storageReads, 1);
});


test("creating tool content rejects a tool already used in the module", async () => {
  let created = false;
  let locked = false;
  const transaction = {
    $queryRaw: async () => {
      locked = true;
      return [];
    },
    moduleContentItem: {
      findFirst: async () => ({ id: "placement-1" }),
      aggregate: async () => ({ _max: { position: 1 } }),
      create: async () => undefined,
    },
    contentItem: {
      create: async () => {
        created = true;
        return { id: "content-new", title: "Planner" };
      },
    },
  };
  const service = new ContentService(
    {
      learningModule: { findUnique: async () => ({ id: "module-1" }) },
      tool: {
        findUnique: async () => ({
          id: "tool-1",
          type: "embedded_tool",
          status: "published",
          embeddedUrl: "https://example.com/tool",
          fileAssetId: null,
        }),
      },
    } as never,
    {} as never,
    {
      capture: async (
        _definition: unknown,
        mutation: (tx: unknown) => Promise<unknown>,
      ) => mutation(transaction),
    } as never,
  );

  await assert.rejects(
    service.createModuleContentItem(
      { id: "admin-1", role: UserRole.admin } as never,
      "module-1",
      { title: "Planner", type: "tool", toolId: "tool-1" } as never,
    ),
    /already used in this module/,
  );
  assert.equal(locked, true);
  assert.equal(created, false);
});

test("reusing content rejects another item linked to the same module tool", async () => {
  let lookup = 0;
  let created = false;
  const transaction = {
    learningModule: {
      findUnique: async () => ({ id: "module-1", programmes: [] }),
    },
    contentItem: {
      findUnique: async () => ({
        id: "content-2",
        title: "Planner copy",
        toolLink: { toolId: "tool-1" },
      }),
    },
    moduleContentItem: {
      findFirst: async () => {
        lookup += 1;
        return lookup === 1 ? null : { id: "placement-1" };
      },
      aggregate: async () => ({ _max: { position: 1 } }),
      create: async () => {
        created = true;
      },
    },
    $queryRaw: async () => [],
  };
  const service = new ContentService(
    {} as never,
    {} as never,
    {
      capture: async (
        _definition: unknown,
        mutation: (tx: unknown) => Promise<unknown>,
      ) => mutation(transaction),
    } as never,
  );

  await assert.rejects(
    service.attachModuleContentItem(
      { id: "admin-1", role: UserRole.admin } as never,
      "module-1",
      { contentItemId: "content-2" },
    ),
    /already used in this module/,
  );
  assert.equal(created, false);
});

test("reusable content lookup excludes other items linked to a module tool", () => {
  const service = new ContentService({} as never, {} as never, {} as never);
  const where = (
    service as unknown as {
      contentWhere(query: { excludeModuleId: string }): Record<string, unknown>;
    }
  ).contentWhere({ excludeModuleId: "module-1" });

  assert.deepEqual(where, {
    AND: [
      { modules: { none: { moduleId: "module-1" } } },
      {
        NOT: {
          toolLink: {
            is: {
              toolId: { not: null },
              tool: {
                contentLinks: {
                  some: {
                    contentItem: {
                      modules: { some: { moduleId: "module-1" } },
                    },
                  },
                },
              },
            },
          },
        },
      },
    ],
  });
});

test("content library summary is shared across content type tabs", async () => {
  let summaryWhere: unknown;
  const service = new ContentService(
    {
      contentItem: {
        groupBy: async (input: { where: unknown }) => {
          summaryWhere = input.where;
          return [
            { type: "video", _count: { id: 1 } },
            { type: "pdf", _count: { id: 2 } },
            { type: "tool", _count: { id: 3 } },
          ];
        },
      },
    } as never,
    {} as never,
    {} as never,
  );

  const summary = await service.getContentItemsSummary(
    { id: "admin-1", role: UserRole.admin } as never,
    { type: "video" },
  );

  assert.deepEqual(summaryWhere, {});
  assert.deepEqual(summary, {
    total: 6,
    video: 1,
    pdf: 2,
    excel: 0,
    tool: 3,
  });
});

test("content usage excludes orphaned module placements", async () => {
  const service = new ContentService(
    {
      moduleContentItem: {
        findMany: async () => [
          {
            contentItemId: "content-1",
            moduleId: "module-orphan",
            position: 1,
          },
          {
            contentItemId: "content-1",
            moduleId: "module-active",
            position: 2,
          },
        ],
      },
      programmeModule: {
        findMany: async () => [
          { moduleId: "module-active", programmeId: "programme-1" },
        ],
      },
    } as never,
    {} as never,
    {} as never,
  );

  const usage = await (
    service as unknown as {
      contentUsage(
        ids: string[],
        moduleId?: string,
      ): Promise<Map<string, { modules: number; programmes: number }>>;
    }
  ).contentUsage(["content-1"]);

  assert.deepEqual(usage.get("content-1"), {
    modules: 1,
    programmes: 1,
    position: null,
  });
});

test("background reconciliation removes orphaned curriculum modules", async () => {
  let moduleDeleted = false;
  const transaction = {
    learningModule: {
      findFirst: async () => ({ id: "module-orphan" }),
      delete: async () => {
        moduleDeleted = true;
      },
    },
    contentItem: { findMany: async () => [] },
    learnerContentProgress: { deleteMany: async () => undefined },
    learnerModuleProgress: { deleteMany: async () => undefined },
    contentRating: { deleteMany: async () => undefined },
    moduleContentItem: { deleteMany: async () => undefined },
  };
  const auditEvents: unknown[] = [];
  const service = new ResourceDeletionService(
    {
      learningModule: {
        findMany: async () => [{ id: "module-orphan" }],
      },
      $transaction: async (operation: (tx: unknown) => Promise<unknown>) =>
        operation(transaction),
    } as never,
    { enqueue: async (event: unknown) => auditEvents.push(event) } as never,
  );

  const result = await service.cleanupOrphanedCurriculum();

  assert.equal(moduleDeleted, true);
  assert.deepEqual(result, {
    removedModules: 1,
    removedContentItems: 0,
    externalCleanupQueued: 0,
    hasMore: false,
  });
  assert.equal(auditEvents.length, 1);
});

test("reusable content lookup excludes items already used in a connected programme", () => {
  const service = new ContentService({} as never, {} as never, {} as never);
  const where = (
    service as unknown as {
      contentWhere(query: {
        reusableForModuleId: string;
      }): Record<string, unknown>;
    }
  ).contentWhere({ reusableForModuleId: "module-target" });

  assert.deepEqual(where, {
    modules: {
      none: {
        module: {
          programmes: {
            some: {
              programme: {
                modules: { some: { moduleId: "module-target" } },
              },
            },
          },
        },
      },
    },
  });
});


test("published tool lookup excludes tools already used in the module", () => {
  const service = new ToolsService(
    {} as never,
    {} as never,
    {} as never,
    {} as never,
  );
  const where = (
    service as unknown as {
      buildToolWhere(
        user: { id: string; role: UserRole },
        query: { excludeModuleId: string },
      ): Record<string, unknown>;
    }
  ).buildToolWhere(
    { id: "admin-1", role: UserRole.admin },
    { excludeModuleId: "module-1" },
  );

  assert.deepEqual(where, {
    AND: [
      {
        contentLinks: {
          none: {
            contentItem: {
              modules: { some: { moduleId: "module-1" } },
            },
          },
        },
      },
    ],
  });
});
