'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  Image, FileText, Link2, Film, Download, ChevronRight, X, ExternalLink, Loader2, LayoutGrid,
} from 'lucide-react';
import type { GalleryAttachment, GalleryLink } from '@/lib/messaging/attachment-service';
import { formatBytes, formatTalkDateTime, fileIcon, TALK_R, TALK_SHELL } from './ans-talk-utils';

type GalleryTab = 'all' | 'photo' | 'document' | 'media' | 'link';

type GalleryData = {
  attachments: GalleryAttachment[];
  links: GalleryLink[];
  stats: { photos: number; documents: number; media: number; links: number; total: number };
};

const TABS: { id: GalleryTab; label: string; icon: typeof Image }[] = [
  { id: 'all', label: 'Tout', icon: LayoutGrid },
  { id: 'photo', label: 'Photos', icon: Image },
  { id: 'document', label: 'Docs', icon: FileText },
  { id: 'media', label: 'Médias', icon: Film },
  { id: 'link', label: 'Liens', icon: Link2 },
];

type Props = {
  conversationId: string;
  refreshKey?: number;
  onStatusChange?: (id: string, status: string) => void;
  userRole?: string;
  /** Intégré dans l’onglet contexte — sans bordure / titre redondant */
  embedded?: boolean;
};

const STATUS_OPTIONS = ['reçu', 'validé', 'refusé', 'archivé'] as const;

