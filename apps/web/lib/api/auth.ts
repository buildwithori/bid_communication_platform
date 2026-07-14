import { apiRequest } from './client';

export type AuthUser = {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  role: 'entrepreneur' | 'admin' | 'trainer';
  status: 'pending' | 'active' | 'inactive';
  emailVerifiedAt: string | null;
  onboardingRequired?: boolean;
};

type DevTokenResponse = {
  queued: boolean;
  devToken?: string;
};

export type SignupPayload = {
  businessName: string;
  representativeName: string;
  email: string;
  password: string;
  country: string;
  phone: string;
};

export function signup(payload: SignupPayload) {
  return apiRequest<{ user: AuthUser; verification: DevTokenResponse }>('/auth/signup', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function login(payload: { email: string; password: string }) {
  return apiRequest<{ user: AuthUser; session: { mode: string } }>('/auth/login', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function forgotPassword(payload: { email: string }) {
  return apiRequest<{ ok: boolean; reset?: DevTokenResponse }>('/auth/forgot-password', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function resetPassword(payload: { token: string; password: string }) {
  return apiRequest<{ ok: boolean }>('/auth/reset-password', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function verifyEmail(payload: { token: string }) {
  return apiRequest<{ user: AuthUser }>('/auth/verify-email', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function getCurrentUser() {
  return apiRequest<{ user: AuthUser | null }>('/auth/me');
}

export function refreshSession() {
  return apiRequest<{ user: AuthUser; session: { mode: string; expiresAt: string } }>('/auth/refresh', {
    method: 'POST',
  });
}

export function logout() {
  return apiRequest<{ ok: boolean }>('/auth/logout', {
    method: 'POST',
  });
}

export function resendVerification(payload: { email: string }) {
  return apiRequest<{ ok: boolean }>('/auth/resend-verification', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function getGoogleAuthUrl(mode: 'login' | 'signup') {
  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:4000/api';
  return `${baseUrl}/auth/google/start?mode=${mode}`;
}

export type GoogleOnboardingPayload = {
  businessName: string;
  representativeName: string;
  email: string;
  country: string;
  phone: string;
};

export function getGoogleOnboarding() {
  return apiRequest<{ user: AuthUser }>('/auth/onboarding');
}

export function completeGoogleOnboarding(payload: GoogleOnboardingPayload) {
  return apiRequest<{ user: AuthUser }>('/auth/onboarding', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}
