import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'BID Management Console — Sign In',
};

export default function AdminAuthLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
