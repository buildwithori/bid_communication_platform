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
import { useAcceptEntrepreneurInvitationMutation } from "@/lib/api/entrepreneurs";
import { useAcceptTrainerInvitationMutation } from "@/lib/api/trainers";
import {
  acceptTrainerInvitationSchema,
  type AcceptTrainerInvitationForm,
} from "@/lib/forms/schemas";
import { routes } from "@/lib/routes";

type InvitationRole = "admin" | "trainer" | "entrepreneur";

export default function AcceptInvitationPage() {
  return (
    <Suspense fallback={<AcceptInvitationSkeleton />}>
      <AcceptInvitationView />
    </Suspense>
  );
}

function AcceptInvitationView() {
  const searchParams = useSearchParams();
  const invitationRole = resolveInvitationRole(searchParams.get("role"));

  return (
    <AuthShell
      title="Accept Invitation"
      description="Create your password to activate your BID Hub workspace."
      footer={<AuthBackToLoginLink />}
    >
      <AcceptInvitationFormView invitationRole={invitationRole} />
    </AuthShell>
  );
}

function AcceptInvitationFormView({ invitationRole }: { invitationRole: InvitationRole | null }) {
  const router = useRouter();
  const token = useSearchParams().get("token");
  const form = useForm<AcceptTrainerInvitationForm>({
    resolver: zodResolver(acceptTrainerInvitationSchema),
    defaultValues: { password: "", confirmPassword: "" },
  });
  const onAccepted = () => {
    toast.success("Account activated. Sign in to continue.");
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
  const entrepreneurMutation = useAcceptEntrepreneurInvitationMutation({
    onSuccess: onAccepted,
    onError: (error) => toast.error(error.message),
  });
  const isPending =
    adminMutation.isPending ||
    trainerMutation.isPending ||
    entrepreneurMutation.isPending;
  const hasValidInvitation = Boolean(token && invitationRole);

  return (
    <form
      className="space-y-4"
      onSubmit={form.handleSubmit(({ password }) => {
        if (!token || !invitationRole || isPending) return;
        if (invitationRole === "trainer") {
          trainerMutation.mutate({ token, password });
        } else if (invitationRole === "entrepreneur") {
          entrepreneurMutation.mutate({ token, password });
        } else {
          adminMutation.mutate({ token, password });
        }
      })}
    >
      {!hasValidInvitation ? (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          This invitation link is incomplete or invalid. Ask the person who
          invited you to resend it.
        </div>
      ) : (
        <div className="flex items-start gap-3 rounded-lg border border-primary/20 bg-accent px-4 py-3 text-sm leading-6 text-accent-foreground">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
          This password activates the account attached to your invitation.
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
        disabled={!hasValidInvitation || isPending}
        isLoading={isPending}
        loadingLabel="Activating account..."
      >
        Activate account
      </Button>
    </form>
  );
}

function AcceptInvitationSkeleton() {
  return (
    <AuthShell
      title="Accept Invitation"
      description="Loading your BID Hub invitation."
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

function resolveInvitationRole(value: string | null): InvitationRole | null {
  if (value === null || value === "admin") return "admin";
  if (value === "trainer" || value === "entrepreneur") return value;
  return null;
}
