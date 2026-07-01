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
        'mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between',
        className,
      )}
    >
      <div>
        <h2 className="text-3xl font-semibold tracking-tight text-ink">{title}</h2>
        {description && (
          <p className="mt-2 max-w-3xl text-base leading-7 text-ink-muted">{description}</p>
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
        'mb-4 rounded-lg bg-surface-subtle px-4 py-3 text-sm leading-6 text-ink-muted',
        className,
      )}
    >
      {children}
    </div>
  );
}
