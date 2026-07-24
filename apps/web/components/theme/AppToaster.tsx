'use client';

import { Toaster, type ToasterProps } from 'sonner';
import { useTheme } from 'next-themes';

export function AppToaster() {
  const { resolvedTheme } = useTheme();

  return (
    <Toaster
      richColors
      position="bottom-right"
      theme={(resolvedTheme ?? 'system') as ToasterProps['theme']}
      toastOptions={{
        classNames: {
          toast: 'border-border shadow-[0_18px_48px_hsl(var(--shadow-color)/0.24)]',
          title: 'text-foreground',
          description: 'text-muted-foreground',
          closeButton: 'border-border bg-card text-foreground hover:bg-muted',
          actionButton: 'bg-primary text-primary-foreground',
          cancelButton: 'bg-muted text-muted-foreground',
        },
      }}
    />
  );
}
