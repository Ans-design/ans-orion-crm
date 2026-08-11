'use client';

import { useEffect } from 'react';

const isDev = process.env.NODE_ENV === 'development';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[global-error]', error);
    void import('@/lib/monitoring/sentry-client')
      .then(({ initSentryClient, captureClientException }) => {
        initSentryClient();
        captureClientException(error, { source: 'global-error', digest: error.digest });
      })
      .catch(() => {});
  }, [error]);

  return (
    <html lang="fr">
      <body style={{ margin: 0, fontFamily: 'system-ui, sans-serif', background: '#0a1424', color: '#f8f4ee' }}>
        <main style={{ maxWidth: 720, margin: '0 auto', padding: '2rem 1.5rem' }}>
          <h1 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>Erreur critique ANS ORION</h1>
          <p style={{ color: '#bfc7d8', fontSize: '0.875rem', lineHeight: 1.5 }}>
            Le layout racine a échoué. Consultez la console navigateur et le terminal Next.js pour le détail.
          </p>
          {isDev && (
            <pre
              style={{
                marginTop: '1rem',
                padding: '1rem',
                borderRadius: 8,
                background: '#121e31',
                border: '1px solid rgba(196,210,235,0.12)',
                fontSize: '0.75rem',
                overflow: 'auto',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
              }}
            >
              {error.message}
              {error.stack ? `\n\n${error.stack}` : ''}
              {error.digest ? `\n\ndigest: ${error.digest}` : ''}
            </pre>
          )}
          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.25rem', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => reset()}
              style={{
                padding: '0.5rem 1rem',
                borderRadius: 8,
                border: 'none',
                background: '#e7194f',
                color: '#fff',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Réessayer
            </button>
            <a
              href="/dev-health"
              style={{
                padding: '0.5rem 1rem',
                borderRadius: 8,
                border: '1px solid rgba(196,210,235,0.2)',
                color: '#f8f4ee',
                textDecoration: 'none',
                fontSize: '0.875rem',
              }}
            >
              Diagnostic local
            </a>
            <a
              href="/login"
              style={{
                padding: '0.5rem 1rem',
                borderRadius: 8,
                border: '1px solid rgba(196,210,235,0.2)',
                color: '#f8f4ee',
                textDecoration: 'none',
                fontSize: '0.875rem',
              }}
            >
              Connexion
            </a>
          </div>
        </main>
      </body>
    </html>
  );
}
