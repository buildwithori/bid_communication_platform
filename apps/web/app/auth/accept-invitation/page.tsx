"use client";

import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Lock, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { AuthBackToLoginLink } from "@/components/auth/AuthBackToLoginLink";
import { AuthShell } from "@/components/auth/AuthShell";
import { AuthTextField } from "@/components/auth/AuthTextField";
import { Button } from "@/components/shared/Button";
import { Skeleton } from "@/components/shared/Card";
import { useAcceptAdminInvitationMutation } from "@/lib/api/admins";
import {
  acceptAdminInvitationSchema,
  type AcceptAdminInvitationForm,
} from "@/lib/forms/schemas";
import { routes } from "@/lib/routes";

export default function AcceptInvitationPage() {
  return (
    <AuthShell
      title="Accept admin invitation"
      description="Create your password to activate your BID Hub admin workspace."
      className="max-w-[460px]"
      footer={<AuthBackToLoginLink />}
    >
      <Suspense fallback={<AcceptInvitationSkeleton />}>
        <AcceptInvitationFormView />
      </Suspense>
    </AuthShell>
  );
}

function AcceptInvitationFormView() {
  const router = useRouter();
  const token = useSearchParams().get("token");
  const form = useForm<AcceptAdminInvitationForm>({
    resolver: zodResolver(acceptAdminInvitationSchema),
    defaultValues: { password: "", confirmPassword: "" },
  });
  const mutation = useAcceptAdminInvitationMutation({
    onSuccess: () => {
      toast.success("Admin account activated. Sign in to continue.");
      router.replace(routes.auth.login);
    },
    onError: (error) => toast.error(error.message),
  });

  return (
    <form
      className="space-y-4"
      onSubmit={form.handleSubmit(({ password }) => {
        if (token) mutation.mutate({ token, password });
      })}
    >
      {!token ? (
        <div className="rounded-lg border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger">
          This invitation link is incomplete. Ask the inviting administrator to
          resend it.
        </div>
      ) : (
        <div className="flex items-start gap-3 rounded-lg border border-bid/20 bg-bid-light px-4 py-3 text-sm leading-6 text-bid-dark">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
          This password activates the admin account attached to your invitation.
        </div>
      )}
      <AuthTextField
        icon={<Lock className="h-4 w-4" />}
        label="Password"
        type="password"
        placeholder="Create a secure password"
        error={form.formState.errors.password?.message}
        {...form.register("password")}
      />
      <AuthTextField
        icon={<Lock className="h-4 w-4" />}
        label="Confirm password"
        type="password"
        placeholder="Confirm your password"
        error={form.formState.errors.confirmPassword?.message}
        {...form.register("confirmPassword")}
      />
      <Button
        type="submit"
        size="lg"
        className="h-11 w-full"
        disabled={!token}
        isLoading={mutation.isPending}
        loadingLabel="Activating account..."
      >
        Activate admin account
      </Button>
    </form>
  );
}

function AcceptInvitationSkeleton() {
  return (
    <div aria-label="Loading invitation" aria-busy="true" className="space-y-4">
      <Skeleton className="h-16 w-full" />
      <Skeleton className="h-11 w-full" />
      <Skeleton className="h-11 w-full" />
      <Skeleton className="h-11 w-full" />
    </div>
  );
}
