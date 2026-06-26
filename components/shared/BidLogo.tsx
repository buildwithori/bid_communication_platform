import Image from 'next/image';
import { cn } from '@/lib/utils';

export function BidLogo({
  size = 32,
  className,
}: {
  size?: number;
  className?: string;
  /** @deprecated kept for call-site compatibility */
  inverted?: boolean;
}) {
  return (
    <span
      className={cn('inline-flex shrink-0 items-center justify-center rounded-lg', className)}
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      <Image
        src="/BIDCP_LOGO_(1).png"
        alt="BID Hub"
        width={size}
        height={size}
        className="rounded-lg object-contain"
        priority
      />
    </span>
  );
}
