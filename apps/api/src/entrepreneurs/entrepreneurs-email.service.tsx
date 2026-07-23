import { Injectable } from "@nestjs/common";
import { JOB_NAMES } from "../jobs/jobs.constants";
import { TransactionalEmailQueueService } from "../jobs/transactional-email-queue.service";

@Injectable()
export class EntrepreneursEmailService {
  constructor(private readonly emailQueue: TransactionalEmailQueueService) {}

  sendInvitation(
    to: string,
    name: string,
    businessName: string,
    inviterName: string,
    token: string,
  ) {
    return this.emailQueue.enqueue(JOB_NAMES.entrepreneurInvitationEmail, {
      to,
      name,
      businessName,
      inviterName,
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
