import type { CursorPage } from '@bid/shared';
import { Transform } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

export class CursorPaginationDto {
  @IsOptional()
  @Transform(({ value }) => (value === undefined ? undefined : Number(value)))
  @IsInt()
  @Min(1)
  @Max(MAX_PAGE_SIZE)
  take?: number;

  @IsOptional()
  @IsString()
  cursor?: string;
}

export function pageSize(query: CursorPaginationDto, fallback = DEFAULT_PAGE_SIZE) {
  return query.take ?? fallback;
}

export function cursorArgs(cursor?: string): { cursor?: { id: string }; skip?: number } {
  return cursor ? { cursor: { id: cursor }, skip: 1 } : {};
}

export function toCursorPage<T>(
  rows: T[],
  take: number,
  getCursor: (row: T) => string,
): CursorPage<T> {
  return {
    items: rows.slice(0, take),
    nextCursor: rows.length > take ? getCursor(rows[take - 1]) : null,
  };
}
