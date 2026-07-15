'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { authKeys } from './keys';
import {
  completeGoogleOnboardingRequest,
  currentUserRequest,
  forgotPasswordRequest,
  googleOnboardingRequest,
  loginRequest,
  logoutRequest,
  resendVerificationRequest,
  resetPasswordRequest,
  signupRequest,
  verifyEmailRequest,
} from './requests';
import type {
  ForgotPasswordPayload,
  GoogleOnboardingPayload,
  LoginPayload,
  ResendVerificationPayload,
  ResetPasswordPayload,
  SignupPayload,
  VerifyEmailPayload,
} from './types';

type MutationHandlers<TData> = {
  onSuccess?: (data: TData) => void;
  onError?: (error: Error) => void;
};

function useApiMutation<TData, TVariables>(
  mutationFn: (variables: TVariables) => Promise<TData>,
  handlers?: MutationHandlers<TData>,
) {
  return useMutation<TData, Error, TVariables>({
    mutationFn,
    onSuccess: handlers?.onSuccess,
    onError: handlers?.onError,
  });
}

export function useSignupMutation(handlers?: MutationHandlers<Awaited<ReturnType<typeof signupRequest>>>) {
  return useApiMutation<Awaited<ReturnType<typeof signupRequest>>, SignupPayload>(signupRequest, handlers);
}

export function useLoginMutation(handlers?: MutationHandlers<Awaited<ReturnType<typeof loginRequest>>>) {
  return useApiMutation<Awaited<ReturnType<typeof loginRequest>>, LoginPayload>(loginRequest, handlers);
}

export function useForgotPasswordMutation(handlers?: MutationHandlers<Awaited<ReturnType<typeof forgotPasswordRequest>>>) {
  return useApiMutation<Awaited<ReturnType<typeof forgotPasswordRequest>>, ForgotPasswordPayload>(forgotPasswordRequest, handlers);
}

export function useResetPasswordMutation(handlers?: MutationHandlers<Awaited<ReturnType<typeof resetPasswordRequest>>>) {
  return useApiMutation<Awaited<ReturnType<typeof resetPasswordRequest>>, ResetPasswordPayload>(resetPasswordRequest, handlers);
}

export function useVerifyEmailMutation(handlers?: MutationHandlers<Awaited<ReturnType<typeof verifyEmailRequest>>>) {
  return useApiMutation<Awaited<ReturnType<typeof verifyEmailRequest>>, VerifyEmailPayload>(verifyEmailRequest, handlers);
}

export function useResendVerificationMutation(handlers?: MutationHandlers<Awaited<ReturnType<typeof resendVerificationRequest>>>) {
  return useApiMutation<Awaited<ReturnType<typeof resendVerificationRequest>>, ResendVerificationPayload>(resendVerificationRequest, handlers);
}

export function useCurrentUserQuery() {
  return useQuery({ queryKey: authKeys.currentUser(), queryFn: currentUserRequest, retry: false, staleTime: 0 });
}

export function useGoogleOnboardingQuery() {
  return useQuery({ queryKey: authKeys.onboarding(), queryFn: googleOnboardingRequest, retry: false });
}

export function useCompleteGoogleOnboardingMutation(handlers?: MutationHandlers<Awaited<ReturnType<typeof completeGoogleOnboardingRequest>>>) {
  return useApiMutation<Awaited<ReturnType<typeof completeGoogleOnboardingRequest>>, GoogleOnboardingPayload>(completeGoogleOnboardingRequest, handlers);
}

export function useLogoutMutation(handlers?: MutationHandlers<Awaited<ReturnType<typeof logoutRequest>>>) {
  const queryClient = useQueryClient();
  return useApiMutation<Awaited<ReturnType<typeof logoutRequest>>, void>(
    () => logoutRequest(),
    {
      onSuccess: (data) => {
        queryClient.removeQueries({ queryKey: authKeys.all });
        handlers?.onSuccess?.(data);
      },
      onError: handlers?.onError,
    },
  );
}
