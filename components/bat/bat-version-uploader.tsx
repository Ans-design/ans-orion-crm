'use client';

import { useEffect, useRef, useState } from 'react';
import { uxToast } from '@/lib/ux/feedback';
import { Upload } from 'lucide-react';
import { BatFilePreview, BatFilePreviewPlaceholder } from '@/components/bat/bat-file-preview';
import { FILE_VERSION_LABELS } from '@/lib/constants/file-assets';
import { unwrapApiData, getApiErrorMessage } from '@/lib/api-client';
type ProofVersion = {
  versionLabel: string;
  statut: string;
  fileAssetId?: string | null;
  file?: { id: string; name: string; mimeType: string } | null;
};

type Props = {
  proofId: string;
  locked?: boolean;
  versions?: ProofVersion[];
  onUploaded: () => void;
};

export function BatVersionUploader({ proofId, locked, versions = [], onUploaded }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [versionLabel, setVersionLabel] = useState('v1');
  const [uploading, setUploading] = useState(false);
  const [previewFile, setPreviewFile] = useState<{ id: string; name: string; mimeType: string } | null>(null);

  useEffect(() => {
    const latest = versions.find((v) => v.file?.id);
    if (latest?.file) setPreviewFile(latest.file);
    else if (versions[0]?.fileAssetId) {
      setPreviewFile({ id: versions[0].fileAssetId, name: versions[0].versionLabel, mimeType: 'application/pdf' });
    }
  }, [versions]);

  const uploadVersion = async (file: File) => {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('versionLabel', versionLabel);
      const r = await fetch(`/api/proofs/${proofId}/versions/upload`, { method: 'POST', body: fd });
      if (!r.ok) {
        const d = await r.json().catch(() => ({}));
        uxToast.error(getApiErrorMessage(d, 'Upload BAT échoué'), 'Upload BAT échoué');
        return;
      }
      const d = unwrapApiData<{ fileAsset?: { id: string; name: string; mimeType: string } }>(await r.json());
      if (d?.fileAsset) setPreviewFile(d.fileAsset);
      uxToast.success(`Version ${versionLabel} déposée`);
      onUploaded();
    } finally {
      setUploading(false);
    }
  };

  if (locked) {
    return previewFile ? (
      <BatFilePreview fileId={previewFile.id} name={previewFile.name} mimeType={previewFile.mimeType} compact />
    ) : (
      <BatFilePreviewPlaceholder label="BAT verrouillé — sans fichier" />
    );
  }

  return (
    <div className="space-y-2">
      {previewFile ? (
        <BatFilePreview fileId={previewFile.id} name={previewFile.name} mimeType={previewFile.mimeType} compact />
      ) : (
        <BatFilePreviewPlaceholder label="Déposez un PDF ou visuel pour l'aperçu BAT" />
      )}
      <div className="flex flex-wrap gap-2 items-center">
        <select
          value={versionLabel}
          onChange={(e) => setVersionLabel(e.target.value)}
          className="text-[10px] bg-card border border-border rounded-lg px-2 py-1"
        >
          {FILE_VERSION_LABELS.map((v) => (
            <option key={v} value={v}>{v}</option>
          ))}
        </select>
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          accept=".pdf,.png,.jpg,.jpeg,.webp,.ai,.psd"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void uploadVersion(f);
            e.target.value = '';
          }}
        />
        <button
          type="button"
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
          className="text-[10px] px-2 py-1 rounded-lg border border-[var(--ans-cyan)]/40 text-[var(--ans-cyan)] flex items-center gap-1"
        >
          <Upload size={10} /> {uploading ? 'Envoi…' : 'Version BAT'}
        </button>
      </div>
    </div>
  );
}
