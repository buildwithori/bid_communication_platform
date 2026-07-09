'use client';

import * as React from 'react';
import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/shared/Button';
import { toast } from 'sonner';
import { getContentTrainer } from '@/lib/content-trainer-access';

interface ContentRatingProps {
  contentId: string;
  initialRating?: number;
  initialNote?: string;
  onSaved?: (rating: number, note: string) => void;
}

export function ContentRating({
  contentId,
  initialRating = 0,
  initialNote = '',
  onSaved,
}: ContentRatingProps) {
  const [hovered, setHovered] = React.useState(0);
  const [rating, setRating] = React.useState(initialRating);
  const [note, setNote] = React.useState(initialNote);
  const [saved, setSaved] = React.useState(initialRating > 0);
  const trainer = getContentTrainer(contentId);

  const displayed = hovered || rating;

  function handleSave() {
    if (!rating) {
      toast.error('Please select a star rating first.');
      return;
    }
    setSaved(true);
    onSaved?.(rating, note);
    toast.success(trainer ? `Rating saved for ${trainer.fullName}` : 'Rating saved!');
    // In a real app: persist to Supabase here (keyed by contentId) and attribute it to the content trainer.
    void contentId;
  }

  return (
    <div className="rounded-lg border border-line bg-surface-subtle p-3.5">
      <div className="mb-1 text-[11px] font-medium text-ink">Rate this content</div>
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
            aria-label={`Rate ${star} star${star > 1 ? 's' : ''}`}
            onMouseEnter={() => setHovered(star)}
            onMouseLeave={() => setHovered(0)}
            onClick={() => { setRating(star); setSaved(false); }}
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
        onChange={(e) => { setNote(e.target.value); setSaved(false); }}
        placeholder="Add a note about this content…"
        rows={3}
        className="w-full resize-none rounded-md border border-line bg-white px-3 py-2 text-[11px] text-ink placeholder:text-ink-faint focus:border-bid focus:outline-none focus:ring-2 focus:ring-bid/20"
      />

      <div className="mt-2.5 flex items-center justify-between">
        {saved ? (
          <span className="text-[11px] text-success-dark">Saved</span>
        ) : (
          <span />
        )}
        <Button size="sm" onClick={handleSave} disabled={saved && rating === initialRating && note === initialNote}>
          {saved ? 'Update' : 'Save rating'}
        </Button>
      </div>
    </div>
  );
}

function ratingLabel(r: number) {
  return ['', 'Poor', 'Fair', 'Good', 'Very good', 'Excellent'][r] ?? '';
}
