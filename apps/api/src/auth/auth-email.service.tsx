import { Injectable } from "@nestjs/common";
import { JOB_NAMES } from "../jobs/jobs.constants";
import { TransactionalEmailQueueService } from "../jobs/transactional-email-queue.service";

@Injectable()
export class AuthEmailService {
  constructor(private readonly emailQueue: TransactionalEmailQueueService) {}

  sendVerification(to: string, name: string, token: string) {
    return this.emailQueue.enqueue(JOB_NAMES.authVerificationEmail, {
      to,
      name,
      token,
    });
  }

  sendPasswordReset(to: string, name: string, token: string) {
    return this.emailQueue.enqueue(JOB_NAMES.authPasswordResetEmail, {
      to,
      name,
      token,
    });
  }

  sendWelcome(to: string, name: string) {
    return this.emailQueue.enqueue(JOB_NAMES.entrepreneurWelcomeEmail, {
      to,
      name,
    });
  }
}
