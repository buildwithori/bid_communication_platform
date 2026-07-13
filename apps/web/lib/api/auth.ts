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
