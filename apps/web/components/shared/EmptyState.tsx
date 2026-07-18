import * as React from 'react';
import { cn } from '@/lib/utils';

export interface EmptyStateProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title'> {
  icon: React.ReactNode;
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
  ...props
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'relative isolate flex min-h-40 w-full flex-col items-center justify-center overflow-hidden rounded-xl border border-dashed border-border bg-muted/35 px-6 py-10 text-center',
        className,
      )}
      {...props}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-1/2 -z-10 h-44 w-44 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/[0.055] blur-3xl"
      />
      <div className="grid h-12 w-12 place-items-center rounded-2xl border border-border bg-card text-primary shadow-sm">
        {icon}
      </div>
      <div className="mt-4 text-sm font-semibold text-foreground">{title}</div>
      {description ? (
        <p className="mt-1.5 max-w-sm text-sm leading-6 text-muted-foreground">
          {description}
        </p>
      ) : null}
      {action ? <div className="mt-5 flex justify-center">{action}</div> : null}
    </div>
  );
}
