'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import { uxToast } from '@/lib/ux/feedback';
import { FileCheck, Upload, Download, Plus, Send, CheckCircle, XCircle, RotateCcw, MessageSquare, Link2 } from 'lucide-react';
import { formatFileSize, batStatutLabel, FILE_VERSION_LABELS } from '@/lib/constants/file-assets';
import { BatVersionUploader } from '@/components/bat/bat-version-uploader';
import { BatFilePreview } from '@/components/bat/bat-file-preview';

type ProofRow = {
  id: string;
  numero: string;
  statut: string;
  locked?: boolean;
  commentaireClient?: string | null;
  commentaireInterne?: string | null;
  versions?: { id?: string; versionLabel: string; statut: string; fileAssetId?: string | null; file?: { id: string; name: string; mimeType: string } | null }[];
};

type FichierRow = {
  id: string;
  name: string;
  category: string;
  versionLabel: string | null;
  statut?: string;
  sizeBytes?: number;
  mimeType?: string;
  uploadedBy?: string | null;
  createdAt?: string;
};

type TalkAttachmentRow = {
  id: string;
  originalFileName: string;
  mimeType: string;
  sizeBytes: number;
  status: string;
  fileAssetId?: string | null;
};

type Props = {
  commandeId: string;
  clientId?: string | null;
  proofs: ProofRow[];
  fichiers: FichierRow[];
  talkAttachments?: TalkAttachmentRow[];
  onRefresh: () => void;
};

