import Image from 'next/image';
import { cn } from '@/lib/utils';

/**
 * variant="isotype" — square icon mark (BIDCP_ISOTYPE). Use in navbars and compact spaces.
 * variant="full"    — horizontal full logo (BIDCP_LOGO). Use in login pages and headers.
 */
export function BidLogo({
  size = 40,
  className,
  variant = 'isotype',
}: {
  size?: number;
  className?: string;
  variant?: 'isotype' | 'full';
  /** @deprecated kept for call-site compatibility */
  inverted?: boolean;
}) {
  if (variant === 'full') {
    return (
      <span
        className={cn('inline-flex shrink-0 items-center justify-center', className)}
        style={{ height: size }}
        aria-hidden="true"
      >
        <Image
          src="/BIDCP_LOGO_(1).png"
          alt="BID Hub"
          width={size * 3}
          height={size}
          className="object-contain"
          style={{ height: size, width: 'auto' }}
          priority
        />
      </span>
    );
  }

  return (
    <span
      className={cn('inline-flex shrink-0 items-center justify-center rounded-xl', className)}
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      <Image
        src="/BIDCP_ISOTYPE_(1).png"
        alt="BID Hub"
        width={size}
        height={size}
        className="rounded-xl object-contain"
        priority
      />
    </span>
  );
}
