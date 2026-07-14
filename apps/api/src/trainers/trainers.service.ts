import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, ProgrammeAccessType, TrainerAccessLevel, TrainerCapabilityStatus, User, UserRole } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { TrainerQueryDto } from './dto/trainer-query.dto';

const DEFAULT_TAKE = 20;

const trainerInclude = Prisma.validator<Prisma.UserInclude>()({
  trainerCapability: true,
  trainerSpecialisms: {
    include: {
      sector: {
        select: { id: true, name: true, key: true },
      },
    },
  },
});

const portfolioContentInclude = Prisma.validator<Prisma.ContentItemInclude>()({
  modules: {
    include: {
      module: {
        include: {
          programmes: {
            include: {
              programme: {
                include: {
                  accessGrants: {
                    where: { revokedAt: null },
                    select: { entrepreneurUserId: true },
                  },
                  progress: {
                    select: { entrepreneurUserId: true, progressPercent: true },
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

type TrainerRow = Prisma.UserGetPayload<{ include: typeof trainerInclude }>;
type PortfolioContentItem = Prisma.ContentItemGetPayload<{ include: typeof portfolioContentInclude }>;
type TrainerRatingSummary = { average: number | null; count: number };

@Injectable()
export class TrainersService {
  constructor(private readonly prisma: PrismaService) {}

  async listTrainers(user: User, query: TrainerQueryDto) {
    const take = query.take ?? DEFAULT_TAKE;
    const rows = await this.prisma.user.findMany({
      where: this.buildTrainerWhere(user, query),
      orderBy: [{ firstName: 'asc' }, { lastName: 'asc' }, { id: 'asc' }],
      take: take + 1,
      ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
      include: trainerInclude,
    });

    const visibleRows = rows.slice(0, take);
    const nextCursor = rows.length > take ? rows[take - 1]?.id ?? null : null;
    const context = await this.trainerContext(visibleRows.map((row) => row.id));
    const items = visibleRows.map((row) => this.mapTrainer(row, context, user));

    return { items, nextCursor };
  }

  async getTrainer(user: User, trainerUserId: string) {
    const trainer = await this.prisma.user.findFirst({
      where: {
        ...this.buildTrainerWhere(user, {}),
        id: trainerUserId,
      },
      include: trainerInclude,
    });

    if (!trainer) {
      throw new NotFoundException('Trainer was not found.');
    }

    const context = await this.trainerContext([trainer.id]);
    return this.mapTrainer(trainer, context, user);
  }

  private buildTrainerWhere(user: User, query: TrainerQueryDto): Prisma.UserWhereInput {
    const filters: Prisma.UserWhereInput[] = [{ role: UserRole.trainer }];

    if (query.search?.trim()) {
      const search = query.search.trim();
      filters.push({
        OR: [
          { firstName: { contains: search, mode: 'insensitive' } },
          { lastName: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
          { phone: { contains: search, mode: 'insensitive' } },
          { trainerSpecialisms: { some: { sector: { name: { contains: search, mode: 'insensitive' } } } } },
          {
            ownedContentItems: {
              some: {
                modules: {
                  some: {
                    module: {
                      programmes: {
                        some: {
                          programme: { name: { contains: search, mode: 'insensitive' } },
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
    }

    if (query.sectorId) {
      filters.push({ trainerSpecialisms: { some: { sectorId: query.sectorId } } });
    }

    if (query.accessLevel) {
      filters.push({ trainerCapability: { accessLevel: query.accessLevel } });
    }

    if (query.status) {
      filters.push({ trainerCapability: { status: query.status } });
    }

    const scopeWhere = this.scopeWhere(user);
    if (scopeWhere) filters.push(scopeWhere);

    return { AND: filters };
  }

  private scopeWhere(user: User): Prisma.UserWhereInput | null {
    if (user.role === UserRole.admin) return null;
    if (user.role === UserRole.trainer) return { id: user.id };

    return {
      ownedContentItems: {
        some: {
          modules: {
            some: {
              module: {
                programmes: {
                  some: {
                    programme: {
                      OR: [
                        { accessType: ProgrammeAccessType.free },
                        { accessGrants: { some: { entrepreneurUserId: user.id, revokedAt: null } } },
                      ],
                    },
                  },
                },
              },
            },
          },
        },
      },
    };
  }

  private async trainerContext(trainerIds: string[]) {
    if (!trainerIds.length) {
      return {
        contentByTrainer: new Map<string, PortfolioContentItem[]>(),
        ratingsByTrainer: new Map<string, TrainerRatingSummary>(),
      };
    }

    const [contentItems, ratingGroups] = await Promise.all([
      this.prisma.contentItem.findMany({
        where: { trainerId: { in: trainerIds } },
        include: portfolioContentInclude,
      }),
      this.prisma.contentRating.groupBy({
        by: ['trainerId'],
        where: { trainerId: { in: trainerIds } },
        _avg: { rating: true },
        _count: { rating: true },
      }),
    ]);

    const contentByTrainer = new Map<string, PortfolioContentItem[]>();
    for (const item of contentItems) {
      if (!item.trainerId) continue;
      const items = contentByTrainer.get(item.trainerId) ?? [];
      items.push(item);
      contentByTrainer.set(item.trainerId, items);
    }

    const ratingsByTrainer = new Map<string, TrainerRatingSummary>();
    for (const rating of ratingGroups) {
      if (!rating.trainerId) continue;
      ratingsByTrainer.set(rating.trainerId, {
        average: rating._avg.rating ? Math.round(rating._avg.rating * 10) / 10 : null,
        count: rating._count.rating,
      });
    }

    return { contentByTrainer, ratingsByTrainer };
  }

  private mapTrainer(
    trainer: TrainerRow,
    context: {
      contentByTrainer: Map<string, PortfolioContentItem[]>;
      ratingsByTrainer: Map<string, TrainerRatingSummary>;
    },
    viewer: User,
  ) {
    const contentItems = context.contentByTrainer.get(trainer.id) ?? [];
    const portfolio = this.portfolioSummary(contentItems, viewer);
    const ratings = context.ratingsByTrainer.get(trainer.id) ?? { average: null, count: 0 };

    return {
      trainerUserId: trainer.id,
      name: [trainer.firstName, trainer.lastName].filter(Boolean).join(' ') || trainer.email,
      email: trainer.email,
      phone: trainer.phone,
      userStatus: trainer.status,
      roleLabel: trainer.trainerCapability?.roleLabel ?? 'trainer',
      accessLevel: trainer.trainerCapability?.accessLevel ?? TrainerAccessLevel.full,
      capabilityStatus: trainer.trainerCapability?.status ?? TrainerCapabilityStatus.active,
      accessExpiresOn: trainer.trainerCapability?.accessExpiresOn?.toISOString() ?? null,
      specialisms: trainer.trainerSpecialisms.map(({ sector }) => sector),
      portfolio,
      ratings,
    };
  }

  private portfolioSummary(contentItems: PortfolioContentItem[], viewer: User) {
    const programmes = new Map<
      string,
      {
        id: string;
        name: string;
        accessType: string;
        startDate: string;
        endDate: string;
      }
    >();
    const entrepreneurIds = new Set<string>();
    const progressValues = new Map<string, number>();
    const visibleContentItemIds = new Set<string>();

    for (const contentItem of contentItems) {
      for (const attachedModule of contentItem.modules) {
        for (const programmeModule of attachedModule.module.programmes) {
          const programme = programmeModule.programme;
          if (!this.canViewerSeeProgrammeInSummary(viewer, programme)) {
            continue;
          }

          visibleContentItemIds.add(contentItem.id);
          programmes.set(programme.id, {
            id: programme.id,
            name: programme.name,
            accessType: programme.accessType,
            startDate: programme.startDate.toISOString(),
            endDate: programme.endDate.toISOString(),
          });

          const learnerRows =
            programme.accessType === ProgrammeAccessType.free
              ? programme.progress.map((progress) => ({ entrepreneurUserId: progress.entrepreneurUserId }))
              : programme.accessGrants;

          for (const learner of learnerRows) {
            entrepreneurIds.add(learner.entrepreneurUserId);
          }

          for (const progress of programme.progress) {
            progressValues.set(`${programme.id}:${progress.entrepreneurUserId}`, progress.progressPercent);
          }
        }
      }
    }

    const progress = Array.from(progressValues.values());
    const averageProgress = progress.length
      ? Math.round(progress.reduce((sum, value) => sum + value, 0) / progress.length)
      : 0;

    return {
      contentItems: visibleContentItemIds.size,
      programmes: Array.from(programmes.values()).sort((a, b) => a.name.localeCompare(b.name)),
      inferredEntrepreneurs: entrepreneurIds.size,
      averageLearnerProgress: averageProgress,
    };
  }

  private canViewerSeeProgrammeInSummary(
    viewer: User,
    programme: PortfolioContentItem['modules'][number]['module']['programmes'][number]['programme'],
  ) {
    if (viewer.role !== UserRole.entrepreneur) return true;
    if (programme.accessType === ProgrammeAccessType.free) return true;
    return programme.accessGrants.some((grant) => grant.entrepreneurUserId === viewer.id);
  }
}
