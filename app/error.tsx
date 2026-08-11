'use client';

import { useEffect } from 'react';

const isDev = process.env.NODE_ENV === 'development';

export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[root-error]', error);
  }, [error]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-[var(--bg-app,#fafafb)] text-[var(--text-main,#151b26)]">
      <h1 className="text-lg font-semibold mb-2">Erreur ANS ORION</h1>
      <p className="text-sm text-[var(--text-muted,#4b5565)] mb-4 text-center max-w-md">
        {isDev
          ? error.message
          : 'Impossible d’afficher cette page. Consultez le terminal Next.js.'}
      </p>
      {isDev && error.stack && (
        <pre className="mb-4 max-w-3xl w-full overflow-auto rounded-lg border p-3 text-[11px] bg-white text-[#334155] whitespace-pre-wrap">
          {error.stack}
        </pre>
      )}
      <div className="flex gap-3 flex-wrap justify-center">
        <button
          type="button"
          onClick={() => reset()}
          className="px-4 py-2 rounded-lg bg-[#e7194f] text-white text-sm font-semibold"
        >
          Réessayer
        </button>
        <a href="/dev-health" className="px-4 py-2 rounded-lg border text-sm">
          Diagnostic
        </a>
        <a href="/login" className="px-4 py-2 rounded-lg border text-sm">
          Connexion
        </a>
      </div>
    </div>
  );
}
