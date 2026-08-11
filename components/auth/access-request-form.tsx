'use client';

import { useRef, useState } from 'react';
import { uxToast } from '@/lib/ux/feedback';
import { Send, ArrowLeft, Search, CheckCircle2, Clock, XCircle, Paperclip } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ACCESS_REQUEST_ROLES, ACCESS_REQUEST_PROBLEM_TYPES, ACCESS_REQUEST_PROBLEM_LABELS } from '@/lib/validators/access-request';

const SERVICES = [
  'Commercial / Devis',
  'Studio / Prépresse',
  'Production atelier',
  'Logistique / Livraison',
  'Finance / Caisse',
  'RH / Paie',
  'Autre',
] as const;

const STATUS_UI: Record<string, { label: string; icon: typeof Clock; color: string }> = {
  envoye: { label: 'Envoyée', icon: Send, color: 'text-slate-600 dark:text-slate-300' },
  en_attente: { label: 'En attente', icon: Clock, color: 'text-amber-500' },
  accepte: { label: 'Acceptée', icon: CheckCircle2, color: 'text-green-600' },
  refuse: { label: 'Refusée', icon: XCircle, color: 'text-red-600' },
  traitee: { label: 'Traitée', icon: CheckCircle2, color: 'text-emerald-600' },
};

type Props = {
  onBack: () => void;
  compact?: boolean;
};

