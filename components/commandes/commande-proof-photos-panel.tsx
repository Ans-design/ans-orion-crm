'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Camera, Factory, Truck } from 'lucide-react';
import { uxToast } from '@/lib/ux/feedback';
import { ProofPhotoUpload } from '@/components/shared/proof-photo-upload';

type ProductionProof = {
  id: string;
  statut: string;
  proofPhotoUrl?: string | null;
  proofNote?: string | null;
  proofAt?: string | null;
};

type LivraisonProof = {
  id: string;
  numero: string;
  statut: string;
  proofPhotoUrl?: string | null;
  proofNote?: string | null;
  proofAt?: string | null;
};

type Props = {
  commandeId: string;
  productions?: ProductionProof[];
  livraisons?: LivraisonProof[];
  onRefresh?: () => void;
};

export function CommandeProofPhotosPanel({ commandeId, productions = [], livraisons = [], onRefresh }: Props) {
  const [prod, setProd] = useState<ProductionProof | null>(productions[0] ?? null);

  useEffect(() => {
    setProd(productions[0] ?? null);
  }, [productions]);

  const saveProductionProof = useCallback(async (data: { photoUrl: string; note: string }) => {
    if (!prod) return;
    try {
      const res = await fetch(`/api/productions/${prod.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          proofPhotoUrl: data.photoUrl || null,
          proofNote: data.note || null,
        }),
      });
      if (!res.ok) throw new Error();
      uxToast.success('Preuve production enregistrée');
      onRefresh?.();
    } catch {
      uxToast.error('Erreur enregistrement preuve production');
    }
  }, [prod, onRefresh]);

  const saveLivraisonProof = useCallback(async (livraisonId: string, data: { photoUrl: string; note: string }) => {
    try {
      const res = await fetch(`/api/livraisons/${livraisonId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          proofPhotoUrl: data.photoUrl || null,
          proofNote: data.note || null,
        }),
      });
      if (!res.ok) throw new Error();
      uxToast.success('Preuve livraison enregistrée');
      onRefresh?.();
    } catch {
      uxToast.error('Erreur enregistrement preuve livraison');
    }
  }, [onRefresh]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Camera size={16} className="text-primary" />
        <h3 className="font-semibold text-sm">Preuves photo</h3>
      </div>

      {prod ? (
        <ProofPhotoUpload
          label={`Production — ${prod.statut}`}
          photoUrl={prod.proofPhotoUrl}
          note={prod.proofNote}
          capturedAt={prod.proofAt}
          onSaved={saveProductionProof}
        />
      ) : (
        <p className="text-xs text-muted-foreground flex items-center gap-1.5">
          <Factory size={14} />
          Aucun ordre production —{' '}
          <Link href={`/production?commande=${commandeId}`} className="text-[var(--ans-cyan)] hover:underline">
            lancer la production
          </Link>
        </p>
      )}

      {livraisons.length === 0 ? (
        <p className="text-xs text-muted-foreground flex items-center gap-1.5">
          <Truck size={14} />
          Aucune livraison —{' '}
          <Link href={`/livraisons?commande=${commandeId}`} className="text-[var(--ans-cyan)] hover:underline">
            planifier
          </Link>
        </p>
      ) : (
        livraisons.map((l) => (
          <ProofPhotoUpload
            key={l.id}
            label={`Livraison ${l.numero} — ${l.statut}`}
            photoUrl={l.proofPhotoUrl}
            note={l.proofNote}
            capturedAt={l.proofAt}
            onSaved={(data) => saveLivraisonProof(l.id, data)}
            compact
          />
        ))
      )}
    </div>
  );
}
