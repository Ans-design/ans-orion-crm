'use client';

import { useState } from 'react';
import { uxToast } from '@/lib/ux/feedback';
import { getApiErrorMessage } from '@/lib/api-client';
import { GitMerge } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';

type ClientOption = { id: string; code: string; name: string };

type Props = {
  open: boolean;
  onClose: () => void;
  /** Client à conserver (cible) */
  target: ClientOption | null;
  /** Clients proposés comme source (doublons) */
  sources: ClientOption[];
  onMerged: (targetId: string) => void;
};

export function ClientMergeDialog({ open, onClose, target, sources, onMerged }: Props) {
  const [sourceId, setSourceId] = useState('');
  const [loading, setLoading] = useState(false);

  const runMerge = async () => {
    if (!target || !sourceId || sourceId === target.id) {
      uxToast.error('Sélectionnez un client source différent de la cible');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/clients/merge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sourceId, targetId: target.id }),
      });
      const data = await res.json();
      if (!res.ok) {
        uxToast.error(getApiErrorMessage(data, 'Fusion impossible'), 'Fusion impossible');
        return;
      }
      uxToast.success(`Fusion OK — ${data.source?.code} → ${data.target?.code}`);
      onMerged(target.id);
      onClose();
    } catch {
      uxToast.error('Erreur réseau');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GitMerge size={18} /> Fusion admin clients
          </DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Le client source sera archivé. Historique (devis, commandes, paiements, fichiers, SAV) transféré vers la cible.
        </p>
        {target && (
          <div className="rounded-lg border border-border p-3 text-sm">
            <p className="text-xs text-muted-foreground mb-1">Client cible (conservé)</p>
            <p className="font-semibold">{target.name} <span className="text-muted-foreground">({target.code})</span></p>
          </div>
        )}
        <label className="block text-xs font-bold">
          Client source à fusionner
          <select
            className="fc mt-1 w-full"
            value={sourceId}
            onChange={(e) => setSourceId(e.target.value)}
            disabled={loading}
          >
            <option value="">— Choisir —</option>
            {sources.filter((s) => s.id !== target?.id).map((s) => (
              <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
            ))}
          </select>
        </label>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={loading}>Annuler</Button>
          <Button onClick={runMerge} disabled={loading || !sourceId}>
            {loading ? 'Fusion…' : 'Confirmer la fusion'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
