import { apiResourceUrl } from '@/lib/api/client';

type ClientBoundary = 'route' | 'global';

const reported = new Set<string>();

export function reportClientError(error: Error & { digest?: string }, boundary: ClientBoundary) {
  // Never include query parameters: invitation, OAuth, and password-reset
  // routes can carry short-lived credentials in the URL.
  const path = window.location.pathname.slice(0, 500);
  const key = `${boundary}:${error.digest ?? error.name}:${path}`;
  if (reported.has(key)) return;
  reported.add(key);

  const payload = JSON.stringify({
    name: (error.name || 'Error').slice(0, 120),
    message: (error.message || 'A client rendering error occurred.').slice(0, 1_000),
    digest: error.digest?.slice(0, 160),
    path,
    boundary,
  });

  void fetch(apiResourceUrl('/observability/client-errors'), {
    method: 'POST',
    credentials: 'include',
    keepalive: true,
    headers: { 'content-type': 'application/json' },
    body: payload,
  }).catch(() => {
    // The original failure remains visible even if telemetry is unavailable.
  });
}
