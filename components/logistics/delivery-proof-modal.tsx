'use client';

import { useRef, useState } from 'react';
import { Camera } from 'lucide-react';
import { AppButton } from '@/components/ui/app-ui';
import { SignaturePad } from '@/components/shared/signature-pad';
import { getApiErrorMessage, unwrapApiData } from '@/lib/api-client';
import { uxToast } from '@/lib/ux/feedback';

type Props = {
  livraisonId: string;
  numero?: string;
  open: boolean;
  onClose: () => void;
  onConfirmed: (livraison: unknown) => void;
};

/**
 * Capture preuve (photo / signature / note) avant statut Livré — partagé liste, détail, dispatch.
 */
export function DeliveryProofModal({
  livraisonId,
  numero,
  open,
  onClose,
  onConfirmed,
}: Props) {
  const [note, setNote] = useState('');
  const [url, setUrl] = useState('');
  const [signature, setSignature] = useState('');
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);

  if (!open) return null;

  const uploadProof = async (file: File) => {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/files', { method: 'POST', body: fd });
      if (!res.ok) throw new Error('Upload échoué');
      const data = unwrapApiData<{ id: string }>(await res.json());
      if (!data?.id) throw new Error('Réponse fichier invalide');
      setUrl(`/api/files/${data.id}`);
      uxToast.success('Photo enregistrée');
    } catch {
      uxToast.error('Erreur upload photo');
    } finally {
      setUploading(false);
    }
  };

  const confirm = async () => {
    if (!url && !note.trim() && !signature) {
      uxToast.error('Ajoutez une photo, une signature ou une note avant confirmation.');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/livraisons/${livraisonId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          statut: 'Livré',
          proofPhotoUrl: url || null,
          proofNote: note.trim() || null,
          signatureData: signature || null,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        uxToast.error(getApiErrorMessage(data, 'Confirmation impossible'));
        return;
      }
      uxToast.success('Livraison confirmée');
      onConfirmed(data);
      onClose();
      setNote('');
      setUrl('');
      setSignature('');
    } catch {
      uxToast.error('Erreur réseau');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center p-0 sm:p-4">
      <button
        type="button"
        className="absolute inset-0 bg-backdrop/70"
        aria-label="Fermer"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="delivery-proof-title"
        className="relative z-10 w-full sm:max-w-md bg-card border border-border rounded-t-[12px] sm:rounded-[7px] p-4 space-y-3 shadow-lg max-h-[90vh] overflow-y-auto"
      >
        <h3 id="delivery-proof-title" className="font-display font-bold text-base">
          Preuve de livraison{numero ? ` — ${numero}` : ''}
        </h3>
        <p className="text-xs text-muted-foreground">
          Photo, signature ou note obligatoire avant le statut Livré.
        </p>

        <div className="space-y-2">
          <label className="text-xs font-semibold text-muted-foreground">Note</label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            className="w-full rounded-[7px] border border-border bg-background px-3 py-2 text-sm"
            placeholder="Nom du réceptionnaire, remarques…"
          />
        </div>

        <div className="space-y-2">
          <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
            <Camera size={12} /> Photo
          </label>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void uploadProof(file);
            }}
          />
          <AppButton
            type="button"
            size="sm"
            variant="outline"
            disabled={uploading}
            onClick={() => fileRef.current?.click()}
          >
            {uploading ? 'Upload…' : url ? 'Remplacer la photo' : 'Prendre / choisir une photo'}
          </AppButton>
          {url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={url} alt="Preuve" className="mt-2 max-h-32 rounded-[7px] border border-border" />
          )}
        </div>

        <div className="space-y-2">
          <label className="text-xs font-semibold text-muted-foreground">Signature</label>
          <SignaturePad value={signature} onChange={setSignature} />
        </div>

        <div className="flex gap-2 justify-end pt-2">
          <AppButton type="button" variant="outline" size="sm" onClick={onClose} disabled={saving}>
            Annuler
          </AppButton>
          <AppButton
            type="button"
            size="sm"
            className="bg-green-600 hover:bg-green-700 text-white"
            onClick={() => void confirm()}
            disabled={saving || uploading}
          >
            {saving ? 'Confirmation…' : 'Confirmer Livré'}
          </AppButton>
        </div>
      </div>
    </div>
  );
}
