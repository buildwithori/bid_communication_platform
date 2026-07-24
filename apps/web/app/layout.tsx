import type { Metadata } from 'next';
import { AppProviders } from '@/app/providers';
import { AppToaster } from '@/components/theme/AppToaster';
import './globals.css';

export const metadata: Metadata = {
  title: 'BID Hub — Entrepreneur & Admin Platform',
  description:
    'BID Hub — a platform for entrepreneurs and programme administrators to manage training, deliverables, mentoring, and reporting.',
  icons: {
    icon: '/BIDCP_ISOTYPE_(1).png',
    apple: '/BIDCP_ISOTYPE_(1).png',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="font-sans antialiased">
        <AppProviders>
          {children}
          <AppToaster />
        </AppProviders>
      </body>
    </html>
  );
}
