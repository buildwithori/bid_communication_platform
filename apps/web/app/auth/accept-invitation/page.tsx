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
import { useAcceptTrainerInvitationMutation } from "@/lib/api/trainers";
import {
  acceptTrainerInvitationSchema,
  type AcceptTrainerInvitationForm,
} from "@/lib/forms/schemas";
import { routes } from "@/lib/routes";

export default function AcceptInvitationPage() {
  return (
    <Suspense fallback={<AcceptInvitationSkeleton />}>
      <AcceptInvitationView />
    </Suspense>
  );
}

function AcceptInvitationView() {
  const searchParams = useSearchParams();
  const isTrainer = searchParams.get("role") === "trainer";
  const noun = isTrainer ? "trainer" : "admin";

  return (
    <AuthShell
      title={`Accept ${noun} invitation`}
      description={`Create your password to activate your BID Hub ${noun} workspace.`}
      className="max-w-[460px]"
      footer={<AuthBackToLoginLink />}
    >
      <AcceptInvitationFormView isTrainer={isTrainer} />
    </AuthShell>
  );
}

function AcceptInvitationFormView({ isTrainer }: { isTrainer: boolean }) {
  const router = useRouter();
  const token = useSearchParams().get("token");
  const form = useForm<AcceptTrainerInvitationForm>({
    resolver: zodResolver(acceptTrainerInvitationSchema),
    defaultValues: { password: "", confirmPassword: "" },
  });
  const onAccepted = () => {
    toast.success(
      `${isTrainer ? "Trainer" : "Admin"} account activated. Sign in to continue.`,
    );
    router.replace(routes.auth.login);
  };
  const adminMutation = useAcceptAdminInvitationMutation({
    onSuccess: onAccepted,
    onError: (error) => toast.error(error.message),
  });
  const trainerMutation = useAcceptTrainerInvitationMutation({
    onSuccess: onAccepted,
    onError: (error) => toast.error(error.message),
  });
  const isPending = isTrainer ? trainerMutation.isPending : adminMutation.isPending;
  const noun = isTrainer ? "trainer" : "admin";

  return (
    <form
      className="space-y-4"
      onSubmit={form.handleSubmit(({ password }) => {
        if (!token || isPending) return;
        if (isTrainer) {
          trainerMutation.mutate({ token, password });
        } else {
          adminMutation.mutate({ token, password });
        }
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
          This password activates the {noun} account attached to your invitation.
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
        disabled={!token || isPending}
        isLoading={isPending}
        loadingLabel="Activating account..."
      >
        Activate {noun} account
      </Button>
    </form>
  );
}

function AcceptInvitationSkeleton() {
  return (
    <AuthShell
      title="Accept invitation"
      description="Loading your BID Hub invitation."
      className="max-w-[460px]"
      footer={<AuthBackToLoginLink />}
    >
      <div aria-label="Loading invitation" aria-busy="true" className="space-y-4">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-11 w-full" />
        <Skeleton className="h-11 w-full" />
        <Skeleton className="h-11 w-full" />
      </div>
    </AuthShell>
  );
}
