import * as React from 'react';
import { BidActionEmail } from '../../email/components/bid-action-email';

export type PasswordResetEmailProps = { name: string; url: string };

export function PasswordResetEmail({ name, url }: PasswordResetEmailProps) {
  return <BidActionEmail preview="Reset your BID Hub password" heading="Reset your password" greeting={`Hello ${name},`} body="We received a request to reset the password for your BID Hub account." actionLabel="Reset password" actionUrl={url} expiryNote="This link expires in 30 minutes. If you did not request a reset, you can safely ignore this email." />;
}

PasswordResetEmail.PreviewProps = {
  name: 'Amara',
  url: 'http://localhost:3000/auth/reset-password?token=preview-token',
} satisfies PasswordResetEmailProps;

export default PasswordResetEmail;
