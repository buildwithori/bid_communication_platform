import type { Metadata } from 'next';
import { AuthThemeProvider } from '@/components/auth/AuthThemeProvider';

export const metadata: Metadata = {
  title: 'BID Hub — Auth',
};

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <AuthThemeProvider>{children}</AuthThemeProvider>;
}
