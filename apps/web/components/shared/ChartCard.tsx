'use client';

import * as React from 'react';
import { Tooltip } from 'recharts';
import { Card, CardHeader } from '@/components/shared/Card';
import { cn } from '@/lib/utils';

export type ChartLegendItem = {
  label: string;
  colorClassName: string;
};

type RechartsTooltipProps = React.ComponentProps<typeof Tooltip>;

/**
 * Shared Recharts tooltip contract. Recharts otherwise injects light-only
 * label, item, cursor, and shadow colors even when its outer panel is themed.
 */
export function ThemedChartTooltip({
  contentStyle,
  itemStyle,
  labelStyle,
  wrapperStyle,
  cursor,
  ...props
}: RechartsTooltipProps) {
  return (
    <Tooltip
      {...props}
      cursor={cursor ?? { fill: 'hsl(var(--chart-cursor))' }}
      contentStyle={{
        borderRadius: 12,
        border: '1px solid hsl(var(--border))',
        backgroundColor: 'hsl(var(--popover))',
        color: 'hsl(var(--popover-foreground))',
        boxShadow: '0 16px 42px hsl(var(--shadow-color) / 0.18)',
        padding: '10px 12px',
        ...contentStyle,
      }}
      labelStyle={{
        color: 'hsl(var(--popover-foreground))',
        fontWeight: 600,
        marginBottom: 6,
        ...labelStyle,
      }}
      itemStyle={{
        color: 'hsl(var(--popover-foreground))',
        paddingBlock: 2,
        ...itemStyle,
      }}
      wrapperStyle={{
        zIndex: 30,
        outline: 'none',
        ...wrapperStyle,
      }}
    />
  );
}

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
