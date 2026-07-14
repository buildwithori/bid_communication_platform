import * as React from 'react';
import { BidActionEmail } from '../../email/components/bid-action-email';

export type VerificationEmailProps = { name: string; url: string };

export function VerificationEmail({ name, url }: VerificationEmailProps) {
  return <BidActionEmail preview="Verify your BID Hub email" heading="Verify your email" greeting={`Hello ${name},`} body="Confirm your email address to activate your entrepreneur workspace." actionLabel="Verify email" actionUrl={url} expiryNote="This link expires in 24 hours. If you did not create this account, you can safely ignore this email." />;
}

VerificationEmail.PreviewProps = {
  name: 'Amara',
  url: 'http://localhost:3000/auth/verify-email?token=preview-token',
} satisfies VerificationEmailProps;

export default VerificationEmail;
