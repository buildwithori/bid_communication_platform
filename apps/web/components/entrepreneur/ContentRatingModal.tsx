'use client';

import { ContentRating } from '@/components/entrepreneur/ContentRating';
import { Button } from '@/components/shared/Button';
import { Modal } from '@/components/shared/Modal';

type RatingModalContent = {
  id: string;
  title: string;
  trainer: { name: string } | null;
};

export function ContentRatingModal({
  content,
  programmeId,
  moduleId,
  onContinue,
}: {
  content: RatingModalContent | null;
  programmeId: string;
  moduleId: string | null;
  onContinue: () => void;
}) {
  const open = Boolean(content?.trainer && moduleId);

  return (
    <Modal
      open={open}
      onOpenChange={(nextOpen) => !nextOpen && onContinue()}
      title="How was this lesson?"
      width="md"
    >
      {content && moduleId ? (
        <div>
          <p className="mb-4 text-sm leading-6 text-ink-muted">
            You completed{' '}
            <span className="font-medium text-ink">{content.title}</span>. A
            quick rating helps BID improve the learning experience.
          </p>
          <ContentRating
            key={`${programmeId}:${moduleId}:${content.id}`}
            content={content}
            programmeId={programmeId}
            moduleId={moduleId}
            onSaved={onContinue}
          />
          <div className="mt-4 flex justify-end">
            <Button type="button" variant="ghost" onClick={onContinue}>
              Maybe later
            </Button>
          </div>
        </div>
      ) : null}
    </Modal>
  );
}
