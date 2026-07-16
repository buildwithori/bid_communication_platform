import { Injectable } from "@nestjs/common";
import { JOB_NAMES } from "../jobs/jobs.constants";
import { TransactionalEmailQueueService } from "../jobs/transactional-email-queue.service";

@Injectable()
export class TrainersEmailService {
  constructor(private readonly emailQueue: TransactionalEmailQueueService) {}

  sendInvitation(to: string, name: string, inviterName: string, token: string) {
    return this.emailQueue.enqueue(JOB_NAMES.trainerInvitationEmail, {
      to,
      name,
      inviterName,
      token,
    });
  }
}
