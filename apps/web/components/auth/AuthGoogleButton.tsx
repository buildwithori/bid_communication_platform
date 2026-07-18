import type * as React from 'react';
import { GoogleIcon } from '@/components/shared/GoogleIcon';

export function AuthGoogleButton({
  children,
  onClick,
}: {
  children: React.ReactNode;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-12 w-full items-center justify-center gap-2.5 rounded-lg border border-border bg-card text-sm font-semibold text-card-foreground transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-card"
    >
      <GoogleIcon className="h-4 w-4" />
      {children}
    </button>
  );
}
