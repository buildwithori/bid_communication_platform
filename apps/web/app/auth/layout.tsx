import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'BID Hub — Auth',
};

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return children;
}
