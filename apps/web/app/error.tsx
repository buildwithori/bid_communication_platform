'use client';

import { useEffect } from 'react';
import { RouteErrorPage } from '@/components/errors/RouteErrorPage';
import { reportClientError } from '@/lib/client-error-reporting';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    reportClientError(error, 'route');
  }, [error]);

  return (
    <RouteErrorPage
      code="500"
      title="This page could not be loaded"
      description="BID Hub recorded the problem. Try loading the page again; your saved information has not been changed."
      onRetry={reset}
    />
  );
}
