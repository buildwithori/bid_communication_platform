import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { routes } from '@/lib/routes';

export function AuthBackToLoginLink() {
  return (
    <Link
      href={routes.auth.login}
      className="mx-auto flex w-fit items-center gap-2 text-sm font-medium text-ink-muted transition-colors hover:text-bid"
    >
      <ArrowLeft className="h-4 w-4" />
      Back to login
    </Link>
  );
}
