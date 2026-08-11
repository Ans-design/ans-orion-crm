'use client';

import { useCallback, useEffect, useState } from 'react';
import { ShoppingBag, Loader2, Plus } from 'lucide-react';
import { ANS } from '@/lib/ans-colors';
import { PAYMENT_MODES } from '@/lib/constants/finance-adv';

type Sale = {
  id: string;
  label: string;
  quantity: number;
  unitPrice: number;
  total: number;
  mode: string;
  soldAt: string;
  stockItem?: { sku: string; label: string } | null;
  client?: { name: string } | null;
};

function fmt(n: number) {
  return new Intl.NumberFormat('fr-MG').format(Math.round(n)) + ' Ar';
}

export default function VentesDirectesPage() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ label: '', quantity: '1', unitPrice: '', mode: 'Espèces' });
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    fetch('/api/finance/ventes-directes')
      .then((r) => (r.ok ? r.json() : []))
      .then((d) => setSales(Array.isArray(d) ? d : []))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch('/api/finance/ventes-directes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          label: form.label,
          quantity: parseFloat(form.quantity),
          unitPrice: parseFloat(form.unitPrice),
          mode: form.mode,
        }),
      });
      if (res.ok) {
        setForm({ label: '', quantity: '1', unitPrice: '', mode: 'Espèces' });
        setShowForm(false);
        load();
      }
    } finally {
      setSaving(false);
    }
  };

  const totalMois = sales.reduce((s, v) => s + v.total, 0);

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2" style={{ color: ANS.bgDark }}>
            <ShoppingBag size={28} style={{ color: ANS.yellow }} />
            Ventes directes stock
          </h1>
          <p className="text-sm text-gray-500 mt-1">Sorties comptoir — décrémentation stock automatique</p>
        </div>
        <button type="button" onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-medium"
          style={{ background: ANS.red }}>
          <Plus size={16} /> Nouvelle vente
        </button>
      </div>

      <div className="bg-card rounded-[7px] border border-border p-4 inline-block">
        <span className="text-xs text-gray-500">Total ventes listées</span>
        <div className="text-2xl font-bold" style={{ color: ANS.bgDark }}>{fmt(totalMois)}</div>
      </div>

      {showForm && (
        <form onSubmit={submit} className="bg-card rounded-[7px] border border-border p-4 grid md:grid-cols-4 gap-3">
          <input required placeholder="Article / libellé" value={form.label}
            onChange={(e) => setForm({ ...form, label: e.target.value })}
            className="border rounded-lg px-3 py-2 text-sm md:col-span-2" />
          <input required type="number" step="0.01" placeholder="Qté" value={form.quantity}
            onChange={(e) => setForm({ ...form, quantity: e.target.value })}
            className="border rounded-lg px-3 py-2 text-sm" />
          <input required type="number" placeholder="Prix unitaire" value={form.unitPrice}
            onChange={(e) => setForm({ ...form, unitPrice: e.target.value })}
            className="border rounded-lg px-3 py-2 text-sm" />
          <select value={form.mode} onChange={(e) => setForm({ ...form, mode: e.target.value })}
            className="border rounded-lg px-3 py-2 text-sm">
            {PAYMENT_MODES.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
          <button type="submit" disabled={saving}
            className="px-4 py-2 rounded-lg text-white text-sm font-medium"
            style={{ background: ANS.bgDark }}>
            {saving ? '...' : 'Valider vente'}
          </button>
        </form>
      )}

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="animate-spin" style={{ color: ANS.red }} /></div>
      ) : (
        <div className="bg-card rounded-[7px] border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs text-gray-500 uppercase">
              <tr>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Article</th>
                <th className="px-4 py-3">Client</th>
                <th className="px-4 py-3 text-right">Qté</th>
                <th className="px-4 py-3 text-right">Total</th>
                <th className="px-4 py-3">Mode</th>
              </tr>
            </thead>
            <tbody>
              {sales.map((s) => (
                <tr key={s.id} className="border-t hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-500">{new Date(s.soldAt).toLocaleDateString('fr-FR')}</td>
                  <td className="px-4 py-3 font-medium">{s.label}</td>
                  <td className="px-4 py-3">{s.client?.name ?? '—'}</td>
                  <td className="px-4 py-3 text-right">{s.quantity}</td>
                  <td className="px-4 py-3 text-right font-semibold" style={{ color: '#22c55e' }}>{fmt(s.total)}</td>
                  <td className="px-4 py-3">{s.mode}</td>
                </tr>
              ))}
              {sales.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">Aucune vente directe</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
