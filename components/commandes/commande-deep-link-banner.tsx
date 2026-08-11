'use client';

import Link from 'next/link';
import { X, FolderOpen } from 'lucide-react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import type { CommandeDeepLinkInfo } from '@/lib/hooks/use-commande-deep-link';

type Props = {
  info: CommandeDeepLinkInfo;
};

export function CommandeDeepLinkBanner({ info }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  if (!info) return null;

  const clearFilter = () => {
    const p = new URLSearchParams(searchParams.toString());
    p.delete('commande');
    const qs = p.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname);
  };

  return (
    <div
      className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 rounded-lg border text-xs"
      style={{ background: 'rgba(204,0,51,0.08)', borderColor: 'rgba(204,0,51,0.25)' }}
    >
      <div className="flex items-center gap-2 min-w-0">
        <FolderOpen size={14} className="text-primary shrink-0" />
        <span className="text-muted-foreground">Dossier commande</span>
        <span className="font-bold font-mono text-primary">{info.numero}</span>
        <span className="text-muted-foreground truncate hidden sm:inline">— {info.article}</span>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <Link
          href={`/commandes/${info.id}`}
          className="font-semibold text-[var(--ans-cyan)] hover:underline"
        >
          Fiche 360°
        </Link>
        <button
          type="button"
          onClick={clearFilter}
          className="p-1 rounded-lg hover:bg-surface-hover text-muted-foreground"
          aria-label="Retirer le filtre commande"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
}
