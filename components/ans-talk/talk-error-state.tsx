'use client';

import { useState } from 'react';
import { AlertCircle, ChevronDown, ChevronUp, RefreshCw } from 'lucide-react';
import type { TalkErrorDisplay } from '@/lib/ans-talk/error-utils';

type Props = {
  error: TalkErrorDisplay;
  demoMode?: boolean;
  onRetry: () => void;
};

export function TalkErrorState({ error, demoMode, onRetry }: Props) {
  const [showTechnical, setShowTechnical] = useState(false);

  if (demoMode) return null;

  return (
    <div
      className="talk-error-banner mx-4 mt-3 mb-1 rounded-lg border border-red-200 bg-red-50 px-4 py-3 dark:border-red-500/25 dark:bg-red-950/40"
      role="alert"
    >
      <div className="flex items-start gap-3">
        <AlertCircle size={18} className="shrink-0 text-red-600 mt-0.5 dark:text-red-400" />
        <div className="min-w-0 flex-1 text-left">
          <p className="text-sm font-semibold text-red-900 dark:text-red-100">{error.title}</p>
          <p className="mt-0.5 text-xs leading-relaxed text-red-700 dark:text-red-200/80">{error.description}</p>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={onRetry}
              className="inline-flex items-center gap-1.5 rounded-md bg-red-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-red-700 dark:bg-red-500/20 dark:text-red-100 dark:hover:bg-red-500/30"
            >
              <RefreshCw size={13} /> Réessayer
            </button>
            <button
              type="button"
              onClick={() => setShowTechnical((v) => !v)}
              className="text-[11px] text-red-600/80 underline-offset-2 hover:text-red-700 hover:underline dark:text-red-300/70 dark:hover:text-red-200"
            >
              {showTechnical ? 'Masquer le détail' : 'Voir détail technique'}
              {showTechnical ? <ChevronUp size={12} className="inline ml-0.5" /> : <ChevronDown size={12} className="inline ml-0.5" />}
            </button>
          </div>
          {showTechnical && (
            <pre className="mt-2 max-h-24 overflow-auto rounded-md bg-white/70 p-2 orion-text-code text-red-700/80 whitespace-pre-wrap break-all dark:bg-surface-card-elevated dark:text-red-200/60">
              {error.technical}
            </pre>
          )}
        </div>
      </div>
    </div>
  );
}
