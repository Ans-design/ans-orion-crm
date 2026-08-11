'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  CheckCircle, XCircle, AlertTriangle, Factory, Loader2, ClipboardCheck, Camera,
} from 'lucide-react';
import { uxToast } from '@/lib/ux/feedback';
import { getApiErrorMessage } from '@/lib/api-client';
import { ProofPhotoUpload } from '@/components/shared/proof-photo-upload';
import {
  checklistProgress,
  type QualiteChecklistItem,
} from '@/lib/qualite/checklist-definition';
import { AppButton } from '@/components/ui/app-ui';

type Cmd = {
  id: string;
  numero: string;
  article: string;
  statut: string;
  avancement: number;
  client: { name: string } | null;
};

type Controle = {
  statut: string;
  checklist: QualiteChecklistItem[];
  commentaire?: string | null;
  cause?: string | null;
  actionCorrective?: string | null;
  proofPhotoUrl?: string | null;
};

type Props = {
  commande: Cmd;
  onDone?: () => void;
};

export function QualiteChecklistForm({ commande, onDone }: Props) {
  const [controle, setControle] = useState<Controle | null>(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<string | null>(null);
  const [motif, setMotif] = useState('');
  const [cause, setCause] = useState('');
  const [actionCorrective, setActionCorrective] = useState('');
  const [proofUrl, setProofUrl] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    fetch(`/api/production/qualite/${commande.id}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.controle) {
          setControle(d.controle);
          setMotif(d.controle.commentaire ?? '');
          setCause(d.controle.cause ?? '');
          setActionCorrective(d.controle.actionCorrective ?? '');
          setProofUrl(d.controle.proofPhotoUrl ?? '');
        }
      })
      .finally(() => setLoading(false));
  }, [commande.id]);

  useEffect(() => { load(); }, [load]);

  const toggleItem = (key: string) => {
    if (!controle) return;
    setControle({
      ...controle,
      checklist: controle.checklist.map((i) =>
        i.key === key ? { ...i, checked: !i.checked } : i,
      ),
    });
  };

  const saveDraft = async () => {
    if (!controle) return;
    setActing('draft');
    try {
      const res = await fetch(`/api/production/qualite/${commande.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          checklist: controle.checklist,
          commentaire: motif,
          cause,
          actionCorrective,
          proofPhotoUrl: proofUrl || null,
        }),
      });
      if (!res.ok) throw new Error();
      uxToast.success('Checklist sauvegardée');
      load();
    } catch {
      uxToast.error('Erreur sauvegarde');
    } finally {
      setActing(null);
    }
  };

  const submit = async (action: 'conforme' | 'non_conforme' | 'reserve' | 'refaire') => {
    if (!controle) return;
    if ((action === 'non_conforme' || action === 'refaire') && !cause.trim()) {
      uxToast.error('Indiquez la cause de la non-conformité.');
      return;
    }
    setActing(action);
    try {
      const res = await fetch(`/api/production/qualite/${commande.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          checklist: controle.checklist,
          motif,
          cause,
          actionCorrective,
          proofPhotoUrl: proofUrl || null,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        uxToast.error(getApiErrorMessage(data, 'Erreur contrôle qualité'));
        return;
      }
      const labels: Record<string, string> = {
        conforme: 'Lot conforme',
        non_conforme: 'Non-conformité enregistrée',
        reserve: 'Accepté avec réserve',
        refaire: 'À refaire — production suspendue',
      };
      uxToast.success(labels[action] ?? 'Décision enregistrée');
      onDone?.();
      load();
    } finally {
      setActing(null);
    }
  };

  if (loading) {
    return (
      <div className="qualite-form flex items-center justify-center py-8 text-muted-foreground">
        <Loader2 size={20} className="animate-spin mr-2" /> Chargement checklist…
      </div>
    );
  }

  if (!controle) return null;

  const progress = checklistProgress(controle.checklist);

  return (
    <div className="qualite-form">
      <div className="qualite-form__head">
        <div className="min-w-0">
          <div className="qualite-form__badges">
            <span className="qualite-form__num">{commande.numero}</span>
            <span className="qualite-pill">{commande.statut}</span>
            <span className="qualite-pill qualite-pill--soft">{controle.statut}</span>
          </div>
          <p className="qualite-form__title">{commande.article}</p>
          <p className="qualite-form__client">{commande.client?.name ?? '—'}</p>
        </div>
        <div className="qualite-form__head-actions">
          <AppButton type="button" size="sm" variant="outline" onClick={() => { window.location.href = `/commandes/${commande.id}`; }}>
            <Factory size={14} /> Fiche 360°
          </AppButton>
          <AppButton type="button" size="sm" disabled={acting !== null} onClick={() => void saveDraft()}>
            Sauvegarder
          </AppButton>
        </div>
      </div>

      <div className="qualite-progress">
        <div className="qualite-progress__row">
          <span className="qualite-progress__lab">
            <ClipboardCheck size={12} aria-hidden /> Checklist ({progress.checked}/{progress.total})
          </span>
          <span className="qualite-progress__pct tabular-nums">{progress.percent}%</span>
        </div>
        <div className="qualite-progress__bar" aria-hidden>
          <div style={{ width: `${progress.percent}%` }} />
        </div>
      </div>

      <div className="qualite-check-grid">
        {controle.checklist.map((item) => (
          <label
            key={item.key}
            className={`qualite-check${item.checked ? ' is-checked' : ''}`}
          >
            <input
              type="checkbox"
              checked={item.checked}
              onChange={() => toggleItem(item.key)}
            />
            <span>{item.label}</span>
          </label>
        ))}
      </div>

      <div className="qualite-form__side">
        <ProofPhotoUpload
          label="Photo preuve non-conformité / réserve"
          photoUrl={proofUrl}
          compact
          onSaved={({ photoUrl }) => setProofUrl(photoUrl)}
        />

        <div className="qualite-notes-grid">
          <label className="qualite-field">
            <span>Commentaire</span>
            <textarea value={motif} onChange={(e) => setMotif(e.target.value)} rows={2} />
          </label>
          <label className="qualite-field">
            <span>Cause (NC)</span>
            <textarea value={cause} onChange={(e) => setCause(e.target.value)} rows={2} />
          </label>
          <label className="qualite-field qualite-field--full">
            <span>Action corrective</span>
            <textarea value={actionCorrective} onChange={(e) => setActionCorrective(e.target.value)} rows={2} />
          </label>
        </div>
      </div>

      <div className="qualite-decisions">
        <button type="button" className="qualite-dec qualite-dec--ok" disabled={acting !== null} onClick={() => void submit('conforme')}>
          {acting === 'conforme' ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />}
          Conforme
        </button>
        <button type="button" className="qualite-dec" disabled={acting !== null} onClick={() => void submit('reserve')}>
          <AlertTriangle size={14} /> Avec réserve
        </button>
        <button type="button" className="qualite-dec" disabled={acting !== null} onClick={() => void submit('refaire')}>
          <Camera size={14} /> À refaire
        </button>
        <button type="button" className="qualite-dec qualite-dec--bad" disabled={acting !== null} onClick={() => void submit('non_conforme')}>
          <XCircle size={14} /> Non conforme
        </button>
      </div>
    </div>
  );
}
