'use client';

import { useCallback, useEffect, useState } from 'react';
import { Loader2, Radio, Plus, Trash2 } from 'lucide-react';

type TickerMsg = { id: string; text: string; active: boolean; priority: string };

const TYPE_PREFIX = [
  { value: '⚠', label: '⚠ Avertissement' },
  { value: '🚨', label: '🚨 Alerte Critique' },
  { value: 'ℹ', label: 'ℹ Information' },
  { value: '✅', label: '✅ Info Positive' },
  { value: '📅', label: '📅 Évènement' },
];

export default function AdminTickerPage() {
  const [messages, setMessages] = useState<TickerMsg[]>([]);
  const [loading, setLoading] = useState(true);
  const [newPrefix, setNewPrefix] = useState('⚠');
  const [newText, setNewText] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    fetch('/api/admin/ticker')
      .then((r) => (r.ok ? r.json() : { messages: [] }))
      .then((d) => setMessages(d.messages ?? []))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const active = messages.filter((m) => m.active);

  const toggle = async (id: string, active: boolean) => {
    await fetch('/api/admin/ticker', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, active }),
    });
    load();
  };

  const remove = async (id: string) => {
    await fetch(`/api/admin/ticker?id=${id}`, { method: 'DELETE' });
    load();
  };

  const add = async () => {
    if (!newText.trim()) return;
    setSaving(true);
    try {
      await fetch('/api/admin/ticker', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: `${newPrefix} ${newText.trim()}` }),
      });
      setNewText('');
      load();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="dashboard-full space-y-5 w-full max-w-none">
      <header className="flex flex-wrap justify-between items-center gap-3 pb-4 border-b border-border">
        <div>
          <h1 className="font-display text-2xl font-bold">📢 Gestion des Alertes & Bandeau Info</h1>
          <p className="text-sm text-muted-foreground">
            Messages destinés à toute l&apos;équipe (bandeau Live). Les tâches de chaque poste s&apos;affichent automatiquement en plus, uniquement pour l&apos;employé concerné.
          </p>
        </div>
      </header>

      <div className="rounded-[7px] bg-red-700 text-white p-4">
        <div className="text-[9px] font-black uppercase opacity-60 mb-2 tracking-widest">📺 Prévisualisation du bandeau</div>
        <div className="text-xs font-semibold leading-relaxed flex flex-wrap gap-2">
          {active.length === 0 ? (
            <span className="opacity-50">Aucun message actif</span>
          ) : active.map((m) => (
            <span key={m.id} className="inline-block bg-white/12 rounded px-2 py-0.5">{m.text}</span>
          ))}
        </div>
      </div>

      <div className="ans-card-premium p-5">
        <div className="flex justify-between items-center mb-4">
          <h2 className="font-semibold text-sm flex items-center gap-2"><Radio size={16} /> Messages du bandeau</h2>
          <span className="text-xs text-muted-foreground">{active.length} actif(s) sur {messages.length}</span>
        </div>
        {loading ? (
          <div className="py-8 flex justify-center"><Loader2 className="animate-spin" /></div>
        ) : (
          <div className="space-y-1">
            {messages.map((m) => (
              <div key={m.id} className="flex items-start gap-3 py-3 border-b border-border">
                <input type="checkbox" checked={m.active} onChange={(e) => toggle(m.id, e.target.checked)} className="accent-red-600 mt-1" />
                <div className="flex-1 min-w-0">
                  <div className={`text-xs leading-relaxed ${m.active ? 'font-bold' : 'text-muted-foreground'}`}>{m.text}</div>
                  <div className="text-[10px] text-muted-foreground mt-1">{m.active ? '✅ Affiché sur le bandeau' : '⏸ Désactivé'}</div>
                </div>
                <button
                  type="button"
                  className="inline-flex items-center justify-center rounded-[7px] p-2 text-[var(--danger,#ef4444)] bg-[color-mix(in_srgb,var(--danger,#ef4444)_12%,transparent)] hover:bg-[color-mix(in_srgb,var(--danger,#ef4444)_20%,transparent)] transition-colors"
                  onClick={() => remove(m.id)}
                  aria-label="Supprimer"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="ans-card-premium p-5">
        <h2 className="font-semibold text-sm mb-3 flex items-center gap-2"><Plus size={16} /> Ajouter un message</h2>
        <div className="grid grid-cols-[140px_1fr_auto] gap-2 items-center">
          <select className="fc text-xs" value={newPrefix} onChange={(e) => setNewPrefix(e.target.value)}>
            {TYPE_PREFIX.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
          <input className="fc text-sm" placeholder="Texte du message…" value={newText} onChange={(e) => setNewText(e.target.value)} />
          <button type="button" disabled={saving} className="btn btn-r btn-sm" onClick={add}>Ajouter</button>
        </div>
      </div>
    </div>
  );
}
