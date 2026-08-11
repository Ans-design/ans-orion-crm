'use client';

import { useCallback, useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import '@/components/backoffice-v2/admin-backoffice.css';

type LimitRow = {
  id?: string;
  excelId?: string;
  materialKey: string;
  materialLabel: string;
  formatMax?: string | null;
  widthMaxMm?: number | null;
  heightMaxMm?: number | null;
  unit?: string;
  messagePos?: string;
  active?: boolean;
  details?: string | null;
};

export default function LimitesMatieresFormatsPage() {
  const { data: session } = useSession();
  const role = (session?.user as { role?: string } | undefined)?.role;
  const canEdit = role === 'admin' || role === 'manager' || role === 'direction';
  const [rows, setRows] = useState<LimitRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin-backoffice/pricing/event-rules?kind=limits');
      const json = await res.json();
      if (json.ok) setRows(json.data.rows ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function syncPos() {
    if (!canEdit) return;
    const res = await fetch('/api/admin-backoffice/pricing/event-rules', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'sync' }),
    });
    const json = await res.json();
    setMsg(json.ok ? 'Limites synchronisées POS' : (json.error ?? 'Erreur'));
  }

  return (
    <div className="ab2-shell max-w-[1400px] mx-auto px-4 py-4 space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Limites matières / formats</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Formats au-delà du max sont grisés au POS (« Format non disponible pour cette matière »).
          </p>
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={() => void load()}>Actualiser</Button>
          {canEdit && <Button type="button" onClick={() => void syncPos()}>Sync POS</Button>}
        </div>
      </div>
      {msg && <p className="text-sm text-emerald-700">{msg}</p>}
      {loading ? (
        <p className="text-muted-foreground">Chargement…</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                {['ID', 'MATIÈRE', 'FORMAT MAX', 'L MAX MM', 'H MAX MM', 'MESSAGE POS', 'ACTIF'].map((c) => (
                  <th key={c} className="px-3 py-2 text-left font-medium">{c}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={r.id ?? r.materialKey ?? i} className="border-t">
                  <td className="px-3 py-2">{r.excelId ?? '—'}</td>
                  <td className="px-3 py-2 font-medium">{r.materialLabel}</td>
                  <td className="px-3 py-2">{r.formatMax ?? '—'}</td>
                  <td className="px-3 py-2">{r.widthMaxMm ?? '—'}</td>
                  <td className="px-3 py-2">{r.heightMaxMm ?? '—'}</td>
                  <td className="px-3 py-2 text-muted-foreground">{r.messagePos}</td>
                  <td className="px-3 py-2">{r.active === false ? 'non' : 'oui'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