export function CommandeFichiersBatPanel({
  commandeId,
  clientId,
  proofs,
  fichiers,
  talkAttachments = [],
  onRefresh,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [versionLabel, setVersionLabel] = useState('v1');
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [acting, setActing] = useState<string | null>(null);

  const uploadFile = async (file: File) => {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('category', 'source');
      fd.append('versionLabel', versionLabel);
      fd.append('statut', 'Reçu');
      const r = await fetch(`/api/commandes/${commandeId}/fichiers`, { method: 'POST', body: fd });
      if (!r.ok) {
        const d = await r.json().catch(() => ({}));
        uxToast.error((d as { error?: string }).error, 'Upload échoué');
        return;
      }
      uxToast.success('Fichier déposé');
      onRefresh();
    } finally {
      setUploading(false);
    }
  };

  const createBat = async () => {
    setActing('create-bat');
    try {
      const r = await fetch('/api/proofs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ commandeId, clientId: clientId ?? null }),
      });
      if (!r.ok) {
        uxToast.error('Création BAT impossible');
        return;
      }
      uxToast.success('BAT créé');
      onRefresh();
    } finally {
      setActing(null);
    }
  };

  const patchProof = async (proofId: string, body: Record<string, unknown>) => {
    setActing(proofId);
    try {
      const r = await fetch(`/api/proofs/${proofId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!r.ok) {
        const d = await r.json().catch(() => ({}));
        uxToast.error((d as { error?: string }).error, 'Action BAT échouée');
        return;
      }
      uxToast.success('BAT mis à jour');
      onRefresh();
    } finally {
      setActing(null);
    }
  };

  const sendClientLink = async (proofId: string) => {
    setActing(proofId);
    try {
      const r = await fetch(`/api/proofs/${proofId}/client-link`, { method: 'POST' });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) {
        uxToast.error((d as { error?: string }).error, 'Lien client impossible');
        return;
      }
      const url = (d as { url?: string }).url;
      if (url && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
        uxToast.success('Lien client copié (30 jours)');
      } else {
        uxToast.success(url || 'Lien généré');
      }
      onRefresh();
    } finally {
      setActing(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="dashboard-chart-card space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-semibold text-sm flex items-center gap-2">
            <Upload size={14} /> Fichiers professionnels
          </h3>
          <Link href={`/studio?commande=${commandeId}`} className="text-[10px] text-[var(--ans-cyan)] hover:underline">
            Studio →
          </Link>
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          <select
            value={versionLabel}
            onChange={(e) => setVersionLabel(e.target.value)}
            className="text-xs bg-card border border-border rounded-lg px-2 py-1.5"
          >
            {FILE_VERSION_LABELS.map((v) => (
              <option key={v} value={v}>{v}</option>
            ))}
          </select>
          <input
            ref={inputRef}
            type="file"
            className="hidden"
            accept=".pdf,.ai,.psd,.cdr,.eps,.svg,.png,.jpg,.jpeg,.tiff,.tif,.zip,.rar,.doc,.docx,.xls,.xlsx"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void uploadFile(f);
              e.target.value = '';
            }}
          />
          <button
            type="button"
            disabled={uploading}
            onClick={() => inputRef.current?.click()}
            className="btn btn-b btn-sm flex items-center gap-1 text-xs"
          >
            <Upload size={12} /> {uploading ? 'Envoi…' : 'Déposer fichier'}
          </button>
        </div>
        {fichiers.length === 0 ? (
          <p className="text-xs text-muted-foreground">Aucun fichier — déposez les sources client (PDF, AI, PSD…)</p>
        ) : (
          <div className="space-y-2">
            {fichiers.map((f) => (
              <div key={f.id} className="flex flex-col gap-2 text-xs py-2 border-b border-border/50 last:border-0">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-medium truncate">{f.name}</p>
                    <p className="text-muted-foreground text-[10px]">
                      {f.statut ?? 'Reçu'} · {f.category}
                      {f.versionLabel ? ` · ${f.versionLabel}` : ''}
                      {f.sizeBytes != null ? ` · ${formatFileSize(f.sizeBytes)}` : ''}
                    </p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    {(f.mimeType?.startsWith('image/') || f.mimeType === 'application/pdf') && (
                      <button
                        type="button"
                        onClick={() => setPreviewId(previewId === f.id ? null : f.id)}
                        className="text-[10px] text-[var(--ans-cyan)] hover:underline"
                      >
                        Aperçu
                      </button>
                    )}
                    <a
                      href={`/api/files/${f.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-[var(--ans-cyan)] hover:underline"
                    >
                      <Download size={12} /> Télécharger
                    </a>
                  </div>
                </div>
                {previewId === f.id && f.mimeType && (
                  <BatFilePreview fileId={f.id} mimeType={f.mimeType} name={f.name} />
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {(talkAttachments.length > 0) && (
        <div className="dashboard-chart-card space-y-2">
          <h3 className="font-semibold text-sm flex items-center gap-2">
            <MessageSquare size={14} className="text-primary" /> Fichiers ANS Talk ({talkAttachments.length})
          </h3>
          {talkAttachments.map((a) => (
            <div key={a.id} className="flex flex-wrap items-center justify-between gap-2 text-xs py-2 border-b border-border/50">
              <div className="min-w-0">
                <p className="font-medium truncate">{a.originalFileName}</p>
                <p className="text-muted-foreground text-[10px]">{a.status} · {formatFileSize(a.sizeBytes)}</p>
              </div>
              <a
                href={`/api/messaging/attachments/${a.id}/download`}
                className="flex items-center gap-1 text-[var(--ans-cyan)] hover:underline shrink-0"
              >
                <Download size={12} /> Télécharger
              </a>
            </div>
          ))}
        </div>
      )}

      <div className="dashboard-chart-card space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-semibold text-sm flex items-center gap-2">
            <FileCheck size={14} /> BAT — bon à tirer
          </h3>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={createBat}
              disabled={acting === 'create-bat'}
              className="btn btn-out btn-sm text-xs flex items-center gap-1"
            >
              <Plus size={12} /> Créer BAT
            </button>
            <Link href={`/bat?commande=${commandeId}`} className="btn btn-out btn-sm text-xs">
              Module BAT →
            </Link>
          </div>
        </div>
        {proofs.length === 0 ? (
          <p className="text-xs text-muted-foreground">Aucun BAT — créez-en un pour lancer la validation client</p>
        ) : (
          proofs.map((p) => (
            <div key={p.id} className="border border-border/60 rounded-lg p-3 space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-mono font-bold text-sm">{p.numero}</span>
                <span className="badge badge-y text-[9px]">{batStatutLabel(p.statut, p.locked)}</span>
              </div>
              <BatVersionUploader
                proofId={p.id}
                locked={p.locked}
                versions={p.versions}
                onUploaded={onRefresh}
              />
              {p.versions?.map((v) => (
                <div key={v.versionLabel} className="text-[10px] text-muted-foreground pl-2">
                  ↳ {v.versionLabel} — {v.statut}
                </div>
              ))}
              {p.commentaireClient && (
                <p className="text-[10px] text-muted-foreground bg-accent/50 rounded px-2 py-1">
                  Commentaire client : {p.commentaireClient}
                </p>
              )}
              {p.commentaireInterne && (
                <p className="text-[10px] text-muted-foreground italic">
                  Note interne : {p.commentaireInterne}
                </p>
              )}
              {!p.locked && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {['En attente fichier', 'Envoyé', 'Correction demandée', 'En attente validation client'].includes(p.statut) && (
                    <button
                      type="button"
                      disabled={acting === p.id}
                      onClick={() => sendClientLink(p.id)}
                      className="text-[10px] px-2 py-1 rounded-lg border border-primary/40 text-primary hover:bg-primary/5 flex items-center gap-1"
                    >
                      <Link2 size={10} /> Lien validation client
                    </button>
                  )}
                  {['En attente fichier', 'Envoyé', 'Correction demandée'].includes(p.statut) && (
                    <button
                      type="button"
                      disabled={acting === p.id}
                      onClick={() => patchProof(p.id, { statut: 'Envoyé' })}
                      className="text-[10px] px-2 py-1 rounded-lg border border-border hover:bg-accent flex items-center gap-1"
                    >
                      <Send size={10} /> Marquer envoyé
                    </button>
                  )}
                  {!['Validé', 'Verrouillé'].includes(p.statut) && (
                    <>
                      <button
                        type="button"
                        disabled={acting === p.id}
                        onClick={() => patchProof(p.id, { statut: 'Validé' })}
                        className="text-[10px] px-2 py-1 rounded-lg bg-green-600/90 text-white flex items-center gap-1"
                      >
                        <CheckCircle size={10} /> Valider
                      </button>
                      <button
                        type="button"
                        disabled={acting === p.id}
                        onClick={() => patchProof(p.id, { statut: 'Refusé' })}
                        className="text-[10px] px-2 py-1 rounded-lg bg-red-500/10 text-red-500 flex items-center gap-1"
                      >
                        <XCircle size={10} /> Refuser
                      </button>
                      <button
                        type="button"
                        disabled={acting === p.id}
                        onClick={() => patchProof(p.id, { statut: 'Correction demandée' })}
                        className="text-[10px] px-2 py-1 rounded-lg border border-amber-500/40 text-amber-600 flex items-center gap-1"
                      >
                        <RotateCcw size={10} /> Correction
                      </button>
                    </>
                  )}
                </div>
              )}
              {p.locked && (
                <p className="text-[10px] text-muted-foreground italic">BAT verrouillé après validation — impression autorisée</p>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
