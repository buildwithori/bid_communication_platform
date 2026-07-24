import type { Metadata } from 'next';
import { LegalPageShell, type LegalSection } from '@/components/legal/LegalPageShell';

export const metadata: Metadata = {
  title: 'Privacy Policy — BID Hub',
  description: 'How BID Capital Partners collects, uses, and protects BID Hub data.',
};

const sections: LegalSection[] = [
  {
    id: 'introduction',
    title: 'Introduction',
    content: (
      <p>
        BID Capital Partners (&ldquo;we&rdquo;, &ldquo;us&rdquo;, or
        &ldquo;our&rdquo;) operates the platform at{' '}
        <a href="https://bidcpsme.com">bidcpsme.com</a> (the &ldquo;Platform&rdquo;).
        The Platform helps entrepreneurs, trainers, and programme administrators manage
        training, deliverables, mentoring, and reporting. This Privacy Policy explains how
        we collect, use, disclose, and safeguard information when you access the Platform.
        By using the Platform, you consent to the practices described in this policy.
      </p>
    ),
  },
  {
    id: 'information-we-collect',
    title: 'Information We Collect',
    content: (
      <>
        <p>We may collect the following categories of information:</p>
        <ul>
          <li>
            <strong>Account information:</strong> name, email address, securely hashed
            password, phone number, timezone, and role.
          </li>
          <li>
            <strong>Profile information:</strong> business name, sector, stage, country,
            specialisms, and details supplied in entrepreneur or trainer profiles.
          </li>
          <li>
            <strong>Programme data:</strong> training progress, content ratings,
            deliverables, session bookings, periodic updates, goals, and funding
            information.
          </li>
          <li>
            <strong>Integration data:</strong> calendar connection details and availability
            information needed to schedule sessions. We do not ask you to provide your
            Google password.
          </li>
          <li>
            <strong>Usage data:</strong> log data, device information, browser type, pages
            visited, and diagnostic information collected when you use the Platform.
          </li>
          <li>
            <strong>Communications:</strong> correspondence and messages sent through or
            about programme activities.
          </li>
        </ul>
      </>
    ),
  },
  {
    id: 'how-we-use-information',
    title: 'How We Use Your Information',
    content: (
      <>
        <p>We use collected information to:</p>
        <ul>
          <li>Provide, operate, secure, and maintain the Platform.</li>
          <li>Create and manage accounts and programme access.</li>
          <li>Process training activity, deliverables, ratings, and session bookings.</li>
          <li>Send account, programme, session, reminder, and service communications.</li>
          <li>Generate programme reports and improve Platform features and performance.</li>
          <li>Detect and address technical issues, misuse, fraud, and security concerns.</li>
          <li>Comply with applicable legal obligations.</li>
        </ul>
      </>
    ),
  },
  {
    id: 'sharing',
    title: 'How We Share Your Information',
    content: (
      <>
        <p>We do not sell your personal information. We may share information with:</p>
        <ul>
          <li>
            <strong>Service providers:</strong> providers supporting hosting, storage,
            video, calendars, analytics, and email delivery under appropriate obligations.
          </li>
          <li>
            <strong>Programme participants and partners:</strong> authorised trainers,
            mentors, administrators, and programme partners, limited to information needed
            to deliver and oversee relevant programmes.
          </li>
          <li>
            <strong>Legal authorities:</strong> when required by law, court order, or to
            protect rights, safety, and property.
          </li>
          <li>
            <strong>Business transfers:</strong> in connection with a merger, acquisition,
            restructuring, or asset sale, subject to appropriate safeguards.
          </li>
        </ul>
      </>
    ),
  },
  {
    id: 'retention',
    title: 'Data Retention',
    content: (
      <p>
        We retain personal information while your account is active and as needed to
        provide Platform services. Certain records may be retained after account closure
        when required by law or for legitimate purposes such as security, auditing,
        programme reporting, dispute resolution, and legal compliance.
      </p>
    ),
  },
  {
    id: 'security',
    title: 'Data Security',
    content: (
      <p>
        We use reasonable technical and organisational safeguards, including encrypted
        transmission, access controls, monitoring, and security reviews. No transmission or
        storage method is completely secure, so we cannot guarantee absolute security.
      </p>
    ),
  },
  {
    id: 'your-rights',
    title: 'Your Rights',
    content: (
      <p>
        Depending on your jurisdiction, you may have rights to access, correct, update, or
        delete personal information, withdraw consent, or object to certain processing.
        Contact <a href="mailto:info@bidcpsme.com">info@bidcpsme.com</a> to make a request.
        We will respond in accordance with applicable law and may need to verify your
        identity first.
      </p>
    ),
  },
  {
    id: 'cookies',
    title: 'Cookies and Similar Technologies',
    content: (
      <p>
        The Platform uses cookies and similar technologies to maintain secure sessions,
        remember preferences, and support performance and diagnostics. You can control
        cookies through your browser settings, but disabling essential cookies may prevent
        parts of the Platform from working.
      </p>
    ),
  },
  {
    id: 'third-parties',
    title: 'Third-Party Services and Links',
    content: (
      <p>
        The Platform may connect to third-party services or contain links to third-party
        websites. Their handling of information is governed by their own terms and privacy
        policies. We encourage you to review those policies before using the services.
      </p>
    ),
  },
  {
    id: 'children',
    title: 'Children’s Privacy',
    content: (
      <p>
        The Platform is not intended for individuals under 18. We do not knowingly collect
        personal information from children. If you believe a child has provided personal
        information, contact us so we can investigate and take appropriate action.
      </p>
    ),
  },
  {
    id: 'international-transfers',
    title: 'International Transfers',
    content: (
      <p>
        Information may be transferred to and processed in countries other than your own.
        Where this occurs, we take steps designed to apply appropriate safeguards in
        accordance with this Privacy Policy and applicable law.
      </p>
    ),
  },
  {
    id: 'changes',
    title: 'Changes to This Policy',
    content: (
      <p>
        We may update this Privacy Policy from time to time. Changes are effective when
        posted on this page with a revised &ldquo;Last updated&rdquo; date. We encourage you
        to review this page periodically.
      </p>
    ),
  },
  {
    id: 'contact',
    title: 'Contact Us',
    content: (
      <p>
        If you have questions about this Privacy Policy or how BID Hub handles information,
        contact <a href="mailto:info@bidcpsme.com">info@bidcpsme.com</a>.
      </p>
    ),
  },
];

export default function PrivacyPolicyPage() {
  return (
    <LegalPageShell
      title="Privacy Policy"
      description="A clear explanation of the information BID Hub uses, why it is needed, and the choices available to you."
      lastUpdated="July 21, 2026"
      sections={sections}
    />
  );
}
