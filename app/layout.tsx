import type { Metadata } from 'next';
import { Sora, DM_Mono } from 'next/font/google';
import { Toaster } from '@/components/ui/sonner';
import './globals.css';

const sora = Sora({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600'],
  variable: '--font-sora',
  display: 'swap',
});

const dmMono = DM_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-dm-mono',
  display: 'swap',
});

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
    <html lang="en" className={`${sora.variable} ${dmMono.variable}`} suppressHydrationWarning>
      <body className="font-sans antialiased">
        {children}
        <Toaster richColors position="bottom-right" />
      </body>
    </html>
  );
}
