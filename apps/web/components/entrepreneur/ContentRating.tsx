'use client';

import * as React from 'react';
import { Star } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/shared/Button';
import { Skeleton } from '@/components/shared/Card';
import {
  useMyContentRatingQuery,
  useSaveContentRatingMutation,
  type ContentItemRecord,
  type ContentRatingPayload,
} from '@/lib/api/content';
import { cn } from '@/lib/utils';

type RatingContent = {
  id: ContentItemRecord['id'];
  trainer: { name: string } | null;
};

export function ContentRating({
  content,
  programmeId,
  moduleId,
  onSaved,
  onContinue,
}: {
  content: RatingContent;
  programmeId: string;
  moduleId: string;
  onSaved?: () => void;
  onContinue?: () => void;
}) {
  const savedRating = useMyContentRatingQuery(
    content.trainer
      ? { programmeId, moduleId, contentItemId: content.id }
      : null,
  );

  if (!content.trainer) return null;

  if (savedRating.isLoading && !savedRating.data) {
    return (
      <div className="space-y-3 rounded-xl border border-line bg-surface-subtle p-4">
        <Skeleton className="h-4 w-36" />
        <Skeleton className="h-7 w-44" />
        <Skeleton className="h-20 w-full" />
      </div>
    );
  }

  if (savedRating.isError) {
    return (
      <div className="rounded-xl border border-danger/20 bg-danger-light p-4 text-sm text-danger-dark">
        Your rating could not be loaded.
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="mt-3"
          onClick={() => void savedRating.refetch()}
        >
          Try again
        </Button>
      </div>
    );
  }

  return (
    <>
      <RatingForm
        key={content.id + ':' + (savedRating.data?.updatedAt ?? 'new')}
        content={content}
        programmeId={programmeId}
        moduleId={moduleId}
        initial={savedRating.data ?? null}
        onSaved={onSaved}
      />
      {onContinue ? (
        <div className="mt-4 flex justify-end">
          <Button type="button" variant="ghost" onClick={onContinue}>
            {savedRating.data ? 'Keep current rating' : 'Maybe later'}
          </Button>
        </div>
      ) : null}
    </>
  );
}

function RatingForm({
  content,
  programmeId,
  moduleId,
  initial,
  onSaved,
}: {
  content: RatingContent;
  programmeId: string;
  moduleId: string;
  initial: ContentRatingPayload | null;
  onSaved?: () => void;
}) {
  const saveRating = useSaveContentRatingMutation({
    onSuccess: () => {
      toast.success('Your content rating was saved.');
      onSaved?.();
    },
    onError: (error) => toast.error(error.message),
  });
  const [hovered, setHovered] = React.useState(0);
  const [rating, setRating] = React.useState(initial?.rating ?? 0);
  const [comment, setComment] = React.useState(initial?.comment ?? '');
  const [dirty, setDirty] = React.useState(false);

  function handleSave() {
    if (!rating) {
      toast.error('Choose a star rating first.');
      return;
    }
    saveRating.mutate(
      {
        programmeId,
        moduleId,
        contentItemId: content.id,
        rating,
        comment: comment.trim() || undefined,
      },
      { onSuccess: () => setDirty(false) },
    );
  }

  const displayed = hovered || rating;
  const unchanged = !dirty && Boolean(initial);

  return (
    <div className="rounded-xl border border-line bg-surface-subtle p-4">
      <div className="text-sm font-semibold text-ink">Rate this content</div>
      <p className="mt-1 text-xs leading-5 text-ink-muted">
        {content.trainer
          ? 'Your feedback is attributed to ' + content.trainer.name + '.'
          : 'Your feedback helps BID improve this learning content.'}
      </p>

      <div className="mt-3 flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            aria-label={'Rate ' + star + ' star' + (star > 1 ? 's' : '')}
            onMouseEnter={() => setHovered(star)}
            onMouseLeave={() => setHovered(0)}
            onClick={() => {
              setRating(star);
              setDirty(true);
            }}
            className="rounded p-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bid/30"
          >
            <Star
              className={cn(
                'h-6 w-6 transition-colors',
                star <= displayed
                  ? 'fill-warning text-warning-dark'
                  : 'fill-transparent text-ink-faint',
              )}
              strokeWidth={1.5}
            />
          </button>
        ))}
        {rating > 0 ? (
          <span className="ml-2 text-xs font-medium text-ink-muted">
            {ratingLabel(rating)}
          </span>
        ) : null}
      </div>

      <label
        className="mt-4 block text-xs font-medium text-ink"
        htmlFor={'rating-comment-' + content.id}
      >
        Comment <span className="font-normal text-ink-muted">(optional)</span>
      </label>
      <textarea
        id={'rating-comment-' + content.id}
        value={comment}
        maxLength={1000}
        onChange={(event) => {
          setComment(event.target.value);
          setDirty(true);
        }}
        placeholder="What was useful or could be clearer?"
        rows={3}
        className="mt-1 w-full resize-none rounded-lg border border-line bg-card px-3 py-2 text-sm text-ink placeholder:text-ink-faint focus:border-bid focus:outline-none focus:ring-2 focus:ring-bid/20"
      />

      <div className="mt-3 flex items-center justify-between gap-3">
        <span className="text-xs text-ink-muted">
          {unchanged ? 'Saved' : comment.length + '/1000'}
        </span>
        <Button
          type="button"
          size="sm"
          onClick={handleSave}
          disabled={!rating || unchanged}
          isLoading={saveRating.isPending}
          loadingLabel="Saving..."
        >
          {initial ? 'Update rating' : 'Save rating'}
        </Button>
      </div>
    </div>
  );
}

function ratingLabel(rating: number) {
  return ['', 'Poor', 'Fair', 'Good', 'Very good', 'Excellent'][rating] ?? '';
}
