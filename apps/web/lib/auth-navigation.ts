import type { Route } from 'next';
import type { AuthUser } from '@/lib/api/auth';
import { routes } from '@/lib/routes';

export function workspaceRouteForRole(role: AuthUser['role']): Route {
  if (role === 'admin') return routes.admin.dashboard;
  if (role === 'trainer') return routes.trainer.dashboard;
  return routes.entrepreneur.dashboard;
}

export function authenticatedDestination(user: AuthUser): Route {
  if (!user.emailVerifiedAt || user.status === 'pending') {
    return `${routes.auth.verifyEmail}?email=${encodeURIComponent(user.email)}` as Route;
  }
  if (user.onboardingRequired) return routes.auth.onboarding;
  return workspaceRouteForRole(user.role);
}

export function destinationPath(destination: Route): string {
  const queryIndex = destination.indexOf('?');
  return queryIndex === -1 ? destination : destination.slice(0, queryIndex);
}
