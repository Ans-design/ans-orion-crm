'use client';

import { useMemo } from 'react';
import { QrCode } from 'lucide-react';
import { cn } from '@/lib/utils';

type Props = {
  commandeId: string;
  numero: string;
  compact?: boolean;
  variant?: 'default' | 'card';
};

function qrImageUrl(targetUrl: string, size: number) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&margin=6&color=cc0033&data=${encodeURIComponent(targetUrl)}`;
}

/** QR code commande — grand, scannable, ouvre le dossier. */
export function CommandeQrBadge({ commandeId, numero, compact = false, variant = 'default' }: Props) {
  const targetUrl = useMemo(() => {
    if (typeof window === 'undefined') return `/commandes/${commandeId}`;
    return `${window.location.origin}/commandes/${commandeId}`;
  }, [commandeId]);

  const size = compact ? 112 : variant === 'card' ? 128 : 140;
  const qrSrc = qrImageUrl(targetUrl, size);

  if (compact) {
    return (
      <a
        href={targetUrl}
        target="_blank"
        rel="noopener noreferrer"
        className={cn(
          'inline-flex items-center gap-2.5 h-auto min-h-8 px-1.5 py-1 rounded-[7px]',
          'text-xs font-semibold text-[var(--ans-red-500)] hover:bg-[#fff5f7] transition-colors',
        )}
        title={`Scanner · ${numero}`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={qrSrc}
          alt={`QR ${numero}`}
          width={112}
          height={112}
          className="h-[112px] w-[112px] rounded-[7px] border border-[#f0d4dc] bg-white shadow-[0_4px_14px_rgba(204,0,51,0.12)]"
        />
        <span className="hidden sm:flex flex-col items-start leading-tight pr-1">
          <span className="inline-flex items-center gap-1 font-extrabold uppercase tracking-wide text-[10px]">
            <QrCode size={12} strokeWidth={2} aria-hidden /> QR
          </span>
          <span className="font-mono text-[10px] text-muted-foreground">{numero}</span>
          <span className="text-[9px] font-medium text-[#97a2b4]">Scanner</span>
        </span>
      </a>
    );
  }

  if (variant === 'card') {
    return (
      <a
        href={targetUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="flex flex-col items-center justify-center w-[140px] p-3 rounded-[7px] bg-[var(--orion-surface-soft)] text-center hover:bg-[var(--orion-surface-hover)] transition-colors"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={qrSrc}
          alt={`QR ${numero}`}
          width={128}
          height={128}
          className="rounded-[7px] border border-[#f0d4dc] bg-white"
        />
        <p className="orion-text-code mt-2 text-muted-foreground truncate w-full">{numero}</p>
        <p className="orion-text-meta">Scanner → dossier</p>
      </a>
    );
  }

  return (
    <div className="flex flex-col items-center w-[148px] p-3 rounded-[7px] bg-[var(--orion-surface-soft)] text-center">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={qrSrc}
        alt={`QR code commande ${numero}`}
        width={140}
        height={140}
        className="rounded-[7px] border border-[#f0d4dc] bg-white"
      />
      <p className="orion-text-code mt-2 text-muted-foreground truncate w-full">{numero}</p>
      <p className="orion-text-meta">Scanner → dossier</p>
    </div>
  );
}
