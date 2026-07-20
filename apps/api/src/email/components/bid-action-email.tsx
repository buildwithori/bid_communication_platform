import * as React from "react";
import {
  Body,
  Button,
  Column,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Img,
  Link,
  Preview,
  Row,
  Section,
  Text,
} from "react-email";

export type BidEmailDetail = {
  label: string;
  value: string;
};

export type BidActionEmailProps = {
  preview: string;
  heading: string;
  greeting: string;
  body: string;
  actionLabel: string;
  actionUrl: string;
  logoUrl: string;
  eyebrow?: string;
  supportingText?: string;
  details?: ReadonlyArray<BidEmailDetail>;
  expiryNote?: string;
  preferenceNote?: string;
};

export function BidActionEmail({
  eyebrow = "BID Hub update",
  ...props
}: BidActionEmailProps) {
  return (
    <Html lang="en">
      <Head />
      <Preview>{props.preview}</Preview>
      <Body style={styles.body}>
        <Container style={styles.shell}>
          <Section style={styles.brandBar} />
          <Section style={styles.header}>
            <Row>
              <Column>
                <Img
                  src={props.logoUrl}
                  width="176"
                  alt="BID Hub"
                  style={styles.logo}
                />
              </Column>
              <Column align="right">
                <Text style={styles.platformLabel}>Entrepreneur platform</Text>
              </Column>
            </Row>
          </Section>

          <Section style={styles.content}>
            <Text style={styles.eyebrow}>{eyebrow}</Text>
            <Heading style={styles.heading}>{props.heading}</Heading>
            <Text style={styles.greeting}>{props.greeting}</Text>
            <Text style={styles.text}>{props.body}</Text>
            {props.supportingText ? (
              <Text style={styles.text}>{props.supportingText}</Text>
            ) : null}

            {props.details?.length ? (
              <Section style={styles.details}>
                <Text style={styles.detailsTitle}>At a glance</Text>
                {props.details.map((detail) => (
                  <Row key={detail.label} style={styles.detailRow}>
                    <Column style={styles.detailLabelColumn}>
                      <Text style={styles.detailLabel}>{detail.label}</Text>
                    </Column>
                    <Column>
                      <Text style={styles.detailValue}>{detail.value}</Text>
                    </Column>
                  </Row>
                ))}
              </Section>
            ) : null}

            <Button href={props.actionUrl} style={styles.button}>
              {props.actionLabel}
            </Button>
            <Text style={styles.fallbackText}>
              If the button does not open, use this secure link:
              <br />
              <Link href={props.actionUrl} style={styles.fallbackLink}>
                {props.actionUrl}
              </Link>
            </Text>

            {props.expiryNote ? (
              <Section style={styles.notice}>
                <Text style={styles.noticeText}>{props.expiryNote}</Text>
              </Section>
            ) : null}
            {props.preferenceNote ? (
              <Text style={styles.preferenceText}>{props.preferenceNote}</Text>
            ) : null}
          </Section>

          <Section style={styles.footer}>
            <Text style={styles.footerTitle}>BID Hub</Text>
            <Text style={styles.footerText}>
              Practical support for building investment-ready businesses.
            </Text>
            <Hr style={styles.rule} />
            <Text style={styles.legal}>
              This operational email was sent by BID Hub. Please do not reply to
              this message.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

const styles: Record<string, React.CSSProperties> = {
  body: {
    backgroundColor: "#f5f2f3",
    color: "#1f1720",
    fontFamily: "Inter, Arial, sans-serif",
    margin: 0,
    padding: "36px 12px",
  },
  shell: {
    backgroundColor: "#ffffff",
    border: "1px solid #e5d8df",
    borderRadius: "16px",
    boxShadow: "0 18px 45px rgba(78, 25, 49, 0.08)",
    margin: "0 auto",
    maxWidth: "600px",
    overflow: "hidden",
  },
  brandBar: {
    backgroundColor: "#842751",
    height: "8px",
    lineHeight: "8px",
  },
  header: {
    backgroundColor: "#fffdfd",
    borderBottom: "1px solid #eee4e9",
    padding: "22px 36px 18px",
  },
  logo: { display: "block", height: "auto", maxWidth: "176px" },
  platformLabel: {
    color: "#8b7781",
    fontSize: "10px",
    fontWeight: 700,
    letterSpacing: "1px",
    margin: 0,
    textTransform: "uppercase",
  },
  content: { padding: "34px 36px 32px" },
  eyebrow: {
    backgroundColor: "#f8eaf1",
    border: "1px solid #efd2e0",
    borderRadius: "999px",
    color: "#842751",
    display: "inline-block",
    fontSize: "10px",
    fontWeight: 700,
    letterSpacing: "1.2px",
    margin: "0 0 16px",
    padding: "6px 10px",
    textTransform: "uppercase",
  },
  heading: {
    color: "#21191d",
    fontSize: "29px",
    fontWeight: 700,
    letterSpacing: "-0.6px",
    lineHeight: "37px",
    margin: "0 0 20px",
  },
  greeting: {
    color: "#33272d",
    fontSize: "15px",
    fontWeight: 600,
    lineHeight: "24px",
    margin: "0 0 10px",
  },
  text: {
    color: "#675760",
    fontSize: "15px",
    lineHeight: "24px",
    margin: "0 0 16px",
  },
  details: {
    backgroundColor: "#fcf8fa",
    border: "1px solid #eadce3",
    borderRadius: "12px",
    margin: "22px 0 8px",
    padding: "16px 18px 10px",
  },
  detailsTitle: {
    color: "#842751",
    fontSize: "10px",
    fontWeight: 700,
    letterSpacing: "1.1px",
    margin: "0 0 8px",
    textTransform: "uppercase",
  },
  detailRow: { borderTop: "1px solid #eee4e9" },
  detailLabelColumn: { width: "34%" },
  detailLabel: {
    color: "#8b7781",
    fontSize: "12px",
    lineHeight: "18px",
    margin: "10px 12px 10px 0",
  },
  detailValue: {
    color: "#33272d",
    fontSize: "12px",
    fontWeight: 600,
    lineHeight: "18px",
    margin: "10px 0",
  },
  button: {
    backgroundColor: "#842751",
    borderRadius: "9px",
    color: "#ffffff",
    display: "inline-block",
    fontSize: "14px",
    fontWeight: 700,
    margin: "22px 0 14px",
    padding: "14px 22px",
    textDecoration: "none",
  },
  fallbackText: {
    color: "#99858f",
    fontSize: "10px",
    lineHeight: "16px",
    margin: "0 0 22px",
  },
  fallbackLink: { color: "#842751", textDecoration: "underline" },
  notice: {
    backgroundColor: "#f8eaf1",
    border: "1px solid #e9c8d8",
    borderRadius: "10px",
    padding: "13px 15px",
  },
  noticeText: {
    color: "#64213f",
    fontSize: "12px",
    lineHeight: "19px",
    margin: 0,
  },
  preferenceText: {
    color: "#8b7781",
    fontSize: "11px",
    lineHeight: "18px",
    margin: "16px 0 0",
  },
  footer: {
    backgroundColor: "#f1e9ed",
    borderTop: "1px solid #e4d7dd",
    padding: "24px 36px",
  },
  footerTitle: {
    color: "#33272d",
    fontSize: "13px",
    fontWeight: 700,
    margin: "0 0 4px",
  },
  footerText: { color: "#675760", fontSize: "12px", margin: 0 },
  rule: { borderColor: "#ddcdd5", margin: "18px 0 14px" },
  legal: {
    color: "#99858f",
    fontSize: "10px",
    lineHeight: "16px",
    margin: 0,
  },
};
