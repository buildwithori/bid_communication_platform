import { OnWorkerEvent, Processor, WorkerHost } from "@nestjs/bullmq";
import { Logger } from "@nestjs/common";
import type { Job } from "bullmq";
import { AdminInvitationEmail } from "../../admins/emails/admin-invitation-email";
import { PasswordResetEmail } from "../../auth/emails/password-reset-email";
import { VerificationEmail } from "../../auth/emails/verification-email";
import { WelcomeEmail } from "../../auth/emails/welcome-email";
import { EmailService } from "../../email/email.service";
import { EntrepreneurInvitationEmail } from "../../entrepreneurs/emails/entrepreneur-invitation-email";
import { TrainerInvitationEmail } from "../../trainers/emails/trainer-invitation-email";
import { JOB_NAMES, QUEUE_NAMES } from "../jobs.constants";
import type {
  TransactionalEmailJobDataMap,
  TransactionalEmailJobName,
} from "../jobs.types";

@Processor(QUEUE_NAMES.transactionalEmail, { concurrency: 5 })
export class TransactionalEmailProcessor extends WorkerHost {
  private readonly logger = new Logger(TransactionalEmailProcessor.name);

  constructor(private readonly email: EmailService) {
    super();
  }

  async process(job: Job<unknown, unknown, string>) {
    switch (job.name) {
      case JOB_NAMES.authVerificationEmail:
        return this.sendVerification(
          job.data as TransactionalEmailJobDataMap[typeof JOB_NAMES.authVerificationEmail],
        );
      case JOB_NAMES.authPasswordResetEmail:
        return this.sendPasswordReset(
          job.data as TransactionalEmailJobDataMap[typeof JOB_NAMES.authPasswordResetEmail],
        );
      case JOB_NAMES.authWelcomeEmail:
        return this.sendWelcome(
          job.data as TransactionalEmailJobDataMap[typeof JOB_NAMES.authWelcomeEmail],
        );
      case JOB_NAMES.adminInvitationEmail:
        return this.sendAdminInvitation(
          job.data as TransactionalEmailJobDataMap[typeof JOB_NAMES.adminInvitationEmail],
        );
      case JOB_NAMES.trainerInvitationEmail:
        return this.sendTrainerInvitation(
          job.data as TransactionalEmailJobDataMap[typeof JOB_NAMES.trainerInvitationEmail],
        );
      case JOB_NAMES.entrepreneurInvitationEmail:
        return this.sendEntrepreneurInvitation(
          job.data as TransactionalEmailJobDataMap[typeof JOB_NAMES.entrepreneurInvitationEmail],
        );
      default:
        throw new Error(`Unsupported transactional email job: ${job.name}`);
    }
  }

  @OnWorkerEvent("completed")
  onCompleted(job: Job) {
    this.logger.log(`Transactional email job ${job.id} completed`);
  }

  @OnWorkerEvent("failed")
  onFailed(job: Job | undefined, error: Error) {
    this.logger.error(
      `Transactional email job ${job?.id ?? "unknown"} failed: ${error.message}`,
      error.stack,
    );
  }

  @OnWorkerEvent("error")
  onError(error: Error) {
    this.logger.error("Transactional email worker error", error.stack);
  }

  private sendVerification(
    data: TransactionalEmailJobDataMap[typeof JOB_NAMES.authVerificationEmail],
  ) {
    const url = this.email.appUrl(
      `/auth/verify-email?token=${encodeURIComponent(data.token)}&email=${encodeURIComponent(data.to)}`,
    );
    return this.email.send({
      to: data.to,
      subject: "Verify your BID Hub email",
      template: (
        <VerificationEmail
          name={data.name}
          url={url}
          logoUrl={this.email.logoUrl()}
        />
      ),
    });
  }

  private sendPasswordReset(
    data: TransactionalEmailJobDataMap[typeof JOB_NAMES.authPasswordResetEmail],
  ) {
    const url = this.email.appUrl(
      `/auth/reset-password?token=${encodeURIComponent(data.token)}`,
    );
    return this.email.send({
      to: data.to,
      subject: "Reset your BID Hub password",
      template: (
        <PasswordResetEmail
          name={data.name}
          url={url}
          logoUrl={this.email.logoUrl()}
        />
      ),
    });
  }

  private sendWelcome(
    data: TransactionalEmailJobDataMap[typeof JOB_NAMES.authWelcomeEmail],
  ) {
    return this.email.send({
      to: data.to,
      subject: "Welcome to BID Hub",
      template: (
        <WelcomeEmail
          name={data.name}
          dashboardUrl={this.email.appUrl("/entrepreneur/dashboard")}
          logoUrl={this.email.logoUrl()}
        />
      ),
    });
  }

  private sendAdminInvitation(
    data: TransactionalEmailJobDataMap[typeof JOB_NAMES.adminInvitationEmail],
  ) {
    const url = this.email.appUrl(
      `/auth/accept-invitation?token=${encodeURIComponent(data.token)}`,
    );
    return this.email.send({
      to: data.to,
      subject: "You are invited to the BID Hub admin team",
      template: (
        <AdminInvitationEmail
          name={data.name}
          inviterName={data.inviterName}
          url={url}
          logoUrl={this.email.logoUrl()}
        />
      ),
    });
  }

  private sendTrainerInvitation(
    data: TransactionalEmailJobDataMap[typeof JOB_NAMES.trainerInvitationEmail],
  ) {
    const url = this.email.appUrl(
      `/auth/accept-invitation?role=trainer&token=${encodeURIComponent(data.token)}`,
    );
    return this.email.send({
      to: data.to,
      subject: "You are invited to the BID Hub trainer team",
      template: (
        <TrainerInvitationEmail
          name={data.name}
          inviterName={data.inviterName}
          url={url}
          logoUrl={this.email.logoUrl()}
        />
      ),
    });
  }

  private sendEntrepreneurInvitation(
    data: TransactionalEmailJobDataMap[typeof JOB_NAMES.entrepreneurInvitationEmail],
  ) {
    const url = this.email.appUrl(
      `/auth/accept-invitation?role=entrepreneur&token=${encodeURIComponent(data.token)}`,
    );
    return this.email.send({
      to: data.to,
      subject: "Activate your BID Hub entrepreneur workspace",
      template: (
        <EntrepreneurInvitationEmail
          name={data.name}
          inviterName={data.inviterName}
          businessName={data.businessName}
          url={url}
          logoUrl={this.email.logoUrl()}
        />
      ),
    });
  }
}
