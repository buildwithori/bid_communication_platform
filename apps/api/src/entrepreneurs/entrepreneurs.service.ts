import { Injectable, NotFoundException } from '@nestjs/common';
import { BusinessMembership, Prisma, User, UserRole } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { EntrepreneurQueryDto } from './dto/entrepreneur-query.dto';

const DEFAULT_TAKE = 20;

type EntrepreneurMembership = BusinessMembership & {
  user: {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
    phone: string | null;
    status: string;
    createdAt: Date;
    entrepreneurProgrammeGrants: Array<{
      grantedAt: Date;
      programme: {
        id: string;
        name: string;
        accessType: string;
        startDate: Date;
        endDate: Date;
      };
    }>;
    programmeProgress: Array<{
      programmeId: string;
      status: string;
      progressPercent: number;
      completedModuleCount: number;
      totalModuleCount: number;
      completedContentCount: number;
      totalContentCount: number;
    }>;
  };
  business: {
    id: string;
    name: string;
    country: string;
    source: string;
    status: string;
    onboardingCompletedAt: Date | null;
    createdAt: Date;
    sector: { id: string; name: string; key: string } | null;
    stage: { id: string; name: string; key: string; definition: string } | null;
  };
};

@Injectable()
export class EntrepreneursService {
  constructor(private readonly prisma: PrismaService) {}

  async listEntrepreneurs(user: User, query: EntrepreneurQueryDto) {
    const take = query.take ?? DEFAULT_TAKE;
    const rows = await this.prisma.businessMembership.findMany({
      where: this.buildMembershipWhere(user, query),
      orderBy: [{ joinedAt: 'desc' }, { id: 'desc' }],
      take: take + 1,
      ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
      include: this.membershipInclude(),
    });

    const nextCursor = rows.length > take ? rows[take]?.id ?? null : null;
    const items = rows.slice(0, take).map((row) => this.mapEntrepreneur(row));

    return { items, nextCursor };
  }

  async getEntrepreneur(user: User, entrepreneurUserId: string) {
    const membership = await this.prisma.businessMembership.findFirst({
      where: {
        ...this.buildMembershipWhere(user, {}),
        userId: entrepreneurUserId,
      },
      include: this.membershipInclude(),
    });

    if (!membership) {
      throw new NotFoundException('Entrepreneur was not found.');
    }

    return this.mapEntrepreneur(membership);
  }

  private buildMembershipWhere(user: User, query: EntrepreneurQueryDto): Prisma.BusinessMembershipWhereInput {
    const filters: Prisma.BusinessMembershipWhereInput[] = [
      { isPrimary: true, user: { role: UserRole.entrepreneur } },
    ];

    if (query.search?.trim()) {
      const search = query.search.trim();
      filters.push({
        OR: [
          { user: { firstName: { contains: search, mode: 'insensitive' } } },
          { user: { lastName: { contains: search, mode: 'insensitive' } } },
          { user: { email: { contains: search, mode: 'insensitive' } } },
          { user: { phone: { contains: search, mode: 'insensitive' } } },
          { business: { name: { contains: search, mode: 'insensitive' } } },
          { business: { country: { contains: search, mode: 'insensitive' } } },
        ],
      });
    }

    if (query.sectorId) filters.push({ business: { sectorId: query.sectorId } });
    if (query.stageId) filters.push({ business: { stageId: query.stageId } });
    if (query.status) filters.push({ business: { status: query.status } });
    if (query.source) filters.push({ business: { source: query.source } });

    const scopeWhere = this.scopeWhere(user);
    if (scopeWhere) filters.push(scopeWhere);

    return { AND: filters };
  }

  private scopeWhere(user: User): Prisma.BusinessMembershipWhereInput | null {
    if (user.role === UserRole.admin) return null;
    if (user.role === UserRole.entrepreneur) return { userId: user.id };

    return {
      user: {
        entrepreneurProgrammeGrants: {
          some: {
            revokedAt: null,
            programme: {
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
            },
          },
        },
      },
    };
  }

  private membershipInclude() {
    return {
      user: {
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          phone: true,
          status: true,
          createdAt: true,
          entrepreneurProgrammeGrants: {
            where: { revokedAt: null },
            orderBy: { grantedAt: 'desc' as const },
            select: {
              grantedAt: true,
              programme: {
                select: {
                  id: true,
                  name: true,
                  accessType: true,
                  startDate: true,
                  endDate: true,
                },
              },
            },
          },
          programmeProgress: {
            select: {
              programmeId: true,
              status: true,
              progressPercent: true,
              completedModuleCount: true,
              totalModuleCount: true,
              completedContentCount: true,
              totalContentCount: true,
            },
          },
        },
      },
      business: {
        select: {
          id: true,
          name: true,
          country: true,
          source: true,
          status: true,
          onboardingCompletedAt: true,
          createdAt: true,
          sector: { select: { id: true, name: true, key: true } },
          stage: { select: { id: true, name: true, key: true, definition: true } },
        },
      },
    } satisfies Prisma.BusinessMembershipInclude;
  }

  private mapEntrepreneur(row: EntrepreneurMembership) {
    const progressByProgramme = new Map(row.user.programmeProgress.map((progress) => [progress.programmeId, progress]));
    const programmes = row.user.entrepreneurProgrammeGrants.map((grant) => {
      const progress = progressByProgramme.get(grant.programme.id);
      return {
        id: grant.programme.id,
        name: grant.programme.name,
        accessType: grant.programme.accessType,
        grantedAt: grant.grantedAt.toISOString(),
        startDate: grant.programme.startDate.toISOString(),
        endDate: grant.programme.endDate.toISOString(),
        progress: progress
          ? {
              status: progress.status,
              percent: progress.progressPercent,
              completedModules: progress.completedModuleCount,
              totalModules: progress.totalModuleCount,
              completedContent: progress.completedContentCount,
              totalContent: progress.totalContentCount,
            }
          : null,
      };
    });

    const averageProgress = programmes.length
      ? Math.round(
          programmes.reduce((sum, programme) => sum + (programme.progress?.percent ?? 0), 0) / programmes.length,
        )
      : 0;

    return {
      entrepreneurUserId: row.user.id,
      businessId: row.business.id,
      businessName: row.business.name,
      representativeName: [row.user.firstName, row.user.lastName].filter(Boolean).join(' ') || row.user.email,
      email: row.user.email,
      phone: row.user.phone,
      country: row.business.country,
      status: row.business.status,
      source: row.business.source,
      userStatus: row.user.status,
      joinedAt: row.joinedAt.toISOString(),
      onboardingCompletedAt: row.business.onboardingCompletedAt?.toISOString() ?? null,
      sector: row.business.sector,
      stage: row.business.stage,
      programmeAccess: {
        freeResources: true,
        assignedProgrammes: programmes,
      },
      learnerProgress: {
        average: averageProgress,
        trackedProgrammes: programmes.filter((programme) => programme.progress).length,
      },
    };
  }
}