export function AnsTalkMediaGallery({ conversationId, refreshKey = 0, onStatusChange, userRole, embedded }: Props) {
  const [tab, setTab] = useState<GalleryTab>('all');
  const [data, setData] = useState<GalleryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [detail, setDetail] = useState<GalleryAttachment | null>(null);

  const load = useCallback(async () => {
    if (!conversationId) return;
    setLoading(true);
    setError(null);
    try {
      const r = await fetch(`/api/messaging/conversations/${conversationId}/gallery`, {
        credentials: 'include',
        cache: 'no-store',
      });
      if (!r.ok) throw new Error('Chargement impossible');
      setData(await r.json());
    } catch {
      setError('Galerie indisponible');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [conversationId]);

  useEffect(() => {
    load();
  }, [load, refreshKey]);

  const attachments = data?.attachments ?? [];
  const links = data?.links ?? [];
  const stats = data?.stats;

  const filteredAttachments =
    tab === 'all' || tab === 'link'
      ? attachments
      : attachments.filter((a) => a.category === tab);

  const countForTab = (id: GalleryTab) => {
    if (!stats) return 0;
    if (id === 'all') return stats.total;
    if (id === 'photo') return stats.photos;
    if (id === 'document') return stats.documents;
    if (id === 'media') return stats.media;
    if (id === 'link') return stats.links;
    return 0;
  };

  return (
    <section className={embedded ? '' : 'border-t pt-4'} style={embedded ? undefined : { borderColor: TALK_SHELL.border }}>
      {!embedded && (
        <div className="flex items-center justify-between mb-2">
          <h4 className="orion-text-label flex items-center gap-1">
            Médias & liens
            <ChevronRight size={12} className="text-muted-foreground" />
          </h4>
          {stats && (
            <span className="orion-text-meta">{stats.total + stats.links} élément(s)</span>
          )}
        </div>
      )}

      <div className="talk-gallery-tabs" role="tablist" aria-label="Filtrer la galerie">
        {TABS.map((t) => {
          const Icon = t.icon;
          const count = countForTab(t.id);
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setTab(t.id)}
              className={`talk-gallery-tab${active ? ' is-active' : ''}`}
              title={`${t.label}${count > 0 ? ` (${count})` : ''}`}
            >
              <Icon size={12} strokeWidth={1.9} aria-hidden />
              <span className="talk-gallery-tab-label">{t.label}</span>
              {count > 0 && <span className="talk-gallery-tab-count">{count}</span>}
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="flex justify-center py-6">
          <Loader2 size={18} className="animate-spin text-muted-foreground" />
        </div>
      ) : error ? (
        <div className="text-center py-4 space-y-2">
          <p className="text-xs text-destructive">{error}</p>
          <button type="button" onClick={load} className="text-xs font-semibold px-2 py-1 talk-btn-ghost rounded-lg">
            Réessayer
          </button>
        </div>
      ) : tab === 'link' ? (
        <div className="space-y-1.5 max-h-64 overflow-y-auto">
          {links.length === 0 ? (
            <p className="orion-text-meta italic py-2">Aucun lien partagé.</p>
          ) : (
            links.map((link) => {
              const { relative } = formatTalkDateTime(link.createdAt);
              return (
                <a
                  key={link.id}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="talk-attachment flex items-start gap-2 p-2 rounded-lg group"
                >
                  <Link2 size={14} className="text-[var(--info)] shrink-0 mt-0.5" strokeWidth={1.75} />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-[var(--info)] truncate group-hover:underline">{link.url}</p>
                    <p className="orion-text-meta mt-0.5">
                      {link.senderName} · {relative}
                    </p>
                  </div>
                  <ExternalLink size={12} className="text-muted-foreground shrink-0 opacity-0 group-hover:opacity-100" />
                </a>
              );
            })
          )}
        </div>
      ) : tab === 'photo' && filteredAttachments.length > 0 ? (
        <div className="grid grid-cols-3 gap-1.5 max-h-52 overflow-y-auto">
          {filteredAttachments.map((a) => (
            <button
              key={a.id}
              type="button"
              onClick={() => setDetail(a)}
              className={`aspect-square overflow-hidden ${TALK_R} bg-surface-card border border-[var(--border-soft)] hover:ring-1 hover:ring-[var(--primary)]/40`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`/api/messaging/attachments/${a.id}/download?inline=1`}
                alt={a.originalFileName}
                className="w-full h-full object-cover"
                loading="lazy"
              />
            </button>
          ))}
        </div>
      ) : (
        <div className="space-y-1.5 max-h-64 overflow-y-auto">
          {filteredAttachments.length === 0 ? (
            <p className="orion-text-meta italic py-2">
              Aucun fichier — joignez un document via le trombone dans le chat.
            </p>
          ) : (
            filteredAttachments.map((a) => {
              const { date, time } = formatTalkDateTime(a.createdAt);
              return (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => setDetail(a)}
                  className="talk-attachment w-full text-left flex items-center gap-2 p-2 rounded-lg"
                >
                  <div className="talk-avatar w-9 h-9 shrink-0 flex items-center justify-center text-[8px] font-bold overflow-hidden rounded-md bg-[var(--orion-red-vivid)]/10 text-[var(--orion-red-vivid)]">
                    {a.category === 'photo' ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={`/api/messaging/attachments/${a.id}/download?inline=1`}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      fileIcon(a.extension)
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-foreground truncate">{a.originalFileName}</p>
                    <p className="orion-text-meta">
                      {formatBytes(a.sizeBytes)} · {date} {time}
                      {a.uploadedByName ? ` · ${a.uploadedByName}` : ''}
                    </p>
                  </div>
                  <ChevronRight size={12} className="text-muted-foreground shrink-0" />
                </button>
              );
            })
          )}
        </div>
      )}

      {detail && (
        <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center p-4 bg-backdrop backdrop-blur-sm" onClick={() => setDetail(null)}>
          <div
            className="talk-modal-panel w-full max-w-sm overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-3 py-2 border-b border-border/50">
              <span className="text-xs font-semibold text-foreground truncate pr-2">{detail.originalFileName}</span>
              <button type="button" onClick={() => setDetail(null)} className="talk-icon-btn" aria-label="Fermer">
                <X size={16} />
              </button>
            </div>
            {detail.category === 'photo' && (
              <div className="bg-surface-panel flex justify-center max-h-48">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`/api/messaging/attachments/${detail.id}/download?inline=1`}
                  alt={detail.originalFileName}
                  className="max-h-48 object-contain"
                />
              </div>
            )}
            <div className="p-3 space-y-2 text-xs">
              <DetailRow label="Taille" value={formatBytes(detail.sizeBytes)} />
              <DetailRow label="Date" value={formatTalkDateTime(detail.createdAt).date} />
              <DetailRow label="Heure" value={formatTalkDateTime(detail.createdAt).time} />
              <DetailRow label="Envoyé par" value={detail.uploadedByName ?? '—'} />
              <DetailRow label="Version" value={detail.version} />
              <DetailRow label="Statut" value={detail.status} />
              {onStatusChange && ['admin', 'manager', 'production', 'studio'].includes(userRole ?? '') && (
                <div className="flex flex-wrap gap-1 pt-1">
                  {STATUS_OPTIONS.map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => {
                        onStatusChange(detail.id, st);
                        setDetail({ ...detail, status: st });
                      }}
                      className={`text-xs px-2 py-0.5 rounded-full border ${
                        detail.status === st ? 'border-[var(--orion-red-vivid)] text-[var(--orion-red-vivid)]' : 'border-border text-muted-foreground'
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              )}
              <DetailRow label="SHA-256" value={`${detail.checksumSha256.slice(0, 12)}…`} mono />
              <DetailRow label="Téléchargements" value={String(detail.downloadCount)} />
              <a
                href={`/api/messaging/attachments/${detail.id}/download`}
                className={`talk-btn-primary w-full py-2 ${TALK_R} text-xs font-bold flex items-center justify-center gap-2 mt-2`}
              >
                <Download size={14} /> Télécharger
              </a>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

function DetailRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex justify-between gap-2">
      <span className="text-muted-foreground shrink-0">{label}</span>
      <span className={`text-foreground text-right truncate ${mono ? 'orion-text-code' : ''}`}>{value}</span>
    </div>
  );
}
