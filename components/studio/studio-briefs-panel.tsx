'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  Loader2, ChevronDown, ChevronUp, FileWarning, Send, CheckCircle2, Plus,
  FileImage, FolderOpen, Layers,
} from 'lucide-react';
import { BRIEF_STATUTS, VERSION_STATUTS } from '@/lib/constants/studio';
import { AppButton } from '@/components/ui/app-ui';
import { unwrapApiData, unwrapListItems } from '@/lib/api-client';
import { uxToast } from '@/lib/ux/feedback';

type Version = { id: string; version: string; statut: string; commentaire: string | null };
type Check = { id: string; ordre: number; label: string; checked: boolean };
type Brief = {
  id: string;
  titre: string;
  statut: string;
  fichiersManquants: boolean;
  tempsPasseMin: number;
  commande?: { numero: string; article: string } | null;
  client?: { name: string } | null;
  versions: Version[];
  checklist: Check[];
  _count: { fichiers: number };
};

function statutTone(statut: string): string {
  if (statut === 'Validé' || statut === 'Livré production') return 'ok';
  if (statut === 'Correction client' || statut === 'En attente fichiers') return 'warn';
  if (statut === 'BAT envoyé') return 'gold';
  if (statut === 'En cours') return 'run';
  return 'neutral';
}

