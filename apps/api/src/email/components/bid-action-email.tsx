import * as React from 'react';
import { Body, Button, Container, Head, Heading, Hr, Html, Img, Preview, Section, Text } from 'react-email';

export type BidActionEmailProps = {
  preview: string;
  heading: string;
  greeting: string;
  body: string;
  actionLabel: string;
  actionUrl: string;
  logoUrl: string;
  eyebrow?: string;
  expiryNote?: string;
};

export function BidActionEmail({ eyebrow = 'BID Hub account', ...props }: BidActionEmailProps) {
  return (
    <Html lang="en">
      <Head />
      <Preview>{props.preview}</Preview>
      <Body style={styles.body}>
        <Container style={styles.shell}>
          <Section style={styles.brandBar} />
          <Section style={styles.header}>
            <Img src={props.logoUrl} width="184" alt="BID Hub" style={styles.logo} />
          </Section>
          <Section style={styles.content}>
            <Text style={styles.eyebrow}>{eyebrow}</Text>
            <Heading style={styles.heading}>{props.heading}</Heading>
            <Text style={styles.text}>{props.greeting}</Text>
            <Text style={styles.text}>{props.body}</Text>
            <Button href={props.actionUrl} style={styles.button}>{props.actionLabel}</Button>
            {props.expiryNote ? (
              <Section style={styles.notice}>
                <Text style={styles.noticeText}>{props.expiryNote}</Text>
              </Section>
            ) : null}
          </Section>
          <Section style={styles.footer}>
            <Text style={styles.footerTitle}>BID Hub</Text>
            <Text style={styles.footerText}>Building investment-ready businesses.</Text>
            <Hr style={styles.rule} />
            <Text style={styles.legal}>This operational email was sent by BID Hub. Please do not reply to this message.</Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

const styles: Record<string, React.CSSProperties> = {
  body: { backgroundColor: '#f7f6f3', color: '#1a1a1a', fontFamily: 'Inter, Arial, sans-serif', margin: 0, padding: '36px 12px' },
  shell: { backgroundColor: '#ffffff', border: '1px solid rgba(0,0,0,0.12)', borderRadius: '12px', boxShadow: '0 18px 45px rgba(26,26,26,0.07)', margin: '0 auto', maxWidth: '580px', overflow: 'hidden' },
  brandBar: { backgroundColor: '#842751', height: '7px', lineHeight: '7px' },
  header: { borderBottom: '1px solid rgba(0,0,0,0.08)', padding: '24px 36px 20px' },
  logo: { display: 'block', height: 'auto', maxWidth: '184px' },
  content: { padding: '34px 36px 30px' },
  eyebrow: { color: '#842751', fontSize: '11px', fontWeight: 700, letterSpacing: '1.4px', margin: '0 0 12px', textTransform: 'uppercase' },
  heading: { color: '#1a1a1a', fontSize: '29px', fontWeight: 650, letterSpacing: '-0.5px', lineHeight: '37px', margin: '0 0 22px' },
  text: { color: '#666666', fontSize: '15px', lineHeight: '24px', margin: '0 0 16px' },
  button: { backgroundColor: '#842751', borderRadius: '8px', color: '#ffffff', display: 'inline-block', fontSize: '14px', fontWeight: 650, margin: '10px 0 26px', padding: '13px 22px', textDecoration: 'none' },
  notice: { backgroundColor: '#f5e8ef', border: '1px solid rgba(132,39,81,0.16)', borderRadius: '9px', padding: '13px 15px' },
  noticeText: { color: '#5c1a38', fontSize: '12px', lineHeight: '19px', margin: 0 },
  footer: { backgroundColor: '#f1efe8', borderTop: '1px solid rgba(0,0,0,0.08)', padding: '24px 36px' },
  footerTitle: { color: '#1a1a1a', fontSize: '13px', fontWeight: 700, margin: '0 0 4px' },
  footerText: { color: '#666666', fontSize: '12px', margin: 0 },
  rule: { borderColor: 'rgba(0,0,0,0.10)', margin: '18px 0 14px' },
  legal: { color: '#999999', fontSize: '10px', lineHeight: '16px', margin: 0 },
};
