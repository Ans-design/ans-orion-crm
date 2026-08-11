'use client';

import Image from 'next/image';
import { useRef, useState } from 'react';
import { Camera, CheckCircle2, MapPin, Phone, Truck, User, Wallet } from 'lucide-react';
import { uxToast } from '@/lib/ux/feedback';
import { unwrapApiData } from '@/lib/api-client';
import { EncaissementModal, type EncaissementTarget } from '@/components/encaissement-modal';
import { SignaturePad } from '@/components/shared/signature-pad';
import { statusBadgeClass } from '@/lib/ui/status-styles';

const SC: Record<string, string> = {
  'Prêt': statusBadgeClass('Prêt'),
  'En livraison': statusBadgeClass('En livraison'),
  'Livré': statusBadgeClass('Livré'),
};

type LivraisonItem = {
  id: string;
  numero: string;
  statut: string;
  commandeId?: string | null;
  clientId?: string | null;
  adresseLiv?: string | null;
  contactLiv?: string | null;
  telLiv?: string | null;
  colisCount?: number;
  proofPhotoUrl?: string | null;
  proofNote?: string | null;
  commande?: { id?: string; article?: string; total?: number; reste?: number; client?: { name?: string; id?: string } | null } | null;
  client?: { name?: string; id?: string } | null;
};

type ProofDraft = { note: string; url: string; signature: string };

type Props = {
  items: LivraisonItem[];
  onRefresh: () => void;
};

