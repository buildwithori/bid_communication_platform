import { JOB_NAMES } from "./jobs.constants";

export type TransactionalEmailJobDataMap = {
  [JOB_NAMES.authVerificationEmail]: {
    to: string;
    name: string;
    token: string;
  };
  [JOB_NAMES.authPasswordResetEmail]: {
    to: string;
    name: string;
    token: string;
  };
  [JOB_NAMES.authWelcomeEmail]: {
    to: string;
    name: string;
  };
  [JOB_NAMES.adminWelcomeEmail]: {
    to: string;
    name: string;
  };
  [JOB_NAMES.trainerWelcomeEmail]: {
    to: string;
    name: string;
  };
  [JOB_NAMES.entrepreneurWelcomeEmail]: {
    to: string;
    name: string;
  };
  [JOB_NAMES.adminInvitationEmail]: {
    to: string;
    name: string;
    inviterName: string;
    token: string;
  };
  [JOB_NAMES.trainerInvitationEmail]: {
    to: string;
    name: string;
    inviterName: string;
    token: string;
  };
  [JOB_NAMES.entrepreneurInvitationEmail]: {
    to: string;
    name: string;
    businessName: string;
    inviterName: string;
    token: string;
  };
};

export type TransactionalEmailJobName = keyof TransactionalEmailJobDataMap;
