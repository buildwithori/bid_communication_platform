import { apiRequest } from '../client';
import type {
  CurrentUserResult,
  ForgotPasswordPayload,
  GoogleOnboardingPayload,
  GoogleOnboardingResult,
  LoginPayload,
  LoginResult,
  OkResult,
  PasswordResetResult,
  ResendVerificationPayload,
  ResetPasswordPayload,
  SessionRefreshResult,
  SignupPayload,
  SignupResult,
  VerifyEmailPayload,
} from './types';

export function signupRequest(payload: SignupPayload) {
  return apiRequest<SignupResult>('/auth/signup', { method: 'POST', body: JSON.stringify(payload) });
}

export function loginRequest(payload: LoginPayload) {
  return apiRequest<LoginResult>('/auth/login', { method: 'POST', body: JSON.stringify(payload) });
}

export function forgotPasswordRequest(payload: ForgotPasswordPayload) {
  return apiRequest<OkResult>('/auth/forgot-password', { method: 'POST', body: JSON.stringify(payload) });
}

export function resetPasswordRequest(payload: ResetPasswordPayload) {
  return apiRequest<PasswordResetResult>('/auth/reset-password', { method: 'POST', body: JSON.stringify(payload) });
}

export function verifyEmailRequest(payload: VerifyEmailPayload) {
  return apiRequest<GoogleOnboardingResult>('/auth/verify-email', { method: 'POST', body: JSON.stringify(payload) });
}

export function currentUserRequest() {
  return apiRequest<CurrentUserResult>('/auth/me');
}

export function refreshSessionRequest() {
  return apiRequest<SessionRefreshResult>('/auth/refresh', { method: 'POST' });
}

export function logoutRequest() {
  return apiRequest<OkResult>('/auth/logout', { method: 'POST' });
}

export function resendVerificationRequest(payload: ResendVerificationPayload) {
  return apiRequest<OkResult>('/auth/resend-verification', { method: 'POST', body: JSON.stringify(payload) });
}

export function googleOnboardingRequest() {
  return apiRequest<GoogleOnboardingResult>('/auth/onboarding');
}

export function completeGoogleOnboardingRequest(payload: GoogleOnboardingPayload) {
  return apiRequest<GoogleOnboardingResult>('/auth/onboarding', { method: 'POST', body: JSON.stringify(payload) });
}
