'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ScanEye, CheckCircle, XCircle, FileImage, AlertTriangle, Loader2 } from 'lucide-react';
import { ListSkeleton } from '@/components/ui/list-skeleton';
import { uxToast } from '@/lib/ux/feedback';
import { unwrapApiData } from '@/lib/api-client';

type Check = { id: string; ordre: number; label: string; checked: boolean; checkedBy?: string | null; checkedAt?: string | null };
type Brief = {
  id: string;
  titre: string;
  statut: string;
  commandeId?: string | null;
  commande?: { id: string; numero: string; article: string } | null;
  checklist: Check[];
};
type FileItem = { id: string; name: string; category: string; versionLabel: string | null; commandeId: string | null };

export function StudioPrepressePanel({ commandeId }: { commandeId?: string | null }) {
  const [briefs, setBriefs] = useState<Brief[]>([]);
  const [activeBriefId, setActiveBriefId] = useState<string | null>(null);
  const [detail, setDetail] = useState<Brief | null>(null);
  const [files, setFiles] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [validated, setValidated] = useState<Set<string>>(new Set());

  const loadBriefs = useCallback(async () => {
    setLoading(true);
    try {
      if (commandeId) {
        await fetch('/api/studio/briefs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ commandeId }),
        }).catch(() => null);
      }
      const p = new URLSearchParams();
      if (commandeId) p.set('commande', commandeId);
      const [listRes, filesRes] = await Promise.all([
        fetch(`/api/studio/briefs?${p}`),
        fetch(commandeId ? `/api/studio/fichiers?commande=${encodeURIComponent(commandeId)}` : '/api/studio/fichiers'),
      ]);
      const listBody = listRes.ok ? await listRes.json() : [];
      const list = unwrapApiData<Brief[] | { items?: Brief[] }>(listBody);
      const briefsList = Array.isArray(list) ? list : Array.isArray(list?.items) ? list.items : [];
      setBriefs(briefsList);
      const first = briefsList[0]?.id ?? null;
      setActiveBriefId((prev) => prev && briefsList.some((b) => b.id === prev) ? prev : first);

      const filesBody = filesRes.ok ? await filesRes.json() : [];
      const filesData = unwrapApiData<FileItem[] | { files?: FileItem[] }>(filesBody);
      setFiles(Array.isArray(filesData) ? filesData : filesData?.files ?? []);
    } finally {
      setLoading(false);
    }
  }, [commandeId]);

  useEffect(() => { void loadBriefs(); }, [loadBriefs]);

  useEffect(() => {
    if (!activeBriefId) {
      setDetail(null);
      return;
    }
    let cancelled = false;
    fetch(`/api/studio/briefs/${activeBriefId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((body) => {
        if (cancelled || !body) return;
        setDetail(unwrapApiData<Brief>(body));
      })
      .catch(() => { if (!cancelled) setDetail(null); });
    return () => { cancelled = true; };
  }, [activeBriefId]);

  const toggleCheck = async (checkId: string, checked: boolean) => {
    if (!activeBriefId) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/studio/briefs/${activeBriefId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ checkId, checked }),
      });
      if (!res.ok) {
        uxToast.error('Enregistrement checklist impossible');
        return;
      }
      const updated = unwrapApiData<Brief>(await res.json());
      setDetail(updated);
      setBriefs((prev) => prev.map((b) => (b.id === updated.id ? { ...b, statut: updated.statut, checklist: updated.checklist } : b)));
      uxToast.success(checked ? 'Contrôle coché' : 'Contrôle décoché');
    } finally {
      setSaving(false);
    }
  };

  const checks = detail?.checklist ?? [];
  const done = checks.filter((c) => c.checked).length;
  const score = checks.length ? Math.round((done / checks.length) * 100) : 0;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4">
      <div className="dashboard-chart-card rounded-[7px] border border-border bg-card p-4 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-semibold text-sm flex items-center gap-2"><FileImage size={16} /> Fichiers & briefs prépresse</h2>
          {commandeId && (
            <Link href={`/commandes/${commandeId}`} className="text-xs text-primary font-semibold hover:underline">
              Retour dossier commande
            </Link>
          )}
        </div>

        {loading ? <ListSkeleton rows={3} /> : (
          <>
            {briefs.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {briefs.map((b) => (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => setActiveBriefId(b.id)}
                    className={`text-xs px-3 py-1.5 rounded-[7px] border ${activeBriefId === b.id ? 'bg-primary text-white border-primary' : 'border-border hover:bg-muted'}`}
                  >
                    {b.commande?.numero ?? b.titre}
                  </button>
                ))}
              </div>
            )}

            {files.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucun fichier en file — uploadez depuis l&apos;onglet Fichiers.</p>
            ) : (
              <div className="space-y-2">
                {files.slice(0, 12).map((f) => (
                  <div key={f.id} className="flex items-center justify-between p-3 rounded-lg border border-border text-sm">
                    <div>
                      <p className="font-semibold">{f.name}</p>
                      <p className="text-[10px] text-muted-foreground">{f.category} {f.versionLabel ?? ''}</p>
                    </div>
                    <div className="flex gap-1">
                      <button
                        type="button"
                        onClick={() => setValidated((prev) => new Set(prev).add(f.id))}
                        className={`p-2 rounded-lg border ${validated.has(f.id) ? 'bg-green-500/10 border-green-500/30 text-green-600' : 'hover:bg-muted'}`}
                        title="Marquer contrôlé (local session)"
                      >
                        <CheckCircle size={14} />
                      </button>
                      <button type="button" className="p-2 rounded-lg border hover:bg-red-500/10 text-red-600" title="Correction requise">
                        <XCircle size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      <div className="dashboard-chart-card rounded-[7px] border border-border bg-card p-4">
        <h2 className="font-semibold text-sm mb-3 flex items-center gap-2">
          <ScanEye size={16} /> Checklist prépresse
          {saving && <Loader2 size={14} className="animate-spin text-muted-foreground" />}
        </h2>
        {!detail ? (
          <p className="text-xs text-muted-foreground">
            {commandeId
              ? 'Création / chargement du brief commande…'
              : 'Sélectionnez un brief ou ouvrez avec ?commande=<id>.'}
          </p>
        ) : (
          <>
            <p className="text-[10px] text-muted-foreground mb-2">
              {detail.titre} · {detail.statut}
              {detail.commande?.numero ? ` · ${detail.commande.numero}` : ''}
            </p>
            <div className="mb-3">
              <div className="flex justify-between text-xs mb-1"><span>Score contrôle</span><span className="font-bold">{score}%</span></div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all" style={{ width: `${score}%`, background: score >= 80 ? 'var(--ans-green)' : score >= 50 ? 'var(--ans-yellow)' : 'var(--ans-red)' }} />
              </div>
            </div>
            <div className="space-y-2">
              {checks.map((item) => (
                <label key={item.id} className="flex items-start gap-2 text-xs cursor-pointer">
                  <input
                    type="checkbox"
                    checked={item.checked}
                    disabled={saving}
                    onChange={() => void toggleCheck(item.id, !item.checked)}
                    className="mt-0.5 accent-teal-600"
                  />
                  <span className={item.checked ? 'line-through text-muted-foreground' : ''}>
                    {item.label}
                    {item.checkedBy ? <span className="block text-[10px] text-muted-foreground">par {item.checkedBy}</span> : null}
                  </span>
                </label>
              ))}
            </div>
            {score < 100 && (
              <p className="text-[10px] text-amber-600 mt-3 flex items-center gap-1"><AlertTriangle size={12} /> Compléter la checklist avant validation production</p>
            )}
            {score === 100 && (
              <p className="text-[10px] text-green-600 mt-3 flex items-center gap-1"><CheckCircle size={12} /> Checklist complète — brief validé (persisté)</p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
