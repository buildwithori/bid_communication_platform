import assert from 'node:assert/strict';
import test from 'node:test';
import {
  ContentItemStatus,
  ProgrammeAccessType,
  UserRole,
} from '@prisma/client';
import { ProgrammesService } from '../src/programmes/programmes.service';

const entrepreneur = {
  id: 'entrepreneur-1',
  role: UserRole.entrepreneur,
};

test('programme player returns the complete ordered ready curriculum with learner progress', async () => {
  let curriculumQuery: any;
  const prisma = {
    programme: {
      findUnique: async () => ({
        id: 'programme-1',
        name: 'Growth readiness',
        description: 'A practical programme',
        accessType: ProgrammeAccessType.assigned,
        publishedAt: new Date('2026-01-01'),
        archivedAt: null,
        startDate: new Date('2026-01-01'),
        endDate: new Date('2027-01-01'),
      }),
      count: async () => 1,
    },
    programmeModule: {
      findMany: async (query: unknown) => {
        curriculumQuery = query;
        return [
          {
            id: 'link-1',
            moduleId: 'module-1',
            position: 1,
            module: {
              id: 'module-1',
              title: 'Foundations',
              description: 'Start here',
              contentItems: [
                {
                  contentItemId: 'content-1',
                  position: 1,
                  contentItem: {
                    id: 'content-1',
                    title: 'Welcome',
                    type: 'video',
                    status: ContentItemStatus.ready,
                    durationSeconds: 600,
                    trainer: null,
                    videoAsset: {
                      id: 'video-1',
                      duration: 600,
                      status: 'ready',
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
      findUnique: async () => ({ status: 'in_progress', progressPercent: 25 }),
    },
    learnerModuleProgress: {
      findMany: async () => [
        {
          moduleId: 'module-1',
          status: 'in_progress',
          progressPercent: 25,
          completedContentCount: 0,
          totalContentCount: 1,
        },
      ],
    },
    learnerContentProgress: {
      findMany: async () => [
        {
          moduleId: 'module-1',
          contentItemId: 'content-1',
          status: 'in_progress',
          progressPercent: 25,
          lastPositionSeconds: 150,
          completedAt: null,
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
    'programme-1',
  );

  assert.deepEqual(curriculumQuery.orderBy, [
    { position: 'asc' },
    { id: 'asc' },
  ]);
  assert.deepEqual(curriculumQuery.include.module.include.contentItems.where, {
    contentItem: { status: ContentItemStatus.ready },
  });
  assert.equal(result.modules.length, 1);
  assert.equal(result.modules[0]?.items.length, 1);
  assert.equal(result.modules[0]?.items[0]?.progress?.lastPositionSeconds, 150);
  assert.deepEqual(result.resume, {
    moduleId: 'module-1',
    contentItemId: 'content-1',
  });
  assert.deepEqual(result.summary, {
    modules: 1,
    contentItems: 1,
    videos: 1,
    pdfs: 0,
    tools: 0,
  });
});

test('staff preview includes non-ready content and never returns learner progress', async () => {
  let contentWhere: unknown = 'not-called';
  const prisma = {
    programme: {
      findUnique: async () => ({
        id: 'programme-1',
        name: 'Draft curriculum',
        description: '',
        accessType: ProgrammeAccessType.assigned,
        publishedAt: null,
        archivedAt: null,
        startDate: new Date('2026-01-01'),
        endDate: new Date('2027-01-01'),
      }),
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
    { id: 'admin-1', role: UserRole.admin } as never,
    'programme-1',
  );

  assert.equal(contentWhere, undefined);
  assert.equal(result.viewer.canTrackProgress, false);
  assert.equal(result.progress, null);
  assert.deepEqual(result.modules, []);
});
