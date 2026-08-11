'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { MessageSquare } from 'lucide-react';
import { BatFilePreview, BatFilePreviewPlaceholder } from '@/components/bat/bat-file-preview';
import { batStatutLabel } from '@/lib/constants/file-assets';

type VersionRow = {
  versionLabel: string;
  statut: string;
  file?: { id: string; name: string; mimeType: string } | null;
};

export function BatDrawerContent({ proofId }: { proofId: string }) {
  const [proof, setProof] = useState<{
    numero?: string;
    statut?: string;
    locked?: boolean;
    notes?: string | null;
    commande?: { numero?: string; id?: string; client?: { name?: string } };
    fileAssetId?: string | null;
  } | null>(null);
  const [versions, setVersions] = useState<VersionRow[]>([]);
  const [preview, setPreview] = useState<{ id: string; name: string; mimeType: string } | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      fetch(`/api/proofs/${proofId}`).then((r) => (r.ok ? r.json() : null)),
      fetch(`/api/proofs/${proofId}/versions`).then((r) => (r.ok ? r.json() : { versions: [] })),
    ]).then(([p, v]) => {
      if (cancelled) return;
      setProof(p);
      const vers = (v?.versions ?? []) as VersionRow[];
      setVersions(vers);
      const latest = vers.find((row) => row.file?.id);
      if (latest?.file) setPreview(latest.file);
    });
    return () => { cancelled = true; };
  }, [proofId]);

  if (!proof) {
    return <p className="text-xs text-muted-foreground p-2">Chargement BAT…</p>;
  }

  return (
    <div className="space-y-3">
      <div className="orion-card p-4 space-y-2">
        <p className="font-mono text-xs text-[var(--orion-red-vivid)]">{proof.numero}</p>
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md ans-btn-primary inline-block">
          {batStatutLabel(proof.statut ?? '', proof.locked)}
        </span>
        {proof.commande && (
          <p className="text-sm text-[var(--text-secondary)]">
            Cmd {proof.commande.numero} · {proof.commande.client?.name}
          </p>
        )}
        {proof.notes && <p className="text-xs text-[var(--text-muted)] mt-2">{proof.notes}</p>}
      </div>

      {preview ? (
        <BatFilePreview fileId={preview.id} name={preview.name} mimeType={preview.mimeType} compact />
      ) : (
        <BatFilePreviewPlaceholder />
      )}

      {versions.length > 0 && (
        <div className="text-[10px] space-y-1 text-muted-foreground px-1">
          {versions.map((v) => (
            <div key={v.versionLabel}>
              {v.versionLabel} — {v.statut}
              {v.file && (
                <a href={`/api/files/${v.file.id}`} target="_blank" rel="noopener noreferrer" className="ml-2 text-[var(--ans-cyan)]">
                  ouvrir
                </a>
              )}
            </div>
          ))}
        </div>
      )}

      {proof.commande?.id && (
        <Link
          href={`/commandes/${proof.commande.id}?tab=bat`}
          className="text-xs text-[var(--ans-cyan)] hover:underline block"
        >
          Fiche commande — BAT & Studio →
        </Link>
      )}
    </div>
  );
}
