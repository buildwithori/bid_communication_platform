import * as React from 'react';
import { BidActionEmail } from '../../email/components/bid-action-email';

export type WelcomeEmailProps = { name: string; dashboardUrl: string };

export function WelcomeEmail({ name, dashboardUrl }: WelcomeEmailProps) {
  return <BidActionEmail preview="Welcome to BID Hub" heading="Your workspace is ready" greeting={`Welcome ${name},`} body="Your email is verified and your BID Hub entrepreneur workspace is ready to use." actionLabel="Open BID Hub" actionUrl={dashboardUrl} />;
}

WelcomeEmail.PreviewProps = {
  name: 'Amara',
  dashboardUrl: 'http://localhost:3000/entrepreneur/dashboard',
} satisfies WelcomeEmailProps;

export default WelcomeEmail;
