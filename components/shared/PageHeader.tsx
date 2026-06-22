import { cn } from '@/lib/utils';

/**
 * Page header: title + description on the left, optional actions on the
 * right. Mirrors `.sh h2 / .sh p` from the mockups.
 */
export function PageHeader({
  title,
  description,
  actions,
  className,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'mb-4 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between',
        className,
      )}
    >
      <div>
        <h2 className="text-base font-medium">{title}</h2>
        {description && (
          <p className="mt-0.5 text-[11px] text-ink-muted">{description}</p>
        )}
      </div>
      {actions && (
        <div className="flex shrink-0 items-center gap-2">{actions}</div>
      )}
    </div>
  );
}

/**
 * The muted "notice" box used at the top of several admin pages.
 */
export function Notice({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'mb-3 rounded-lg bg-surface-subtle px-3 py-2.5 text-[10px] leading-relaxed text-ink-muted',
        className,
      )}
    >
      {children}
    </div>
  );
}
