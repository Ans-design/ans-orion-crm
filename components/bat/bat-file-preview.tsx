'use client';

import { useEffect, useMemo, useState } from 'react';
import { FileText, Image as ImageIcon, Loader2 } from 'lucide-react';
import { needsAsyncPreview } from '@/lib/file-preview/preview-utils';

type Props = {
  fileId: string;
  name?: string;
  mimeType?: string;
  className?: string;
  compact?: boolean;
};

/** Aperçu BAT / fichier pro — natif ou preview serveur async (AI/PSD/CDR/EPS). */
export function BatFilePreview({ fileId, name, mimeType, className = '', compact = false }: Props) {
  const src = `/api/files/${fileId}`;
  const previewSrc = `/api/files/${fileId}/preview`;
  const wantsServerPreview = useMemo(
    () => needsAsyncPreview(name ?? '') || /\.(ai|psd|cdr|eps)$/i.test(name ?? ''),
    [name],
  );
  const isImage = useMemo(
    () =>
      !wantsServerPreview &&
      ((mimeType?.startsWith('image/') ?? false) ||
      /\.(png|jpe?g|gif|webp|svg)$/i.test(name ?? '')),
    [mimeType, name, wantsServerPreview],
  );
  const isPdf = useMemo(
    () => mimeType === 'application/pdf' || /\.pdf$/i.test(name ?? ''),
    [mimeType, name],
  );

  const [previewReady, setPreviewReady] = useState(!wantsServerPreview);
  const [previewPending, setPreviewPending] = useState(wantsServerPreview);

  useEffect(() => {
    if (!wantsServerPreview || !fileId) return;
    let cancelled = false;
    let attempts = 0;

    const poll = async () => {
      while (!cancelled && attempts < 12) {
        attempts += 1;
        const res = await fetch(previewSrc, { credentials: 'same-origin' });
        if (res.status === 200) {
          if (!cancelled) {
            setPreviewReady(true);
            setPreviewPending(false);
          }
          return;
        }
        if (res.status !== 202) break;
        await new Promise((r) => setTimeout(r, 500));
      }
      if (!cancelled) setPreviewPending(false);
    };

    void poll();
    return () => { cancelled = true; };
  }, [fileId, previewSrc, wantsServerPreview]);

  if (!fileId) return null;

  if (wantsServerPreview) {
    if (previewPending) {
      return (
        <div className={`flex items-center justify-center gap-2 rounded-[7px] border border-border bg-muted/30 text-xs text-muted-foreground ${compact ? 'h-40' : 'h-48'} ${className}`}>
          <Loader2 size={16} className="animate-spin" />
          Génération aperçu serveur…
        </div>
      );
    }
    if (previewReady) {
      return (
        <div className={`rounded-[7px] border border-border overflow-hidden bg-surface-card/40 ${className}`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={previewSrc}
            alt={name ?? 'Aperçu fichier pro'}
            className={compact ? 'max-h-40 w-full object-contain' : 'max-h-64 w-full object-contain'}
          />
        </div>
      );
    }
  }

  if (isImage) {
    return (
      <div className={`rounded-[7px] border border-border overflow-hidden bg-surface-card/40 ${className}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={name ?? 'Aperçu BAT'}
          className={compact ? 'max-h-40 w-full object-contain' : 'max-h-64 w-full object-contain'}
        />
      </div>
    );
  }

  if (isPdf) {
    return (
      <div className={`rounded-[7px] border border-border overflow-hidden bg-card ${className}`}>
        <iframe
          src={src}
          title={name ?? 'Aperçu PDF'}
          className={compact ? 'w-full h-48' : 'w-full h-72'}
        />
      </div>
    );
  }

  return (
    <a
      href={src}
      target="_blank"
      rel="noopener noreferrer"
      className={`flex items-center gap-2 text-xs text-[var(--ans-cyan)] hover:underline px-2 py-2 rounded-[7px] border border-border ${className}`}
    >
      <FileText size={14} />
      {name ?? 'Ouvrir le fichier'}
    </a>
  );
}

export function BatFilePreviewPlaceholder({ label = 'Aucun fichier joint' }: { label?: string }) {
  return (
    <div className="rounded-lg border border-dashed border-border px-3 py-6 text-center text-xs text-muted-foreground flex flex-col items-center gap-1">
      <ImageIcon size={18} className="opacity-40" />
      {label}
    </div>
  );
}
