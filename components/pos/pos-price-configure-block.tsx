'use client';

import Link from 'next/link';
import { Settings2, ArrowLeft } from 'lucide-react';

type Props = {
  articleName?: string;
  reason?: string | null;
  adminHref?: string;
  backHref: string;
  backLabel: string;
};

export function PosPriceConfigureBlock({
  articleName,
  reason,
  adminHref = '/administration/catalogue-pos',
  backHref,
  backLabel,
}: Props) {
  return (
    <div className="max-w-lg mx-auto text-center py-16 px-6">
      <div className="inline-flex items-center justify-center w-14 h-14 rounded-lg bg-amber-500/15 text-amber-300 mb-4">
        <Settings2 size={28} />
      </div>
      <h2 className="text-xl font-semibold mb-2">Prix à configurer</h2>
      {articleName && (
        <p className="text-sm text-muted-foreground mb-1">{articleName}</p>
      )}
      <p className="text-sm text-amber-200/90 mb-6">
        {reason ?? 'Ce article est visible au POS mais son profil tarifaire n’est pas publié.'}
      </p>
      <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
        <Link
          href={adminHref}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-white text-sm font-semibold hover:brightness-110 transition-colors"
        >
          Corriger dans Administration
        </Link>
        <button
          type="button"
          onClick={() => { window.location.href = backHref; }}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-border text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft size={14} />
          {backLabel}
        </button>
      </div>
    </div>
  );
}
