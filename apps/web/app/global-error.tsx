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
      <body
        style={{
          margin: 0,
          background: '#160f13',
          color: '#f8f4f6',
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
              border: '1px solid rgba(255,255,255,.14)',
              borderRadius: '18px',
              background: '#21181d',
              padding: '40px',
              textAlign: 'center',
              boxSizing: 'border-box',
              boxShadow: '0 30px 90px rgba(0,0,0,.28)',
            }}
          >
            <p style={{ color: '#df4b8c', fontWeight: 700, letterSpacing: '.16em' }}>
              500
            </p>
            <h1 style={{ margin: '12px 0 0', fontSize: '32px' }}>
              BID Hub needs a fresh start
            </h1>
            <p style={{ margin: '16px auto 0', maxWidth: '480px', color: '#c5b8bf', lineHeight: 1.7 }}>
              We recorded the problem. Reload the application to restore your workspace.
            </p>
            <button
              type="button"
              onClick={reset}
              style={{
                marginTop: '28px',
                border: 0,
                borderRadius: '10px',
                background: '#d84384',
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
