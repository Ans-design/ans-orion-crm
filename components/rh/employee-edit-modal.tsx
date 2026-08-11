'use client';

import { useEffect, useState, useRef } from 'react';
import { Loader2, UserCircle, Save, KeyRound, Paperclip, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { useSession } from 'next-auth/react';
import { canViewPayrollAmounts } from '@/lib/auth/margin-access';
import { hasPermission } from '@/lib/auth/permissions';
import { DEPARTEMENTS, PRESENCE_STATUTS } from '@/lib/constants/rh';
import { getOrionV29Password } from '@/lib/orion-v29-accounts';
import { parseEmployeeNotes, serializeEmployeeNotes, type EmployeeNotesMeta, type EmployeeAttachment } from '@/lib/gpao-meta';

const AUTH_ROLES = [
  'Employé', 'Graphiste', 'Opérateur', 'Commercial', 'Logistique', 'Admin', 'Directeur',
] as const;

type EmployeeFull = {
  id: string;
  matricule: string;
  firstName: string;
  lastName: string;
  poste: string;
  departement: string;
  authRole: string;
  email: string | null;
  tel: string | null;
  presenceStatut: string;
  horaireDebut: string | null;
  bio: string | null;
  station: string | null;
  avatarColor: string | null;
  cantineHeure: string | null;
  salaireBaseMGA: number;
  notesFraisMGA: number;
  heuresSup: number;
  primeMGA: number;
  congeSolde: number;
  notes: string | null;
};

type Props = {
  employeeId: string | null;
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
};

export function EmployeeEditModal({ employeeId, open, onClose, onSaved }: Props) {
  const { data: session } = useSession();
  const role = (session?.user as { role?: string } | undefined)?.role ?? 'user';
  const canEditPayroll = hasPermission(role, 'rh:payroll_write');
  const canSeePayroll = canViewPayrollAmounts(role);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<Partial<EmployeeFull>>({});
  const [rhMeta, setRhMeta] = useState<EmployeeNotesMeta>({ attachments: [] });
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open || !employeeId) return;
    setLoading(true);
    fetch(`/api/rh/employes/${employeeId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((emp) => {
        if (emp) {
          setForm(emp);
          setRhMeta(parseEmployeeNotes(emp.notes));
          const v29pw = getOrionV29Password(emp.matricule);
          if (v29pw && !parseEmployeeNotes(emp.notes).loginPassword) {
            setRhMeta((m) => ({ ...m, loginPassword: v29pw }));
          }
        }
      })
      .finally(() => setLoading(false));
  }, [open, employeeId]);

  const avatarUrl = form.firstName && form.lastName
    ? `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(`${form.firstName}${form.lastName}`)}`
    : '';

  const save = async () => {
    if (!employeeId) return;
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        poste: form.poste,
        departement: form.departement,
        authRole: form.authRole,
        email: form.email,
        tel: form.tel,
        presenceStatut: form.presenceStatut,
        horaireDebut: form.horaireDebut,
        bio: form.bio,
        station: form.station,
        avatarColor: form.avatarColor,
        cantineHeure: form.cantineHeure,
        notes: serializeEmployeeNotes({ ...rhMeta, userNotes: rhMeta.userNotes }),
      };
      if (canEditPayroll) {
        payload.salaireBaseMGA = form.salaireBaseMGA;
        payload.notesFraisMGA = form.notesFraisMGA;
        payload.heuresSup = form.heuresSup;
        payload.primeMGA = form.primeMGA;
      }
      const res = await fetch(`/api/rh/employes/${employeeId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        onSaved();
        onClose();
      }
    } finally {
      setSaving(false);
    }
  };

  const addAttachment = (file: File) => {
    const att: EmployeeAttachment = {
      id: crypto.randomUUID(),
      name: file.name,
      uploadedAt: new Date().toISOString(),
    };
    setRhMeta((m) => ({ ...m, attachments: [...m.attachments, att] }));
  };

  const v29Password = form.matricule ? getOrionV29Password(form.matricule) : null;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserCircle size={20} className="text-[var(--ans-cyan)]" />
            Modifier la fiche employé
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center py-8"><Loader2 className="animate-spin" /></div>
        ) : (
          <div className="space-y-4 text-sm">
            <div className="flex items-center gap-3">
              {avatarUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={avatarUrl} alt="" className="w-14 h-14 rounded-full border-2 border-border" />
              )}
              <div>
                <p className="font-bold">{form.firstName} {form.lastName}</p>
                <p className="text-xs font-mono text-muted-foreground">{form.matricule}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <label className="block text-xs font-bold col-span-2">Poste / Rôle
                <input className="fc mt-1" value={form.poste ?? ''} onChange={(e) => setForm({ ...form, poste: e.target.value })} />
              </label>
              <label className="block text-xs font-bold">Département
                <select className="fc mt-1" value={form.departement ?? ''} onChange={(e) => setForm({ ...form, departement: e.target.value })}>
                  {DEPARTEMENTS.map((d) => <option key={d} value={d}>{d}</option>)}
                </select>
              </label>
              <label className="block text-xs font-bold">Accès système
                <select className="fc mt-1" value={form.authRole ?? ''} onChange={(e) => setForm({ ...form, authRole: e.target.value })}>
                  {AUTH_ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
              </label>
              <label className="block text-xs font-bold col-span-2">Bio / Description
                <textarea className="fc mt-1 min-h-[60px]" value={form.bio ?? ''} onChange={(e) => setForm({ ...form, bio: e.target.value })} />
              </label>
              <label className="block text-xs font-bold">Station / Affectation
                <input className="fc mt-1" value={form.station ?? ''} onChange={(e) => setForm({ ...form, station: e.target.value })} />
              </label>
              <label className="block text-xs font-bold">Statut présence
                <select className="fc mt-1" value={form.presenceStatut ?? ''} onChange={(e) => setForm({ ...form, presenceStatut: e.target.value })}>
                  {PRESENCE_STATUTS.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </label>
              <label className="block text-xs font-bold">Heure d&apos;arrivée
                <input type="time" className="fc mt-1" value={form.horaireDebut ?? '08:00'} onChange={(e) => setForm({ ...form, horaireDebut: e.target.value })} />
              </label>
              <label className="block text-xs font-bold">Couleur avatar
                <input type="color" className="fc mt-1 h-10 p-1" value={form.avatarColor ?? '#F20A3A'} onChange={(e) => setForm({ ...form, avatarColor: e.target.value })} />
              </label>
              <label className="block text-xs font-bold">Heure cantine
                <input type="time" className="fc mt-1" value={form.cantineHeure ?? '12:00'} onChange={(e) => setForm({ ...form, cantineHeure: e.target.value })} />
              </label>
            </div>

            <div className="border-t border-border pt-3 space-y-2">
              <p className="text-xs font-bold uppercase text-muted-foreground mb-1">
                Notes &amp; impacts (SAV / déchets)
              </p>
              {(rhMeta.impacts?.length ?? 0) > 0 ? (
                <ul className="max-h-28 overflow-y-auto space-y-1 rounded-[7px] border border-border bg-muted/20 p-2">
                  {rhMeta.impacts!.slice(0, 12).map((imp) => (
                    <li key={imp.id} className="text-[11px] leading-snug text-muted-foreground">
                      <span className="font-semibold text-foreground">
                        {imp.kind === 'reclamation' ? 'SAV' : 'Déchet'}
                      </span>
                      {' · '}
                      {imp.title}
                      {imp.detail ? ` — ${imp.detail}` : ''}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-[11px] text-muted-foreground m-0">
                  Aucun retour client / déchet lié pour le moment.
                </p>
              )}
              <label className="block text-xs font-bold">
                Notes libres
                <textarea
                  className="fc mt-1 min-h-[64px] text-xs"
                  value={rhMeta.userNotes ?? ''}
                  onChange={(e) => setRhMeta({ ...rhMeta, userNotes: e.target.value })}
                  placeholder="Notes RH…"
                />
              </label>
            </div>

            <div className="border-t border-border pt-3">
              <p className="text-xs font-bold uppercase text-muted-foreground mb-2 flex items-center gap-1">
                <KeyRound size={12} /> Accès connexion
              </p>
              <label className="block text-xs font-bold">Mot de passe employé (matricule)
                <input
                  className="fc mt-1 font-mono"
                  value={rhMeta.loginPassword ?? v29Password ?? ''}
                  onChange={(e) => setRhMeta({ ...rhMeta, loginPassword: e.target.value })}
                  placeholder="Mot de passe pour connexion matricule"
                />
              </label>
              {v29Password && (
                <p className="text-[10px] text-muted-foreground mt-1">Compte v29 HTML — mot de passe officiel : <code className="font-mono">{v29Password}</code></p>
              )}
            </div>

            <div className="border-t border-border pt-3">
              <p className="text-xs font-bold uppercase text-muted-foreground mb-2 flex items-center gap-1">
                <Paperclip size={12} /> Pièces jointes RH
              </p>
              <input ref={fileRef} type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) addAttachment(f);
                e.target.value = '';
              }} />
              {rhMeta.attachments.map((a) => (
                <div key={a.id} className="flex items-center justify-between text-xs border border-border rounded-lg px-2 py-1.5 mb-1">
                  <span className="truncate flex items-center gap-1"><Paperclip size={12} /> {a.name}</span>
                  <button type="button" onClick={() => setRhMeta({ ...rhMeta, attachments: rhMeta.attachments.filter((x) => x.id !== a.id) })} className="text-red-500 p-1"><Trash2 size={12} /></button>
                </div>
              ))}
              <Button type="button" variant="outline" size="sm" className="w-full gap-1 mt-1" onClick={() => fileRef.current?.click()}>
                <Plus size={14} /> Ajouter pièce jointe
              </Button>
            </div>

            {(canSeePayroll || canEditPayroll) && (
            <div className="border-t border-border pt-3">
              <p className="text-xs font-bold uppercase text-muted-foreground mb-2">Variables de paie (MGA)</p>
              <div className="grid grid-cols-2 gap-3">
                <label className="block text-xs font-bold">Salaire de base
                  <input type="number" className="fc mt-1" disabled={!canEditPayroll} value={form.salaireBaseMGA ?? 0} onChange={(e) => setForm({ ...form, salaireBaseMGA: Number(e.target.value) })} />
                </label>
                <label className="block text-xs font-bold">Notes de frais
                  <input type="number" className="fc mt-1" disabled={!canEditPayroll} value={form.notesFraisMGA ?? 0} onChange={(e) => setForm({ ...form, notesFraisMGA: Number(e.target.value) })} />
                </label>
                <label className="block text-xs font-bold">Heures supplémentaires
                  <input type="number" className="fc mt-1" disabled={!canEditPayroll} value={form.heuresSup ?? 0} onChange={(e) => setForm({ ...form, heuresSup: Number(e.target.value) })} />
                </label>
                <label className="block text-xs font-bold">Prime
                  <input type="number" className="fc mt-1" disabled={!canEditPayroll} value={form.primeMGA ?? 0} onChange={(e) => setForm({ ...form, primeMGA: Number(e.target.value) })} />
                </label>
              </div>
            </div>
            )}
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="outline" onClick={onClose}>Annuler</Button>
          <Button className="ans-btn-primary" disabled={saving || loading} onClick={save}>
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            Enregistrer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
