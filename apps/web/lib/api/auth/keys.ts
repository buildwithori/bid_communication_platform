export const authKeys = {
  all: ['auth'] as const,
  currentUser: () => [...authKeys.all, 'me'] as const,
  onboarding: () => [...authKeys.all, 'onboarding'] as const,
};
