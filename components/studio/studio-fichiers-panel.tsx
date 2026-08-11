'use client';

import { useCallback, useEffect, useState } from 'react';
import { Loader2, Upload, FileImage, FolderOpen } from 'lucide-react';
import { FILE_CATEGORIES } from '@/lib/constants/studio';
import { unwrapListItems } from '@/lib/api-client';
import { uxToast } from '@/lib/ux/feedback';
import { AppButton, AppEmptyState } from '@/components/ui/app-ui';

type StudioFile = {
  id: string;
  name: string;
  category: string;
  versionLabel: string | null;
  mimeType: string;
  sizeBytes: number;
  uploadedBy: string | null;
  createdAt: string;
  studioBrief?: { titre: string; commande?: { numero: string } } | null;
  client?: { name: string } | null;
};

function fmtSize(bytes: number) {
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}

export function StudioFichiersPanel({ commandeId }: { commandeId?: string | null }) {
  const [files, setFiles] = useState<StudioFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState('tous');
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState({ briefId: '', category: 'source', versionLabel: 'V1' });

  const load = useCallback(() => {
    setLoading(true);
    const p = new URLSearchParams();
    if (category !== 'tous') p.set('category', category);
    if (commandeId) p.set('commandeId', commandeId);
    const q = p.toString() ? `?${p}` : '';
    fetch(`/api/studio/fichiers${q}`)
      .then(async (r) => {
        if (!r.ok) throw new Error('load');
        return unwrapListItems<StudioFile>(await r.json());
      })
      .then(setFiles)
      .catch(() => {
        setFiles([]);
        uxToast.error('Impossible de charger les fichiers studio');
      })
      .finally(() => setLoading(false));
  }, [category, commandeId]);

  useEffect(() => { load(); }, [load]);

  const upload = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const input = (e.target as HTMLFormElement).elements.namedItem('file') as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      if (form.briefId) fd.append('briefId', form.briefId);
      fd.append('category', form.category);
      if (form.versionLabel) fd.append('versionLabel', form.versionLabel);
      if (commandeId) fd.append('commandeId', commandeId);

      const res = await fetch('/api/studio/fichiers', { method: 'POST', body: fd });
      if (!res.ok) {
        uxToast.error('Échec upload');
        return;
      }
      uxToast.success('Fichier ajouté');
      input.value = '';
      load();
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="studio-files">
      <form onSubmit={upload} className="studio-files-upload">
        <div className="studio-files-upload__grid">
          <label className="studio-files-field studio-files-field--file">
            <span>Fichier</span>
            <input name="file" type="file" required />
          </label>
          <label className="studio-files-field">
            <span>ID brief (opt.)</span>
            <input
              value={form.briefId}
              onChange={(e) => setForm({ ...form, briefId: e.target.value })}
              placeholder="cuid…"
              className="fc"
            />
          </label>
          <label className="studio-files-field">
            <span>Catégorie</span>
            <select
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              className="orion-filter-select"
            >
              {FILE_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </label>
          <label className="studio-files-field">
            <span>Version</span>
            <input
              value={form.versionLabel}
              onChange={(e) => setForm({ ...form, versionLabel: e.target.value })}
              className="fc"
              placeholder="V1"
            />
          </label>
          <AppButton type="submit" size="sm" disabled={uploading} className="studio-files-upload__btn">
            {uploading ? <Loader2 className="animate-spin" size={14} /> : <Upload size={14} />}
            {uploading ? 'Envoi…' : 'Upload'}
          </AppButton>
        </div>
      </form>

      <div className="studio-files__toolbar">
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="orion-filter-select"
          aria-label="Filtrer par catégorie"
        >
          <option value="tous">Toutes catégories</option>
          {FILE_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="animate-spin text-primary" />
        </div>
      ) : files.length === 0 ? (
        <AppEmptyState
          icon={FolderOpen}
          title="Aucun fichier studio"
          description="Uploadez une source client ou un livrable pour démarrer."
        />
      ) : (
        <div className="studio-files-grid">
          {files.map((f) => (
            <article key={f.id} className="studio-file-card">
              <div className="studio-file-card__icon" aria-hidden>
                <FileImage size={16} strokeWidth={2} />
              </div>
              <div className="studio-file-card__body">
                <h3 className="studio-file-card__name">{f.name}</h3>
                <p className="studio-file-card__meta">
                  {f.studioBrief?.titre ?? f.client?.name ?? 'Sans brief'}
                  {f.studioBrief?.commande?.numero ? ` · ${f.studioBrief.commande.numero}` : ''}
                </p>
                <div className="studio-file-card__tags">
                  <span className="studio-file-tag">{f.category}</span>
                  <span className="studio-file-tag studio-file-tag--mono">{f.versionLabel ?? '—'}</span>
                  <span className="studio-file-tag studio-file-tag--muted">{fmtSize(f.sizeBytes)}</span>
                </div>
                <p className="studio-file-card__foot">
                  {f.uploadedBy ?? '—'} · {new Date(f.createdAt).toLocaleDateString('fr-FR')}
                </p>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
