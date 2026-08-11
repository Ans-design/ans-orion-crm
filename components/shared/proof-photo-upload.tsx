'use client';

import { useRef, useState } from 'react';
import { Camera, ImageIcon, Loader2, X } from 'lucide-react';
import { uxToast } from '@/lib/ux/feedback';
import { unwrapApiData } from '@/lib/api-client';

type Props = {
  label: string;
  photoUrl?: string | null;
  note?: string | null;
  capturedAt?: string | null;
  onSaved?: (data: { photoUrl: string; note: string }) => void;
  compact?: boolean;
};

export function ProofPhotoUpload({ label, photoUrl, note, capturedAt, onSaved, compact }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [localUrl, setLocalUrl] = useState(photoUrl ?? '');
  const [localNote, setLocalNote] = useState(note ?? '');
  const [uploading, setUploading] = useState(false);

  const displayUrl = localUrl || photoUrl || '';

  const upload = async (file: File) => {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/files', { method: 'POST', body: fd });
      if (!res.ok) throw new Error('Upload échoué');
      const data = unwrapApiData<{ id: string }>(await res.json());
      if (!data?.id) throw new Error('Réponse fichier invalide');
      const url = `/api/files/${data.id}`;
      setLocalUrl(url);
      uxToast.success('Photo enregistrée');
      onSaved?.({ photoUrl: url, note: localNote });
    } catch {
      uxToast.error('Erreur upload photo');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className={`rounded-[7px] border border-border bg-card/50 ${compact ? 'p-3' : 'p-4'}`}>
      <div className="flex items-center justify-between gap-2 mb-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
          <Camera size={14} className="text-primary" />
          {label}
        </p>
        {capturedAt && (
          <span className="text-[10px] text-muted-foreground">
            {new Date(capturedAt).toLocaleString('fr-FR')}
          </span>
        )}
      </div>

      {displayUrl ? (
        <div className="relative mb-2">
          <a href={displayUrl} target="_blank" rel="noopener noreferrer" className="block">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={displayUrl}
              alt="Preuve photo"
              className="w-full max-h-48 object-cover rounded-[7px] border border-border"
            />
          </a>
          <button
            type="button"
            onClick={() => { setLocalUrl(''); onSaved?.({ photoUrl: '', note: localNote }); }}
            className="absolute top-2 right-2 p-1 rounded-full bg-backdrop text-white hover:bg-black/50 backdrop-blur-sm"
            aria-label="Retirer la photo"
          >
            <X size={14} />
          </button>
        </div>
      ) : (
        <button
          type="button"
          disabled={uploading}
          onClick={() => fileRef.current?.click()}
          className="w-full flex flex-col items-center justify-center gap-2 py-6 border border-dashed border-border rounded-[7px] hover:bg-accent/50 transition-colors"
        >
          {uploading ? <Loader2 size={22} className="animate-spin text-primary" /> : <ImageIcon size={22} className="text-muted-foreground" />}
          <span className="text-xs text-muted-foreground">{uploading ? 'Envoi…' : 'Prendre ou importer une photo'}</span>
        </button>
      )}

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void upload(f);
          e.target.value = '';
        }}
      />

      <textarea
        value={localNote}
        onChange={(e) => setLocalNote(e.target.value)}
        onBlur={() => {
          if (displayUrl) onSaved?.({ photoUrl: displayUrl, note: localNote });
        }}
        placeholder="Note (signataire, remarque atelier…)"
        rows={2}
        className="w-full mt-2 text-sm bg-background border border-border rounded-[7px] px-3 py-2 resize-none focus-visible:ring-2 focus-visible:ring-primary"
      />

      {!displayUrl && (
        <button
          type="button"
          className="btn btn-out btn-sm mt-2 w-full"
          disabled={uploading}
          onClick={() => fileRef.current?.click()}
        >
          Choisir une image
        </button>
      )}
    </div>
  );
}