export function StudioBriefsPanel({ initialStatut, commandeId }: { initialStatut?: string | null; commandeId?: string | null }) {
  const [briefs, setBriefs] = useState<Brief[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtre, setFiltre] = useState(initialStatut && initialStatut !== 'tous' ? initialStatut : 'tous');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [detail, setDetail] = useState<(Brief & { briefText?: string; fichiers?: unknown[] }) | null>(null);
  const [acting, setActing] = useState(false);

  useEffect(() => {
    if (initialStatut) setFiltre(initialStatut);
  }, [initialStatut]);

  const load = useCallback(() => {
    setLoading(true);
    const p = new URLSearchParams();
    if (filtre !== 'tous') p.set('statut', filtre);
    if (commandeId) p.set('commande', commandeId);
    const q = p.toString() ? `?${p}` : '';
    fetch(`/api/studio/briefs${q}`)
      .then(async (r) => {
        if (!r.ok) throw new Error('load');
        return unwrapListItems<Brief>(await r.json());
      })
      .then(setBriefs)
      .catch(() => {
        setBriefs([]);
        uxToast.error('Impossible de charger les briefs');
      })
      .finally(() => setLoading(false));
  }, [filtre, commandeId]);

  useEffect(() => { load(); }, [load]);

  const openDetail = async (id: string) => {
    if (expanded === id) {
      setExpanded(null);
      setDetail(null);
      return;
    }
    setExpanded(id);
    try {
      const res = await fetch(`/api/studio/briefs/${id}`);
      if (!res.ok) throw new Error('detail');
      setDetail(unwrapApiData(await res.json()));
    } catch {
      setDetail(null);
      uxToast.error('Impossible d\'ouvrir le brief');
    }
  };

  const patchBrief = async (id: string, body: Record<string, unknown>) => {
    setActing(true);
    try {
      const res = await fetch(`/api/studio/briefs/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        uxToast.error('Action brief impossible');
        return;
      }
      const updated = unwrapApiData<Brief & { briefText?: string; fichiers?: unknown[] }>(await res.json());
      load();
      if (expanded === id) setDetail(updated);
      uxToast.success('Brief mis à jour');
    } finally {
      setActing(false);
    }
  };

  return (
    <div className="studio-briefs">
      <div className="studio-briefs__toolbar">
        <select
          value={filtre}
          onChange={(e) => setFiltre(e.target.value)}
          className="orion-filter-select"
          aria-label="Filtrer par statut"
        >
          <option value="tous">Tous les statuts</option>
          {BRIEF_STATUTS.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="animate-spin text-primary" />
        </div>
      ) : briefs.length === 0 ? (
        <div className="studio-briefs__empty">
          <FileImage size={22} aria-hidden />
          <p>Aucun brief — créés automatiquement à la commande</p>
        </div>
      ) : (
        <div className="studio-briefs-grid">
          {briefs.map((b) => {
            const tone = statutTone(b.statut);
            const isOpen = expanded === b.id;
            return (
              <article
                key={b.id}
                className={`studio-brief-card studio-brief-card--${tone}${isOpen ? ' studio-brief-card--open' : ''}${b.fichiersManquants ? ' studio-brief-card--missing' : ''}`}
              >
                <button
                  type="button"
                  className="studio-brief-card__head"
                  onClick={() => openDetail(b.id)}
                  aria-expanded={isOpen}
                >
                  <div className="studio-brief-card__top">
                    <span className={`studio-brief-status studio-brief-status--${tone}`}>{b.statut}</span>
                    {isOpen ? <ChevronUp size={16} aria-hidden /> : <ChevronDown size={16} aria-hidden />}
                  </div>
                  <h3 className="studio-brief-card__title">{b.titre}</h3>
                  <p className="studio-brief-card__client">{b.client?.name ?? 'Client —'}</p>
                  <div className="studio-brief-card__meta">
                    <span className="studio-brief-card__cmd">{b.commande?.numero ?? '—'}</span>
                    <span><FolderOpen size={11} aria-hidden /> {b._count.fichiers}</span>
                    <span><Layers size={11} aria-hidden /> {b.versions.length}</span>
                  </div>
                  {b.fichiersManquants ? (
                    <p className="studio-brief-card__warn">
                      <FileWarning size={12} aria-hidden /> Fichiers manquants
                    </p>
                  ) : null}
                </button>

                {isOpen && detail?.id === b.id && (
                  <div className="studio-brief-card__detail">
                    {detail.briefText ? (
                      <p className="studio-brief-card__text">{detail.briefText}</p>
                    ) : null}

                    <div className="studio-brief-card__actions">
                      <AppButton
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={acting}
                        onClick={() => patchBrief(b.id, { action: 'demander_fichiers' })}
                      >
                        <FileWarning size={12} /> Demander fichiers
                      </AppButton>
                      <AppButton
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={acting}
                        onClick={() => patchBrief(b.id, { action: 'new_version' })}
                      >
                        <Plus size={12} /> Nouvelle version
                      </AppButton>
                      <AppButton
                        type="button"
                        size="sm"
                        disabled={acting}
                        onClick={() => patchBrief(b.id, { action: 'livrer_production' })}
                      >
                        <CheckCircle2 size={12} /> Livrer production
                      </AppButton>
                    </div>

                    <div className="studio-brief-detail-grid">
                      <div className="studio-brief-detail-col">
                        <div className="studio-brief-section-head">
                          <p className="studio-brief-section-lab">Versions créatives</p>
                          <span className="studio-brief-section-count">{detail.versions?.length ?? 0}</span>
                        </div>
                        <div className="studio-brief-versions">
                          {(detail.versions?.length ?? 0) === 0 ? (
                            <p className="studio-brief-empty-hint">Aucune version</p>
                          ) : (
                            detail.versions?.map((v) => (
                              <div key={v.id} className="studio-brief-version">
                                <span className="studio-brief-version__code">{v.version}</span>
                                <select
                                  value={v.statut}
                                  disabled={acting}
                                  onChange={(e) => patchBrief(b.id, { versionId: v.id, versionStatut: e.target.value })}
                                  className="orion-filter-select studio-brief-version__select"
                                >
                                  {VERSION_STATUTS.map((s) => <option key={s} value={s}>{s}</option>)}
                                </select>
                                {v.statut === 'Envoyé' && <Send size={14} className="text-amber-500 shrink-0" aria-hidden />}
                                {v.statut === 'Validé' && <CheckCircle2 size={14} className="text-emerald-500 shrink-0" aria-hidden />}
                              </div>
                            ))
                          )}
                        </div>
                      </div>

                      <div className="studio-brief-detail-col">
                        <div className="studio-brief-section-head">
                          <p className="studio-brief-section-lab">Checklist prépresse</p>
                          <span className="studio-brief-section-count">
                            {(detail.checklist ?? []).filter((c) => c.checked).length}/{(detail.checklist ?? []).length}
                          </span>
                        </div>
                        <div className="studio-brief-check-grid">
                          {detail.checklist?.map((c) => (
                            <label key={c.id} className={`studio-brief-check${c.checked ? ' is-checked' : ''}`}>
                              <input
                                type="checkbox"
                                checked={c.checked}
                                disabled={acting}
                                onChange={(e) => patchBrief(b.id, { checkId: c.id, checked: e.target.checked })}
                              />
                              <span className={c.checked ? 'is-done' : ''}>{c.label}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