export function LivreurDeliveryView({ items, onRefresh }: Props) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [proofs, setProofs] = useState<Record<string, ProofDraft>>({});
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [encTarget, setEncTarget] = useState<EncaissementTarget | null>(null);
  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const routeItems = items.filter((l) => l.statut === 'En livraison' || l.statut === 'Prêt');

  const getProof = (id: string): ProofDraft => proofs[id] ?? { note: '', url: '', signature: '' };

  const setProof = (id: string, patch: Partial<ProofDraft>) => {
    setProofs((prev) => ({
      ...prev,
      [id]: { ...getProof(id), ...patch },
    }));
  };

  const uploadProof = async (livraisonId: string, file: File) => {
    setUploadingId(livraisonId);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/files', { method: 'POST', body: fd });
      if (!res.ok) throw new Error('Upload échoué');
      const data = unwrapApiData<{ id: string }>(await res.json());
      if (!data?.id) throw new Error('Réponse fichier invalide');
      setProof(livraisonId, { url: `/api/files/${data.id}` });
      uxToast.success('Photo enregistrée');
    } catch {
      uxToast.error('Erreur upload photo');
    } finally {
      setUploadingId(null);
    }
  };

  const openEncaissement = (l: LivraisonItem) => {
    const cmdId = l.commandeId ?? l.commande?.id;
    const clientId = l.clientId ?? l.client?.id ?? l.commande?.client?.id;
    const reste = l.commande?.reste ?? 0;
    const total = l.commande?.total ?? reste;
    if (!cmdId || reste <= 0) return;
    setEncTarget({
      id: cmdId,
      numero: l.numero,
      label: l.client?.name || l.commande?.client?.name || 'Livraison',
      totalTTC: total,
      dejaPaye: Math.max(0, total - reste),
      commandeId: cmdId,
      clientId: clientId ?? undefined,
    });
  };

  const confirmDelivery = async (l: LivraisonItem) => {
    const draft = getProof(l.id);
    if (!draft.url && !draft.note.trim() && !draft.signature) {
      uxToast.error('Ajoutez une photo, une signature ou une note avant confirmation.');
      return;
    }
    try {
      const res = await fetch(`/api/livraisons/${l.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          statut: 'Livré',
          proofPhotoUrl: draft.url || null,
          proofNote: draft.note.trim() || null,
          signatureData: draft.signature || null,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        uxToast.success('Livraison confirmée');
        setActiveId(null);
        setProofs((prev) => {
          const next = { ...prev };
          delete next[l.id];
          return next;
        });
        onRefresh();
        const reste = l.commande?.reste ?? 0;
        if (reste > 0) {
          uxToast.info('Encaissement à la livraison');
          openEncaissement(l);
        }
      } else {
        uxToast.error((data as { error?: string }).error, 'Confirmation impossible');
      }
    } catch {
      uxToast.error('Erreur réseau');
    }
  };

  if (routeItems.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground text-sm">
        Aucune livraison en route ou prête pour le livreur.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">Vue livreur — {routeItems.length} tournée(s) · preuve + encaissement</p>
      {routeItems.map((l) => {
        const draft = getProof(l.id);
        const uploading = uploadingId === l.id;
        return (
          <div key={l.id} className="bg-card border border-border rounded-[7px] p-4 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="w-12 h-12 rounded-[7px] bg-[var(--ans-cyan)]/10 flex items-center justify-center shrink-0">
                <Truck size={22} className="text-[var(--ans-cyan)]" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono font-bold">{l.numero}</span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${SC[l.statut] || ''}`}>{l.statut}</span>
                  {(l.commande?.reste ?? 0) > 0 && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-600 flex items-center gap-1">
                      <Wallet size={10} /> {l.commande?.reste?.toLocaleString('fr-FR')} Ar
                    </span>
                  )}
                </div>
                <p className="text-sm font-medium mt-1">{l.client?.name || l.commande?.client?.name || 'Client'}</p>
                <p className="text-xs text-muted-foreground">{l.commande?.article}</p>
                {l.adresseLiv && (
                  <p className="text-sm mt-2 flex items-start gap-2">
                    <MapPin size={14} className="shrink-0 mt-0.5 text-muted-foreground" />
                    {l.adresseLiv}
                  </p>
                )}
                <div className="flex flex-wrap gap-3 mt-2 text-xs text-muted-foreground">
                  {l.contactLiv && <span className="flex items-center gap-1"><User size={12} />{l.contactLiv}</span>}
                  {l.telLiv && <span className="flex items-center gap-1"><Phone size={12} />{l.telLiv}</span>}
                  <span>{l.colisCount ?? 1} colis</span>
                </div>
              </div>
            </div>

            {activeId === l.id ? (
              <div className="mt-4 pt-4 border-t border-border space-y-3">
                <input
                  ref={(el) => { fileRefs.current[l.id] = el; }}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) void uploadProof(l.id, f);
                    e.target.value = '';
                  }}
                />
                <button
                  type="button"
                  disabled={uploading}
                  onClick={() => fileRefs.current[l.id]?.click()}
                  className="w-full py-3 rounded-[7px] border border-dashed border-border flex items-center justify-center gap-2 text-sm hover:bg-accent"
                >
                  <Camera size={18} /> {uploading ? 'Upload…' : draft.url ? 'Photo ajoutée ✓' : 'Preuve photo'}
                </button>
                {draft.url && (
                  <Image
                    src={draft.url}
                    alt="Preuve livraison"
                    width={640}
                    height={160}
                    unoptimized
                    className="w-full max-h-40 object-cover rounded-lg border border-border"
                  />
                )}
                <textarea
                  value={draft.note}
                  onChange={(e) => setProof(l.id, { note: e.target.value })}
                  placeholder="Note livreur (nom signataire, remarque…)"
                  className="w-full bg-accent border border-border rounded-[7px] px-3 py-2 text-sm min-h-[72px]"
                  rows={2}
                />
                <SignaturePad
                  value={draft.signature}
                  onChange={(signature) => setProof(l.id, { signature })}
                />
                <div className="flex gap-2">
                  <button type="button" onClick={() => setActiveId(null)} className="flex-1 py-3 rounded-[7px] bg-accent text-sm">Annuler</button>
                  <button type="button" onClick={() => confirmDelivery(l)} className="flex-1 py-3 rounded-[7px] bg-green-600 text-white font-bold text-sm flex items-center justify-center gap-2">
                    <CheckCircle2 size={16} /> Livré
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex gap-2 mt-4">
                {(l.commande?.reste ?? 0) > 0 && (
                  <button type="button" onClick={() => openEncaissement(l)} className="flex-1 py-3 rounded-[7px] border border-amber-500/30 text-amber-600 font-semibold text-sm flex items-center justify-center gap-2">
                    <Wallet size={16} /> Encaisser
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setActiveId(l.id);
                    setProof(l.id, { note: l.proofNote ?? '', url: l.proofPhotoUrl ?? '', signature: '' });
                  }}
                  className="flex-1 py-3 rounded-[7px] bg-[var(--ans-cyan)] text-black font-bold text-sm"
                >
                  Confirmer livraison
                </button>
              </div>
            )}
          </div>
        );
      })}
      <EncaissementModal target={encTarget} onClose={() => setEncTarget(null)} onSuccess={onRefresh} />
    </div>
  );
}
