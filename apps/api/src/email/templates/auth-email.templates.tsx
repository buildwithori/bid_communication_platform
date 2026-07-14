import * as React from 'react';
import { Body, Button, Container, Head, Heading, Hr, Html, Preview, Section, Text } from '@react-email/components';

type ActionEmailProps = {
  preview: string;
  heading: string;
  greeting: string;
  body: string;
  actionLabel: string;
  actionUrl: string;
  expiry: string;
};

function BidActionEmail(props: ActionEmailProps) {
  return (
    <Html><Head /><Preview>{props.preview}</Preview><Body style={styles.body}>
      <Container style={styles.container}>
        <Section style={styles.brand}>BID Hub</Section>
        <Heading style={styles.heading}>{props.heading}</Heading>
        <Text style={styles.text}>{props.greeting}</Text>
        <Text style={styles.text}>{props.body}</Text>
        <Button href={props.actionUrl} style={styles.button}>{props.actionLabel}</Button>
        <Text style={styles.muted}>This link expires {props.expiry}. If you did not request this, you can safely ignore this email.</Text>
        <Hr style={styles.rule} /><Text style={styles.footer}>BID Hub · Building investment-ready businesses</Text>
      </Container>
    </Body></Html>
  );
}

export function VerificationEmail({ name, url }: { name: string; url: string }) {
  return <BidActionEmail preview="Verify your BID Hub email" heading="Verify your email" greeting={`Hello ${name},`} body="Confirm your email address to activate your entrepreneur workspace." actionLabel="Verify email" actionUrl={url} expiry="in 24 hours" />;
}

export function PasswordResetEmail({ name, url }: { name: string; url: string }) {
  return <BidActionEmail preview="Reset your BID Hub password" heading="Reset your password" greeting={`Hello ${name},`} body="We received a request to reset the password for your BID Hub account." actionLabel="Reset password" actionUrl={url} expiry="in 30 minutes" />;
}

export function WelcomeEmail({ name, dashboardUrl }: { name: string; dashboardUrl: string }) {
  return <BidActionEmail preview="Welcome to BID Hub" heading="Your workspace is ready" greeting={`Welcome ${name},`} body="Your email is verified and your BID Hub entrepreneur workspace is ready to use." actionLabel="Open BID Hub" actionUrl={dashboardUrl} expiry="when you sign out" />;
}

const styles: Record<string, React.CSSProperties> = {
  body: { backgroundColor: '#f4f5f7', fontFamily: 'Arial, sans-serif', margin: 0, padding: '32px 12px' },
  container: { backgroundColor: '#ffffff', border: '1px solid #e5e7eb', borderRadius: '12px', margin: '0 auto', maxWidth: '560px', padding: '32px' },
  brand: { color: '#6d28d9', fontSize: '18px', fontWeight: 700, marginBottom: '28px' },
  heading: { color: '#171717', fontSize: '26px', lineHeight: '34px', margin: '0 0 20px' },
  text: { color: '#4b5563', fontSize: '15px', lineHeight: '24px', margin: '0 0 16px' },
  button: { backgroundColor: '#6d28d9', borderRadius: '7px', color: '#ffffff', display: 'inline-block', fontSize: '14px', fontWeight: 600, margin: '8px 0 24px', padding: '12px 20px', textDecoration: 'none' },
  muted: { color: '#6b7280', fontSize: '12px', lineHeight: '19px' },
  rule: { borderColor: '#e5e7eb', margin: '28px 0 18px' },
  footer: { color: '#9ca3af', fontSize: '12px', margin: 0 },
};
