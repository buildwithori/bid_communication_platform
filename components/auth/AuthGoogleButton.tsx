import type * as React from 'react';
import { GoogleIcon } from '@/components/shared/GoogleIcon';

export function AuthGoogleButton({ children }: { children: React.ReactNode }) {
  return (
    <button
      type="button"
      className="flex h-12 w-full items-center justify-center gap-2.5 rounded-lg border border-line bg-white text-sm font-semibold text-ink transition-colors hover:bg-surface-subtle"
    >
      <GoogleIcon className="h-4 w-4" />
      {children}
    </button>
  );
}
