import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, Programme, ProgrammeAccessType, User, UserRole } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { ProgrammeQueryDto, ProgrammeLifecycle } from './dto/programme-query.dto';

const DEFAULT_TAKE = 20;

@Injectable()
export class ProgrammesService {
  constructor(private readonly prisma: PrismaService) {}

  async listProgrammes(user: User, query: ProgrammeQueryDto) {
    const take = query.take ?? DEFAULT_TAKE;
    const where = this.buildProgrammeWhere(user, query);

    const rows = await this.prisma.programme.findMany({
      where,
      orderBy: [{ startDate: 'desc' }, { id: 'desc' }],
      take: take + 1,
      ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
      include: {
        _count: {
          select: {
            modules: true,
            accessGrants: { where: { revokedAt: null } },
          },
        },
        progress: {
          select: { progressPercent: true },
        },
        modules: {
          include: {
            module: {
              include: {
                contentItems: {
                  include: {
                    contentItem: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    const nextCursor = rows.length > take ? rows[take]?.id ?? null : null;
    const items = rows.slice(0, take).map((programme) => this.mapProgrammeListItem(programme));

    return { items, nextCursor };
  }

  async getProgramme(user: User, id: string) {
    const programme = await this.prisma.programme.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            accessGrants: { where: { revokedAt: null } },
          },
        },
        progress: {
          select: { progressPercent: true },
        },
        modules: {
          orderBy: { position: 'asc' },
          include: {
            module: {
              include: {
                contentItems: {
                  orderBy: { position: 'asc' },
                  include: {
                    contentItem: {
                      include: {
                        trainer: {
                          select: {
                            id: true,
                            firstName: true,
                            lastName: true,
                            email: true,
                          },
                        },
                        videoAsset: true,
                        fileAssets: true,
                        toolLink: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!programme) {
      throw new NotFoundException('Programme was not found.');
    }

    if (!(await this.canReadProgramme(user, id))) {
      throw new ForbiddenException('You do not have access to this programme.');
    }

    return this.mapProgrammeDetail(programme);
  }

  private buildProgrammeWhere(user: User, query: ProgrammeQueryDto): Prisma.ProgrammeWhereInput {
    const filters: Prisma.ProgrammeWhereInput[] = [];

    if (query.search?.trim()) {
      const search = query.search.trim();
      filters.push({
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
        ],
      });
    }

    if (query.accessType) {
      filters.push({ accessType: query.accessType });
    }

    const lifecycleWhere = this.lifecycleWhere(query.lifecycle);
    if (lifecycleWhere) {
      filters.push(lifecycleWhere);
    } else if (!query.includeArchived) {
      filters.push({ archivedAt: null });
    }

    const scopeWhere = this.programmeScopeWhere(user);
    if (scopeWhere) {
      filters.push(scopeWhere);
    }

    return filters.length ? { AND: filters } : {};
  }

  private lifecycleWhere(lifecycle?: ProgrammeLifecycle): Prisma.ProgrammeWhereInput | null {
    if (!lifecycle) return null;

    const now = new Date();
    if (lifecycle === 'archived') return { archivedAt: { not: null } };
    if (lifecycle === 'draft') return { archivedAt: null, publishedAt: null };
    if (lifecycle === 'scheduled') {
      return { archivedAt: null, publishedAt: { not: null }, startDate: { gt: now } };
    }
    if (lifecycle === 'completed') {
      return { archivedAt: null, publishedAt: { not: null }, endDate: { lt: now } };
    }
    return {
      archivedAt: null,
      publishedAt: { not: null },
      startDate: { lte: now },
      endDate: { gte: now },
    };
  }

  private programmeScopeWhere(user: User): Prisma.ProgrammeWhereInput | null {
    if (user.role === UserRole.admin) return null;

    if (user.role === UserRole.entrepreneur) {
      return {
        OR: [
          { accessType: ProgrammeAccessType.free },
          { accessGrants: { some: { entrepreneurUserId: user.id, revokedAt: null } } },
        ],
      };
    }

    return {
      modules: {
        some: {
          module: {
            contentItems: {
              some: {
                contentItem: {
                  trainerId: user.id,
                },
              },
            },
          },
        },
      },
    };
  }

  private async canReadProgramme(user: User, programmeId: string) {
    if (user.role === UserRole.admin) return true;

    const count = await this.prisma.programme.count({
      where: {
        id: programmeId,
        ...this.programmeScopeWhere(user),
      },
    });

    return count > 0;
  }

  private mapProgrammeListItem(
    programme: Programme & {
      _count: { modules: number; accessGrants: number };
      progress: Array<{ progressPercent: number }>;
      modules: Array<{
        module: {
          contentItems: Array<{ contentItem: { type: string; status: string } }>;
        };
      }>;
    },
  ) {
    const contentItems = programme.modules.flatMap((programmeModule) => programmeModule.module.contentItems);
    const contentCounts = this.contentCounts(contentItems.map((item) => item.contentItem));
    const moduleCount = programme._count.modules;
    const readyModuleCount = this.readyModuleCount(programme.modules);

    return {
      id: programme.id,
      name: programme.name,
      description: programme.description,
      accessType: programme.accessType,
      lifecycle: this.lifecycle(programme),
      startDate: programme.startDate.toISOString(),
      endDate: programme.endDate.toISOString(),
      maxEntrepreneurs: programme.maxEntrepreneurs,
      publishedAt: programme.publishedAt?.toISOString() ?? null,
      archivedAt: programme.archivedAt?.toISOString() ?? null,
      enrollment: {
        active: programme._count.accessGrants,
        capacity: programme.maxEntrepreneurs,
      },
      modules: {
        total: moduleCount,
        ready: readyModuleCount,
      },
      content: contentCounts,
      readiness: moduleCount === 0 ? 0 : Math.round((readyModuleCount / moduleCount) * 100),
      learnerProgress: this.learnerProgress(programme.progress),
    };
  }

  private mapProgrammeDetail(
    programme: Programme & {
      _count: { accessGrants: number };
      progress: Array<{ progressPercent: number }>;
      modules: Array<{
        position: number;
        module: {
          id: string;
          title: string;
          description: string;
          isReusable: boolean;
          contentItems: Array<{
            position: number;
            contentItem: {
              id: string;
              title: string;
              type: string;
              durationSeconds: number | null;
              status: string;
              trainer: { id: string; firstName: string | null; lastName: string | null; email: string } | null;
              videoAsset: { playbackId: string | null; muxAssetId: string | null; status: string } | null;
              fileAssets: Array<{ id: string; originalFilename: string; mimeType: string; sizeBytes: bigint; status: string }>;
              toolLink: { source: string; toolId: string | null; externalUrl: string | null } | null;
            };
          }>;
        };
      }>;
    },
  ) {
    const modules = programme.modules.map((programmeModule) => {
      const items = programmeModule.module.contentItems.map(({ position, contentItem }) => ({
        id: contentItem.id,
        title: contentItem.title,
        type: contentItem.type,
        position,
        status: contentItem.status,
        durationSeconds: contentItem.durationSeconds,
        trainer: contentItem.trainer
          ? {
              id: contentItem.trainer.id,
              name: [contentItem.trainer.firstName, contentItem.trainer.lastName].filter(Boolean).join(' ') || contentItem.trainer.email,
              email: contentItem.trainer.email,
            }
          : null,
        video: contentItem.videoAsset
          ? {
              muxAssetId: contentItem.videoAsset.muxAssetId,
              playbackId: contentItem.videoAsset.playbackId,
              status: contentItem.videoAsset.status,
            }
          : null,
        files: contentItem.fileAssets.map((file) => ({
          id: file.id,
          originalFilename: file.originalFilename,
          mimeType: file.mimeType,
          sizeBytes: file.sizeBytes.toString(),
          status: file.status,
        })),
        tool: contentItem.toolLink
          ? {
              source: contentItem.toolLink.source,
              toolId: contentItem.toolLink.toolId,
              externalUrl: contentItem.toolLink.externalUrl,
            }
          : null,
      }));

      return {
        id: programmeModule.module.id,
        title: programmeModule.module.title,
        description: programmeModule.module.description,
        position: programmeModule.position,
        isReusable: programmeModule.module.isReusable,
        contentItems: items,
        readiness: items.length > 0 && items.every((item) => item.status === 'ready') ? 'ready' : 'needs_content',
      };
    });

    const contentCounts = this.contentCounts(modules.flatMap((module) => module.contentItems));
    const readyModuleCount = modules.filter((module) => module.readiness === 'ready').length;

    return {
      id: programme.id,
      name: programme.name,
      description: programme.description,
      accessType: programme.accessType,
      lifecycle: this.lifecycle(programme),
      startDate: programme.startDate.toISOString(),
      endDate: programme.endDate.toISOString(),
      maxEntrepreneurs: programme.maxEntrepreneurs,
      publishedAt: programme.publishedAt?.toISOString() ?? null,
      archivedAt: programme.archivedAt?.toISOString() ?? null,
      archiveReason: programme.archiveReason,
      enrollment: {
        active: programme._count.accessGrants,
        capacity: programme.maxEntrepreneurs,
      },
      readiness: modules.length === 0 ? 0 : Math.round((readyModuleCount / modules.length) * 100),
      learnerProgress: this.learnerProgress(programme.progress),
      content: contentCounts,
      modules,
    };
  }

  private learnerProgress(progressRows: Array<{ progressPercent: number }>) {
    if (progressRows.length === 0) {
      return { average: 0, trackedLearners: 0 };
    }

    const average = Math.round(
      progressRows.reduce((sum, row) => sum + row.progressPercent, 0) / progressRows.length,
    );

    return { average, trackedLearners: progressRows.length };
  }

  private lifecycle(programme: Pick<Programme, 'publishedAt' | 'archivedAt' | 'startDate' | 'endDate'>) {
    if (programme.archivedAt) return 'archived';
    if (!programme.publishedAt) return 'draft';
    const now = new Date();
    if (programme.startDate > now) return 'scheduled';
    if (programme.endDate < now) return 'completed';
    return 'active';
  }

  private contentCounts(items: Array<{ type: string }>) {
    return items.reduce(
      (counts, item) => {
        if (item.type === 'video') counts.videos += 1;
        if (item.type === 'pdf') counts.pdfs += 1;
        if (item.type === 'tool') counts.tools += 1;
        counts.total += 1;
        return counts;
      },
      { total: 0, videos: 0, pdfs: 0, tools: 0 },
    );
  }

  private readyModuleCount(
    modules: Array<{
      module: {
        contentItems: Array<{ contentItem: { status: string } }>;
      };
    }>,
  ) {
    return modules.filter(({ module }) => {
      const items = module.contentItems;
      return items.length > 0 && items.every((item) => item.contentItem.status === 'ready');
    }).length;
  }
}
