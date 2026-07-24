'use client';

import { useEffect } from 'react';
import { reportClientError } from '@/lib/client-error-reporting';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    reportClientError(error, 'global');
  }, [error]);

  return (
    <html lang="en">
      <head>
        <style>{`
          :root {
            color-scheme: light;
            --error-page-bg: #f7f6f3;
            --error-panel-bg: #ffffff;
            --error-ink: #1a1a1a;
            --error-muted: #66615f;
            --error-border: rgba(26, 26, 26, 0.14);
            --error-primary: #842751;
            --error-shadow: rgba(49, 28, 39, 0.14);
          }
          html.dark {
            color-scheme: dark;
            --error-page-bg: #160f13;
            --error-panel-bg: #21181d;
            --error-ink: #f8f4f6;
            --error-muted: #c5b8bf;
            --error-border: rgba(255, 255, 255, 0.14);
            --error-primary: #df4b8c;
            --error-shadow: rgba(0, 0, 0, 0.3);
          }
          @media (prefers-color-scheme: dark) {
            html:not(.light) {
              color-scheme: dark;
              --error-page-bg: #160f13;
              --error-panel-bg: #21181d;
              --error-ink: #f8f4f6;
              --error-muted: #c5b8bf;
              --error-border: rgba(255, 255, 255, 0.14);
              --error-primary: #df4b8c;
              --error-shadow: rgba(0, 0, 0, 0.3);
            }
          }
        `}</style>
      </head>
      <body
        style={{
          margin: 0,
          background: 'var(--error-page-bg)',
          color: 'var(--error-ink)',
          fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif',
        }}
      >
        <main
          style={{
            minHeight: '100vh',
            display: 'grid',
            placeItems: 'center',
            padding: '24px',
            boxSizing: 'border-box',
          }}
        >
          <section
            style={{
              width: 'min(100%, 620px)',
              border: '1px solid var(--error-border)',
              borderRadius: '18px',
              background: 'var(--error-panel-bg)',
              padding: '40px',
              textAlign: 'center',
              boxSizing: 'border-box',
              boxShadow: '0 30px 90px var(--error-shadow)',
            }}
          >
            <p style={{ color: 'var(--error-primary)', fontWeight: 700, letterSpacing: '.16em' }}>
              500
            </p>
            <h1 style={{ margin: '12px 0 0', fontSize: '32px' }}>
              BID Hub needs a fresh start
            </h1>
            <p style={{ margin: '16px auto 0', maxWidth: '480px', color: 'var(--error-muted)', lineHeight: 1.7 }}>
              We recorded the problem. Reload the application to restore your workspace.
            </p>
            <button
              type="button"
              onClick={reset}
              style={{
                marginTop: '28px',
                border: 0,
                borderRadius: '10px',
                background: 'var(--error-primary)',
                color: 'white',
                padding: '12px 20px',
                font: 'inherit',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Reload BID Hub
            </button>
          </section>
        </main>
      </body>
    </html>
  );
}
