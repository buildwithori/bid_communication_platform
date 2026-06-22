import { cn } from '@/lib/utils';

/**
 * Circular initials avatar. Falls back to the first 1-2 initials of a name.
 * The mockup uses a 28px variant in the sidebar and a 24px variant in
 * table rows; `size` covers both.
 */
export interface AvatarProps {
  initials: string;
  size?: number;
  className?: string;
  /** Optional background override (defaults to brand). */
  tone?: 'brand' | 'blue' | 'green' | 'amber' | 'neutral';
  title?: string;
}

const toneClasses: Record<NonNullable<AvatarProps['tone']>, string> = {
  brand: 'bg-bid text-white',
  blue: 'bg-info-light text-info-dark',
  green: 'bg-success-light text-success-dark',
  amber: 'bg-warning-light text-warning-dark',
  neutral: 'bg-surface-subtle text-ink-muted',
};

export function Avatar({
  initials,
  size = 28,
  className,
  tone = 'brand',
  title,
}: AvatarProps) {
  return (
    <span
      title={title ?? initials}
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-full font-semibold',
        toneClasses[tone],
        className,
      )}
      style={{ width: size, height: size, fontSize: size * 0.36 }}
      aria-hidden="true"
    >
      {initials}
    </span>
  );
}
