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
      className="flex h-12 w-full items-center justify-center gap-2.5 rounded-lg border border-line bg-white text-sm font-semibold text-ink transition-colors hover:bg-surface-subtle"
    >
      <GoogleIcon className="h-4 w-4" />
      {children}
    </button>
  );
}
