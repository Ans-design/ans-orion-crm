'use client';

import { useEffect, useState } from 'react';
import { uxToast } from '@/lib/ux/feedback';
import { Bell, Save } from 'lucide-react';
import { SettingsHeader, SettingsCard } from '../_components/settings-header';
import { DEFAULT_NOTIFICATIONS } from '@/lib/settings-defaults';
import { AppButton } from '@/components/ui/app-ui';

const ALERT_TYPES = [
  { key: 'devis', label: 'Devis', desc: 'Création, acceptation, refus' },
  { key: 'commandes', label: 'Commandes', desc: 'Nouvelles commandes et changements de statut' },
  { key: 'factures', label: 'Factures', desc: 'Factures émises et impayées' },
  { key: 'paiements', label: 'Paiements', desc: 'Acomptes, soldes, remboursements' },
  { key: 'production', label: 'Production', desc: 'Avancement atelier et blocages' },
  { key: 'livraisons', label: 'Livraisons', desc: 'Expéditions et confirmations' },
  { key: 'audit', label: 'Audit', desc: 'Actions sensibles du système' },
];

export default function NotificationsPage() {
  const [prefs, setPrefs] = useState({ ...DEFAULT_NOTIFICATIONS });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch('/api/settings?category=notifications')
      .then((r) => r.ok ? r.json() : null)
      .then((d) => { if (d) setPrefs((p) => ({ ...p, ...d })); });
  }, []);

  const toggle = (key: string) => setPrefs((p) => ({ ...p, [key]: !(p as any)[key] }));

  const save = async () => {
    setSaving(true);
    const r = await fetch('/api/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ category: 'notifications', data: prefs }),
    });
    if (r.ok) uxToast.success('Préférences enregistrées');
    else uxToast.error('Erreur de sauvegarde');
    setSaving(false);
  };

  return (
    <div className="dashboard-full space-y-6 w-full max-w-none">
      <SettingsHeader title="Notifications" description="Alertes in-app, email et préférences" />

      <SettingsCard>
        <h3 className="font-semibold text-sm mb-4 flex items-center gap-2"><Bell size={16} className="text-orange-500" /> Alertes par module</h3>
        <div className="space-y-3">
          {ALERT_TYPES.map(({ key, label, desc }) => (
            <label key={key} className="flex items-start justify-between gap-4 p-3 rounded-lg hover:bg-accent/50 cursor-pointer">
              <div>
                <p className="text-sm font-medium">{label}</p>
                <p className="text-xs text-muted-foreground">{desc}</p>
              </div>
              <input type="checkbox" checked={(prefs as any)[key] !== false} onChange={() => toggle(key)} className="mt-1 rounded" />
            </label>
          ))}
        </div>
      </SettingsCard>

      <SettingsCard>
        <h3 className="font-semibold text-sm mb-4">Canal de notification</h3>
        <div className="space-y-3">
          <label className="flex items-center justify-between">
            <span className="text-sm">Notifications in-app (cloche)</span>
            <input type="checkbox" checked={prefs.desktopEnabled} onChange={(e) => setPrefs((p) => ({ ...p, desktopEnabled: e.target.checked }))} className="rounded" />
          </label>
          <label className="flex items-center justify-between">
            <span className="text-sm">Alertes email</span>
            <input type="checkbox" checked={prefs.emailAlerts} onChange={(e) => setPrefs((p) => ({ ...p, emailAlerts: e.target.checked }))} className="rounded" />
          </label>
          {prefs.emailAlerts && (
            <>
              <input type="email" value={prefs.alertEmail} onChange={(e) => setPrefs((p) => ({ ...p, alertEmail: e.target.value }))}
                placeholder="email@exemple.com" className="w-full bg-accent border border-border rounded-lg px-3 py-2 text-sm outline-none" />
              <p className="text-xs text-muted-foreground">Requiert <code className="text-[10px]">RESEND_API_KEY</code> et <code className="text-[10px]">EMAIL_FROM</code> sur le serveur.</p>
            </>
          )}
          <label className="flex items-center justify-between">
            <span className="text-sm">Son de notification</span>
            <input type="checkbox" checked={prefs.soundEnabled} onChange={(e) => setPrefs((p) => ({ ...p, soundEnabled: e.target.checked }))} className="rounded" />
          </label>
        </div>
      </SettingsCard>

      <AppButton onClick={save} disabled={saving} className="gap-2">
        <Save size={16} /> {saving ? 'Enregistrement...' : 'Enregistrer'}
      </AppButton>
    </div>
  );
}
