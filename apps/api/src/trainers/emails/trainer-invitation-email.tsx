import * as React from 'react';
import { BidActionEmail } from '../../email/components/bid-action-email';

export type TrainerInvitationEmailProps = {
  name: string;
  inviterName: string;
  url: string;
  logoUrl: string;
};

export function TrainerInvitationEmail({
  name = 'Kofi',
  inviterName = 'BID Hub operations',
  url = 'http://localhost:3000/auth/accept-invitation?role=trainer&token=preview-token',
  logoUrl = 'http://localhost:3000/bid-logo.png',
}: TrainerInvitationEmailProps) {
  return (
    <BidActionEmail
      eyebrow="BID Hub trainer invitation"
      preview="You have been invited to the BID Hub trainer workspace"
      heading="Join the BID Hub trainer team"
      greeting={`Hello ${name},`}
      body={`${inviterName} invited you to support BID entrepreneurs through learning, sessions, and deliverable feedback.`}
      actionLabel="Accept invitation"
      actionUrl={url}
      logoUrl={logoUrl}
      expiryNote="This invitation expires in 7 days. If you were not expecting it, you can safely ignore this email."
    />
  );
}

TrainerInvitationEmail.PreviewProps = {
  name: 'Kofi',
  inviterName: 'BID Hub operations',
  url: 'http://localhost:3000/auth/accept-invitation?role=trainer&token=preview-token',
  logoUrl: 'http://localhost:3000/bid-logo.png',
} satisfies TrainerInvitationEmailProps;

export default TrainerInvitationEmail;
