import type { Metadata } from 'next';
import type { Route } from 'next';
import Link from 'next/link';
import { LegalPageShell, type LegalSection } from '@/components/legal/LegalPageShell';

export const metadata: Metadata = {
  title: 'Terms of Service — BID Hub',
  description: 'The terms that govern access to and use of BID Hub.',
};

const sections: LegalSection[] = [
  {
    id: 'acceptance',
    title: 'Acceptance of Terms',
    content: (
      <p>
        These Terms of Service (&ldquo;Terms&rdquo;) govern your access to and use of the
        platform at{' '}
        <a href="https://bidcpsme.com">bidcpsme.com</a> (the &ldquo;Platform&rdquo;),
        operated by BID Capital Partners (&ldquo;we&rdquo;, &ldquo;us&rdquo;, or
        &ldquo;our&rdquo;). By creating an account or using the Platform, you agree to be
        bound by these Terms. If you do not agree, you may not access or use the Platform.
      </p>
    ),
  },
  {
    id: 'eligibility',
    title: 'Eligibility and Accounts',
    content: (
      <p>
        You must be at least 18 years old and legally able to enter into contracts to use
        the Platform. You are responsible for maintaining the confidentiality of your
        account credentials and for all activity under your account. Notify us immediately
        at <a href="mailto:info@bidcpsme.com">info@bidcpsme.com</a> if you discover
        unauthorised use or a security breach.
      </p>
    ),
  },
  {
    id: 'roles',
    title: 'User Roles and Responsibilities',
    content: (
      <>
        <p>The Platform supports several roles. Depending on your assigned role:</p>
        <ul>
          <li>
            <strong>Entrepreneurs</strong> may enrol in programmes, submit deliverables,
            book mentoring sessions, and report funding updates.
          </li>
          <li>
            <strong>Trainers</strong> may deliver programme modules, review submissions,
            and schedule sessions.
          </li>
          <li>
            <strong>Administrators</strong> may manage users, programmes, content, and
            reporting.
          </li>
        </ul>
        <p>
          You agree to use the Platform only for its intended educational and
          programme-management purposes and to provide accurate, current information in all
          submissions and communications.
        </p>
      </>
    ),
  },
  {
    id: 'acceptable-use',
    title: 'Acceptable Use',
    content: (
      <>
        <p>You agree not to:</p>
        <ul>
          <li>Use the Platform for any unlawful, fraudulent, or abusive purpose.</li>
          <li>Upload viruses, malware, or code that could harm the Platform.</li>
          <li>
            Attempt to gain unauthorised access to the Platform, its systems, or another
            user&apos;s data.
          </li>
          <li>Interfere with the Platform&apos;s servers, security, or operation.</li>
          <li>
            Scrape, copy, or redistribute Platform content without authorisation.
          </li>
          <li>Transmit unsolicited communications or promotional material.</li>
        </ul>
      </>
    ),
  },
  {
    id: 'user-content',
    title: 'User Content',
    content: (
      <p>
        You retain ownership of content you submit to the Platform (&ldquo;User
        Content&rdquo;), including deliverables, updates, and profile information. By
        submitting User Content, you grant BID Capital Partners a non-exclusive,
        royalty-free licence to host, store, use, display, and process it for the purpose
        of operating the Platform and delivering programmes. You represent that you have
        all rights necessary to submit your User Content and that it does not infringe any
        third-party rights.
      </p>
    ),
  },
  {
    id: 'intellectual-property',
    title: 'Intellectual Property',
    content: (
      <p>
        The Platform, its design, features, and all content provided by BID Capital Partners
        are the intellectual property of BID Capital Partners or its licensors and are
        protected by applicable laws. You may not copy, modify, distribute, or create
        derivative works from the Platform without our prior written consent.
      </p>
    ),
  },
  {
    id: 'programme-content',
    title: 'Programme Content',
    content: (
      <p>
        Programme materials, modules, and resources are provided for educational purposes
        as part of programmes offered through the Platform. BID Capital Partners may
        update, modify, or discontinue programme content at any time without notice.
      </p>
    ),
  },
  {
    id: 'fees',
    title: 'Fees and Payments',
    content: (
      <p>
        Some programmes or services may require payment. Where applicable, fees will be
        disclosed before enrolment. Paid services are governed by the payment terms
        presented at purchase. Unless otherwise stated, fees are non-refundable except
        where required by law.
      </p>
    ),
  },
  {
    id: 'disclaimers',
    title: 'Disclaimers',
    content: (
      <p>
        The Platform is provided on an &ldquo;as is&rdquo; and &ldquo;as available&rdquo;
        basis. To the fullest extent permitted by law, BID Capital Partners disclaims all
        warranties, express or implied, including merchantability, fitness for a particular
        purpose, and non-infringement. We do not warrant that the Platform will be
        uninterrupted, error-free, or secure, or that a programme will produce a specific
        outcome.
      </p>
    ),
  },
  {
    id: 'liability',
    title: 'Limitation of Liability',
    content: (
      <p>
        To the fullest extent permitted by law, BID Capital Partners and its affiliates,
        officers, employees, and partners shall not be liable for indirect, incidental,
        special, consequential, or punitive damages, or any loss of profits, data, or
        goodwill arising from your access to or use of the Platform, even if advised of the
        possibility of such damages. Our aggregate liability for any claim relating to the
        Platform shall not exceed the amount you paid us, if any, in the twelve months
        preceding the claim.
      </p>
    ),
  },
  {
    id: 'indemnification',
    title: 'Indemnification',
    content: (
      <p>
        You agree to indemnify and hold harmless BID Capital Partners and its affiliates
        from claims, damages, losses, and expenses, including reasonable legal fees, arising
        from your User Content, violation of these Terms, or misuse of the Platform.
      </p>
    ),
  },
  {
    id: 'termination',
    title: 'Termination',
    content: (
      <p>
        We may suspend or terminate your access to the Platform at any time, with or without
        cause or notice, including for violation of these Terms. You may stop using the
        Platform at any time. Upon termination, all licences granted to you under these
        Terms cease immediately.
      </p>
    ),
  },
  {
    id: 'privacy',
    title: 'Privacy',
    content: (
      <p>
        Our handling of personal information is described in our{' '}
        <Link href={'/privacy-policy' as Route}>Privacy Policy</Link>, which is incorporated
        into these Terms by reference.
      </p>
    ),
  },
  {
    id: 'governing-law',
    title: 'Governing Law',
    content: (
      <p>
        These Terms are governed by and construed in accordance with applicable laws,
        without regard to conflict-of-law principles. Disputes arising under these Terms
        shall be submitted to the exclusive jurisdiction of the competent courts.
      </p>
    ),
  },
  {
    id: 'changes',
    title: 'Changes to These Terms',
    content: (
      <p>
        We may revise these Terms from time to time. The current version will be posted on
        this page with a revised &ldquo;Last updated&rdquo; date. Your continued use of the
        Platform after changes are posted constitutes acceptance of the updated Terms.
      </p>
    ),
  },
  {
    id: 'contact',
    title: 'Contact Us',
    content: (
      <p>
        If you have questions about these Terms, contact us at{' '}
        <a href="mailto:info@bidcpsme.com">info@bidcpsme.com</a>.
      </p>
    ),
  },
];

export default function TermsOfServicePage() {
  return (
    <LegalPageShell
      title="Terms of Service"
      description="The rules and responsibilities that keep BID Hub useful, secure, and fair for entrepreneurs, trainers, and administrators."
      lastUpdated="July 21, 2026"
      sections={sections}
    />
  );
}