export function AccessRequestForm({ onBack, compact = false }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [mode, setMode] = useState<'form' | 'status'>('form');
  const [nom, setNom] = useState('');
  const [email, setEmail] = useState('');
  const [telephone, setTelephone] = useState('');
  const [matricule, setMatricule] = useState('');
  const [problemType, setProblemType] = useState('');
  const [roleDemande, setRoleDemande] = useState('');
  const [service, setService] = useState('');
  const [message, setMessage] = useState('');
  const [attachmentName, setAttachmentName] = useState('');
  const [attachmentContent, setAttachmentContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [statusToken, setStatusToken] = useState('');
  const [statusResult, setStatusResult] = useState<{
    found: boolean;
    statut?: string;
    statutLabel?: string;
    nom?: string;
    message?: string;
    reviewNote?: string | null;
  } | null>(null);

  const onFilePick = (file: File | undefined) => {
    if (!file || file.size > 1_500_000) {
      if (file) uxToast.error('Pièce jointe max 1,5 Mo');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const b64 = String(reader.result ?? '').split(',')[1] ?? '';
      setAttachmentName(file.name);
      setAttachmentContent(b64);
    };
    reader.readAsDataURL(file);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    try {
      const res = await fetch('/api/auth/access-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nom, email, telephone, matricule, problemType, roleDemande, service, message,
          attachmentName: attachmentName || undefined,
          attachmentContent: attachmentContent || undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        uxToast.error((data as { error?: string }).error, 'Envoi impossible');
        return;
      }
      const token = (data as { statusToken?: string }).statusToken;
      if (token) {
        setStatusToken(token);
        try { localStorage.setItem('orion-access-status-token', token); } catch { /* ignore */ }
      }
      setSent(true);
      uxToast.success('Demande envoyée — un administrateur vous contactera.');
    } catch {
      uxToast.error('Erreur réseau');
    } finally {
      setLoading(false);
    }
  };

  const checkStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = statusToken.trim() || (typeof localStorage !== 'undefined' ? localStorage.getItem('orion-access-status-token') : '') || '';
    if (!token) {
      uxToast.error('Collez le jeton reçu lors de l\'envoi de votre demande');
      return;
    }
    setLoading(true);
    setStatusResult(null);
    try {
      const res = await fetch(`/api/auth/access-request/status?token=${encodeURIComponent(token)}`);
      const data = await res.json();
      setStatusResult(data);
    } catch {
      uxToast.error('Erreur réseau');
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    const ui = STATUS_UI.en_attente;
    const Icon = ui.icon;
    return (
      <div className="space-y-4 text-center py-2">
        <Icon size={32} className={`mx-auto ${ui.color}`} />
        <p className="text-sm text-foreground font-medium">Demande envoyée</p>
        <p className="text-xs text-muted-foreground">
          Statut : <span className={`font-semibold ${ui.color}`}>{ui.label}</span> — un administrateur traitera votre demande sous peu.
        </p>
        {statusToken && (
          <p className="text-[10px] text-muted-foreground break-all bg-accent rounded-[7px] p-2">
            Jeton de suivi (conservez-le) : <span className="font-mono">{statusToken.slice(0, 24)}…</span>
          </p>
        )}
        <Button type="button" variant="outline" className="w-full" onClick={onBack}>
          <ArrowLeft size={14} className="mr-1" /> Retour connexion
        </Button>
      </div>
    );
  }

  if (mode === 'status') {
    const stat = statusResult?.statut ? STATUS_UI[statusResult.statut] : null;
    const StatIcon = stat?.icon ?? Search;
    return (
      <form onSubmit={checkStatus} className="space-y-3">
        <p className="text-xs text-muted-foreground">Consultez le statut de votre demande d&apos;accès.</p>
        <div>
          <label htmlFor="status-token" className="text-xs font-semibold text-muted-foreground mb-1 block">Jeton de suivi (reçu à l&apos;envoi)</label>
          <Input
            id="status-token"
            type="text"
            value={statusToken}
            onChange={(e) => setStatusToken(e.target.value)}
            placeholder="Collez votre jeton ici"
            required
            disabled={loading}
          />
        </div>
        {statusResult && (
          <div className="rounded-[7px] border border-border p-3 text-sm text-left">
            {statusResult.found ? (
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <StatIcon size={18} className={stat?.color} />
                  <span>
                    <strong>{statusResult.nom}</strong> — statut{' '}
                    <span className={stat?.color}>{statusResult.statutLabel ?? statusResult.statut}</span>
                  </span>
                </div>
                {statusResult.reviewNote ? (
                  <p className="text-xs text-muted-foreground pl-6">
                    Motif : {statusResult.reviewNote}
                  </p>
                ) : null}
              </div>
            ) : (
              <p className="text-muted-foreground">{statusResult.message}</p>
            )}
          </div>
        )}
        <Button type="submit" className="w-full ans-btn-primary" loading={loading}>
          <Search size={14} className="mr-1" /> Vérifier le statut
        </Button>
        <button type="button" onClick={() => setMode('form')} className="w-full text-xs text-primary hover:underline">
          Nouvelle demande d&apos;accès
        </button>
        <button type="button" onClick={onBack} className="w-full text-xs text-muted-foreground hover:underline">
          Retour à la connexion
        </button>
      </form>
    );
  }

  return (
    <form onSubmit={submit} className={`space-y-3 ${compact ? '' : ''}`}>
      <p className="text-xs text-muted-foreground mb-1">
        Remplissez ce formulaire — votre demande sera transmise à l&apos;administrateur ORION.
      </p>
      <div>
        <label htmlFor="access-nom" className="text-xs font-semibold text-muted-foreground mb-1 block">Nom complet *</label>
        <Input id="access-nom" value={nom} onChange={(e) => setNom(e.target.value)} required disabled={loading} />
      </div>
      <div>
        <label htmlFor="access-email" className="text-xs font-semibold text-muted-foreground mb-1 block">Email *</label>
        <Input id="access-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required disabled={loading} />
      </div>
      <div>
        <label htmlFor="access-problem" className="text-xs font-semibold text-muted-foreground mb-1 block">Type de problème *</label>
        <select
          id="access-problem"
          value={problemType}
          onChange={(e) => setProblemType(e.target.value)}
          className="w-full text-sm bg-background border border-border rounded-[7px] px-3 py-2 focus-visible:ring-2 focus-visible:ring-primary"
          disabled={loading}
          required
        >
          <option value="">— Choisir —</option>
          {ACCESS_REQUEST_PROBLEM_TYPES.map((t) => (
            <option key={t} value={t}>{ACCESS_REQUEST_PROBLEM_LABELS[t]}</option>
          ))}
        </select>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label htmlFor="access-tel" className="text-xs font-semibold text-muted-foreground mb-1 block">Téléphone</label>
          <Input id="access-tel" value={telephone} onChange={(e) => setTelephone(e.target.value)} placeholder="+261 …" disabled={loading} />
        </div>
        <div>
          <label htmlFor="access-matricule" className="text-xs font-semibold text-muted-foreground mb-1 block">Matricule</label>
          <Input id="access-matricule" value={matricule} onChange={(e) => setMatricule(e.target.value.toUpperCase())} placeholder="COM01" disabled={loading} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label htmlFor="access-service" className="text-xs font-semibold text-muted-foreground mb-1 block">Service demandé</label>
          <select
            id="access-service"
            value={service}
            onChange={(e) => setService(e.target.value)}
            className="w-full text-sm bg-background border border-border rounded-[7px] px-3 py-2 focus-visible:ring-2 focus-visible:ring-primary"
            disabled={loading}
          >
            <option value="">— Choisir —</option>
            {SERVICES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="access-role" className="text-xs font-semibold text-muted-foreground mb-1 block">Rôle demandé</label>
          <select
            id="access-role"
            value={roleDemande}
            onChange={(e) => setRoleDemande(e.target.value)}
            className="w-full text-sm bg-background border border-border rounded-[7px] px-3 py-2 focus-visible:ring-2 focus-visible:ring-primary"
            disabled={loading}
          >
            <option value="">— Choisir —</option>
            {ACCESS_REQUEST_ROLES.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        </div>
      </div>
      <div>
        <label htmlFor="access-message" className="text-xs font-semibold text-muted-foreground mb-1 block">Message</label>
        <textarea
          id="access-message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={3}
          className="w-full text-sm bg-background border border-border rounded-[7px] px-3 py-2 resize-none focus-visible:ring-2 focus-visible:ring-primary"
          placeholder="Précisez votre besoin d'accès…"
          disabled={loading}
        />
      </div>
      <div>
        <label className="text-xs font-semibold text-muted-foreground mb-1 block">Pièce jointe (optionnel, max 1,5 Mo)</label>
        <input ref={fileRef} type="file" className="hidden" accept=".pdf,.png,.jpg,.jpeg,.doc,.docx" onChange={(e) => onFilePick(e.target.files?.[0])} />
        <Button type="button" variant="outline" size="sm" className="w-full" onClick={() => fileRef.current?.click()} disabled={loading}>
          <Paperclip size={14} className="mr-1" />
          {attachmentName || 'Joindre un fichier'}
        </Button>
      </div>
      <Button type="submit" className="w-full ans-btn-primary" loading={loading}>
        <Send size={14} className="mr-1" /> Envoyer la demande
      </Button>
      <button type="button" onClick={() => setMode('status')} className="w-full text-xs text-primary hover:underline">
        Vérifier le statut d&apos;une demande existante
      </button>
      <button type="button" onClick={onBack} className="w-full text-xs text-muted-foreground hover:underline">
        Retour à la connexion
      </button>
    </form>
  );
}
