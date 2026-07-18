'use client';

import { Moon, Sun } from 'lucide-react';
import { useAuthTheme } from '@/components/auth/AuthThemeProvider';
import { cn } from '@/lib/utils';

export function AuthThemeToggle() {
  const { toggleTheme } = useAuthTheme();

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label="Toggle color theme"
      title="Toggle color theme"
      className={cn(
        'inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border bg-card text-muted-foreground shadow-sm transition-colors hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-card',
      )}
    >
      <Moon className="h-4 w-4 dark:hidden" />
      <Sun className="hidden h-4 w-4 dark:block" />
    </button>
  );
}
