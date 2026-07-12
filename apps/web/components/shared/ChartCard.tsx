'use client';

import * as React from 'react';
import { Card, CardHeader } from '@/components/shared/Card';
import { cn } from '@/lib/utils';

export type ChartLegendItem = {
  label: string;
  colorClassName: string;
};

export function ChartCard({
  title,
  description,
  actions,
  legend,
  children,
  className,
  bodyClassName,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  legend?: ChartLegendItem[];
  children: React.ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <Card className={cn('min-h-[320px]', className)}>
      <CardHeader title={title} description={description} actions={actions} />
      <div className={cn('h-[230px]', bodyClassName)}>{children}</div>
      {legend && legend.length > 0 && (
        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-line pt-3">
          {legend.map((item) => (
            <div key={item.label} className="flex items-center gap-2 text-sm text-ink-muted">
              <span className={cn('h-2.5 w-2.5 rounded-full', item.colorClassName)} />
              {item.label}
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
