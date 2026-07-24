export type AuthUser = {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  timezone: string | null;
  role: 'entrepreneur' | 'admin' | 'trainer';
  status: 'pending' | 'active' | 'inactive';
  emailVerifiedAt: string | null;
  trainerAccessExpiresAt: string | null;
  onboardingRequired?: boolean;
};

export type DevTokenResponse = {
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
  timezone?: string;
};

export type LoginPayload = { email: string; password: string; timezone?: string };
export type ForgotPasswordPayload = { email: string };
export type ResetPasswordPayload = { token: string; password: string };
export type VerifyEmailPayload = { token: string };
export type ResendVerificationPayload = { email: string };

export type GoogleOnboardingPayload = {
  businessName: string;
  representativeName: string;
  email: string;
  country: string;
  phone: string;
  timezone?: string;
};

export type SignupResult = { user: AuthUser; verification: DevTokenResponse };
export type LoginResult = { user: AuthUser; session: { mode: string } };
export type CurrentUserResult = { user: AuthUser | null };
export type SessionRefreshResult = { user: AuthUser; session: { mode: string; expiresAt: string } };
export type GoogleOnboardingResult = { user: AuthUser };
export type OkResult = { ok: boolean };
export type PasswordResetResult = OkResult & { email: string };
