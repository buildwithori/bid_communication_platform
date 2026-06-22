import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

/** Mockup-style breadcrumb with `›`-style separators. */
export function Breadcrumb({
  items,
  className,
}: {
  items: BreadcrumbItem[];
  className?: string;
}) {
  return (
    <nav
      aria-label="Breadcrumb"
      className={cn('mb-3.5 flex flex-wrap items-center gap-1.5 text-[11px] text-ink-muted', className)}
    >
      {items.map((item, i) => {
        const isLast = i === items.length - 1;
        return (
          <span key={i} className="flex items-center gap-1.5">
            {item.href && !isLast ? (
              <Link
                href={item.href}
                className="cursor-pointer transition-colors hover:text-bid"
              >
                {item.label}
              </Link>
            ) : (
              <span className={cn(isLast ? 'text-ink' : '')}>{item.label}</span>
            )}
            {!isLast && <ChevronRight className="h-3 w-3 text-ink-faint" aria-hidden="true" />}
          </span>
        );
      })}
    </nav>
  );
}
