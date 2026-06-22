import { cn } from '@/lib/utils';

/** The BID "peak + dot" logomark, sized via prop. */
export function BidLogo({
  size = 32,
  className,
  inverted = true,
}: {
  size?: number;
  className?: string;
  /** When false, the mark uses the ink color (for light backgrounds). */
  inverted?: boolean;
}) {
  const fg = inverted ? '#fff' : 'currentColor';
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-lg bg-bid',
        className,
      )}
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      <svg
        width={size * 0.56}
        height={size * 0.56}
        viewBox="0 0 18 18"
        fill="none"
      >
        <path
          d="M3 14L9 4L15 14"
          stroke={fg}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="9" cy="4" r="1.8" fill={fg} />
      </svg>
    </span>
  );
}
