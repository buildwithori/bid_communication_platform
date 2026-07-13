import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { User, UserRole } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { UpsertContentRatingDto } from './dto/upsert-content-rating.dto';

@Injectable()
export class ContentService {
  constructor(private readonly prisma: PrismaService) {}

  async getMyRating(user: User, contentItemId: string) {
    this.assertEntrepreneur(user);

    const rating = await this.prisma.contentRating.findUnique({
      where: {
        contentItemId_entrepreneurUserId: {
          contentItemId,
          entrepreneurUserId: user.id,
        },
      },
    });

    return rating ? this.serializeRating(rating) : null;
  }

  async upsertRating(user: User, input: UpsertContentRatingDto) {
    this.assertEntrepreneur(user);

    const contentItem = await this.prisma.contentItem.findUnique({
      where: { id: input.contentItemId },
      select: { id: true, trainerId: true },
    });

    if (!contentItem) {
      throw new NotFoundException('Content item not found.');
    }

    const comment = input.comment?.trim() || null;
    const rating = await this.prisma.contentRating.upsert({
      where: {
        contentItemId_entrepreneurUserId: {
          contentItemId: input.contentItemId,
          entrepreneurUserId: user.id,
        },
      },
      create: {
        contentItemId: input.contentItemId,
        entrepreneurUserId: user.id,
        trainerId: contentItem.trainerId,
        rating: input.rating,
        comment,
      },
      update: {
        trainerId: contentItem.trainerId,
        rating: input.rating,
        comment,
      },
    });

    return this.serializeRating(rating);
  }

  private assertEntrepreneur(user: User) {
    if (user.role !== UserRole.entrepreneur) {
      throw new ForbiddenException(
        'Only entrepreneurs can rate learning content.',
      );
    }
  }

  private serializeRating(rating: {
    id: string;
    contentItemId: string;
    entrepreneurUserId: string;
    trainerId: string | null;
    rating: number;
    comment: string | null;
    createdAt: Date;
    updatedAt: Date;
  }) {
    return {
      id: rating.id,
      contentItemId: rating.contentItemId,
      entrepreneurUserId: rating.entrepreneurUserId,
      trainerId: rating.trainerId,
      rating: rating.rating,
      comment: rating.comment,
      createdAt: rating.createdAt.toISOString(),
      updatedAt: rating.updatedAt.toISOString(),
    };
  }
}
