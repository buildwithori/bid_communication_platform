import Link from 'next/link';
import type { Route } from 'next';

const legalLinks = [
  { href: '/terms-of-service', label: 'Terms of Service' },
  { href: '/privacy-policy', label: 'Privacy Policy' },
] as const;

export function PublicLegalFooter({ compact = false }: { compact?: boolean }) {
  const currentYear = new Date().getFullYear();

  return (
    <footer
      className={
        compact
          ? 'mt-6 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs text-muted-foreground'
          : 'border-t border-border bg-card/60'
      }
    >
      <div
        className={
          compact
            ? 'contents'
            : 'mx-auto flex w-full max-w-7xl flex-col gap-3 px-5 py-6 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-8'
        }
      >
        <p>&copy; {currentYear} BID Capital Partners. All rights reserved.</p>
        <nav aria-label="Legal">
          <ul className="flex flex-wrap items-center gap-x-5 gap-y-2">
            {legalLinks.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href as Route}
                  className="transition-colors hover:text-primary focus-visible:text-primary focus-visible:outline-none"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </footer>
  );
}
