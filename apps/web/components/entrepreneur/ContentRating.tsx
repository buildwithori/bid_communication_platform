'use client';

import * as React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Star } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/shared/Button';
import { getContentTrainer } from '@/lib/content-trainer-access';
import { getMyContentRating, saveContentRating } from '@/lib/api/content';
import { cn } from '@/lib/utils';

interface ContentRatingProps {
  contentId: string;
  initialRating?: number;
  initialNote?: string;
  onSaved?: (rating: number, note: string) => void;
  persist?: boolean;
}

export function ContentRating({
  contentId,
  initialRating = 0,
  initialNote = '',
  onSaved,
  persist = true,
}: ContentRatingProps) {
  const queryClient = useQueryClient();
  const [hovered, setHovered] = React.useState(0);
  const [rating, setRating] = React.useState(initialRating);
  const [note, setNote] = React.useState(initialNote);
  const [saved, setSaved] = React.useState(initialRating > 0);
  const trainer = getContentTrainer(contentId);

  const ratingQuery = useQuery({
    queryKey: ['content', 'rating', contentId],
    queryFn: () => getMyContentRating(contentId),
    enabled: persist,
    staleTime: 60_000,
  });

  const saveMutation = useMutation({
    mutationFn: saveContentRating,
    onSuccess: (savedRating) => {
      setSaved(true);
      setRating(savedRating.rating);
      setNote(savedRating.comment ?? '');
      onSaved?.(savedRating.rating, savedRating.comment ?? '');
      void queryClient.invalidateQueries({
        queryKey: ['content', 'rating', contentId],
      });
      void queryClient.invalidateQueries({ queryKey: ['trainers'] });
      toast.success(
        trainer ? 'Rating saved for ' + trainer.fullName : 'Rating saved',
      );
    },
    onError: () => {
      toast.error('Could not save rating. Please try again.');
    },
  });

  React.useEffect(() => {
    if (!persist || ratingQuery.data === undefined) return;
    setRating(ratingQuery.data?.rating ?? initialRating);
    setNote(ratingQuery.data?.comment ?? initialNote);
    setSaved(Boolean(ratingQuery.data));
  }, [initialNote, initialRating, persist, ratingQuery.data]);

  const displayed = hovered || rating;
  const persistedRating = persist
    ? (ratingQuery.data?.rating ?? initialRating)
    : initialRating;
  const persistedNote = persist
    ? (ratingQuery.data?.comment ?? initialNote)
    : initialNote;
  const unchanged =
    saved && rating === persistedRating && note === persistedNote;

  function handleSave() {
    if (!rating) {
      toast.error('Please select a star rating first.');
      return;
    }

    if (!persist) {
      setSaved(true);
      onSaved?.(rating, note);
      toast.success(
        trainer ? 'Rating saved for ' + trainer.fullName : 'Rating saved',
      );
      return;
    }

    saveMutation.mutate({
      contentItemId: contentId,
      rating,
      comment: note.trim() || undefined,
    });
  }

  return (
    <div className="rounded-lg border border-line bg-surface-subtle p-3.5">
      <div className="mb-1 text-[11px] font-medium text-ink">
        Rate this content
      </div>
      {trainer && (
        <div className="mb-2 text-[11px] leading-5 text-ink-muted">
          This rating is attributed to {trainer.fullName}.
        </div>
      )}
      <div className="mb-3 flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            aria-label={"Rate " + star + " star" + (star > 1 ? 's' : '')}
            onMouseEnter={() => setHovered(star)}
            onMouseLeave={() => setHovered(0)}
            onClick={() => {
              setRating(star);
              setSaved(false);
            }}
            className="p-0.5 focus:outline-none"
          >
            <Star
              className={cn(
                'h-5 w-5 transition-colors',
                star <= displayed
                  ? 'fill-amber-400 text-amber-400'
                  : 'fill-transparent text-ink-faint',
              )}
              strokeWidth={1.5}
            />
          </button>
        ))}
        {rating > 0 && (
          <span className="ml-1 text-[11px] text-ink-muted">
            {ratingLabel(rating)}
          </span>
        )}
      </div>

      <label className="mb-1 block text-[11px] font-medium text-ink">
        Notes <span className="font-normal text-ink-muted">(optional)</span>
      </label>
      <textarea
        value={note}
        onChange={(event) => {
          setNote(event.target.value);
          setSaved(false);
        }}
        placeholder="Add a note about this content..."
        rows={3}
        className="w-full resize-none rounded-md border border-line bg-white px-3 py-2 text-[11px] text-ink placeholder:text-ink-faint focus:border-bid focus:outline-none focus:ring-2 focus:ring-bid/20"
      />

      <div className="mt-2.5 flex items-center justify-between">
        {saved ? (
          <span className="text-[11px] text-success-dark">Saved</span>
        ) : (
          <span />
        )}
        <Button
          size="sm"
          onClick={handleSave}
          disabled={saveMutation.isPending || unchanged}
        >
          {saved ? 'Update' : 'Save rating'}
        </Button>
      </div>
    </div>
  );
}

function ratingLabel(value: number) {
  return ['', 'Poor', 'Fair', 'Good', 'Very good', 'Excellent'][value] ?? '';
}
