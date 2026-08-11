'use client';

import { useEffect, useState } from 'react';
import { CheckCircle2, XCircle, FileCheck, Loader2 } from 'lucide-react';
import { OrionLogo } from '@/components/branding/orion-logo';

type BatInfo = {
  numero: string;
  statut: string;
  locked: boolean;
  commentaireClient?: string | null;
  clientName: string;
  commandeNumero?: string;
  article?: string;
  previewFile?: { id: string; name: string; mimeType: string } | null;
  canValidate: boolean;
};

export default function BatClientValidationPage({ params }: { params: { token: string } }) {
  const [info, setInfo] = useState<BatInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [commentaire, setCommentaire] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState<'accept' | 'refuse' | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/bat/client/${params.token}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Lien invalide');
        if (!cancelled) setInfo(data);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Erreur');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [params.token]);

  const submit = async (action: 'accept' | 'refuse') => {
    setSubmitting(true);
    try {
      const res = await fetch(`/api/bat/client/${params.token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, commentaire }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Action impossible');
      setDone(action);
      setInfo((prev) => prev ? { ...prev, statut: data.statut, canValidate: false, locked: action === 'accept' } : prev);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur');
    } finally {
      setSubmitting(false);
    }
  };

  const showStickyActions = Boolean(info && !loading && !done && info.canValidate);

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col overflow-x-hidden">
      <header className="border-b border-border bg-white px-3 sm:px-4 py-3 sm:py-4 flex items-center justify-center min-w-0">
        <OrionLogo className="h-7 sm:h-8 max-w-full" />
      </header>

      <main className={`flex-1 flex items-start sm:items-center justify-center p-3 sm:p-4 min-w-0 ${showStickyActions ? 'pb-28' : ''}`}>
        <div className="w-full max-w-lg min-w-0 bg-white border border-border rounded-[7px] shadow-sm p-4 sm:p-6 space-y-5">
          {loading && (
            <div className="flex flex-col items-center gap-3 py-12 text-muted-foreground">
              <Loader2 className="animate-spin" size={28} />
              <p className="text-sm">Chargement du BAT…</p>
            </div>
          )}

          {error && !loading && (
            <div className="text-center py-8 space-y-2 px-1">
              <XCircle className="mx-auto text-primary" size={36} />
              <p className="font-semibold text-sm break-words">{error}</p>
              <p className="text-xs text-muted-foreground">Contactez ANS Design pour obtenir un nouveau lien.</p>
            </div>
          )}

          {info && !loading && (
            <>
              <div className="flex items-start gap-3 min-w-0">
                <div className="w-10 h-10 rounded-[7px] bg-primary/10 flex items-center justify-center shrink-0">
                  <FileCheck size={20} className="text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground truncate">Validation BAT — {info.clientName}</p>
                  <h1 className="font-mono font-bold text-base sm:text-lg break-all">{info.numero}</h1>
                  {info.commandeNumero && (
                    <p className="text-xs text-muted-foreground break-words">Commande {info.commandeNumero} · {info.article}</p>
                  )}
                  <span className="inline-block mt-2 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-700">
                    {info.statut}
                  </span>
                </div>
              </div>

              {info.previewFile && (
                <div className="border border-border rounded-[7px] overflow-hidden min-w-0">
                  {info.previewFile.mimeType.startsWith('image/') ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={`/api/bat/client/${params.token}/preview`}
                      alt={info.previewFile.name}
                      className="w-full max-h-80 object-contain bg-slate-50"
                    />
                  ) : (
                    <a
                      href={`/api/bat/client/${params.token}/preview`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block p-4 text-sm text-primary hover:underline break-all"
                    >
                      Télécharger {info.previewFile.name}
                    </a>
                  )}
                </div>
              )}

              {done ? (
                <div className="text-center py-4 space-y-2">
                  {done === 'accept' ? (
                    <>
                      <CheckCircle2 className="mx-auto text-green-600" size={40} />
                      <p className="font-semibold text-green-700">BAT validé — merci !</p>
                      <p className="text-xs text-muted-foreground">La production peut démarrer.</p>
                    </>
                  ) : (
                    <>
                      <XCircle className="mx-auto text-primary" size={40} />
                      <p className="font-semibold text-primary">BAT refusé</p>
                      <p className="text-xs text-muted-foreground">Notre équipe vous recontactera.</p>
                    </>
                  )}
                </div>
              ) : info.canValidate ? (
                <div className="space-y-3">
                  <label className="block text-xs font-medium">
                    Commentaire (optionnel)
                    <textarea
                      value={commentaire}
                      onChange={(e) => setCommentaire(e.target.value)}
                      rows={3}
                      className="mt-1 w-full min-w-0 rounded-[7px] border border-border px-3 py-2 text-sm"
                      placeholder="Remarques ou corrections souhaitées…"
                    />
                  </label>
                  {/* Desktop / tablette : actions dans le flux */}
                  <div className="hidden sm:flex flex-row gap-2">
                    <button
                      type="button"
                      disabled={submitting}
                      onClick={() => submit('accept')}
                      className="flex-1 flex items-center justify-center gap-2 min-h-[44px] bg-green-600 hover:bg-green-700 text-white rounded-[7px] py-2.5 text-sm font-semibold disabled:opacity-50"
                    >
                      <CheckCircle2 size={16} /> Valider le BAT
                    </button>
                    <button
                      type="button"
                      disabled={submitting}
                      onClick={() => submit('refuse')}
                      className="flex-1 flex items-center justify-center gap-2 min-h-[44px] border border-primary text-primary rounded-[7px] py-2.5 text-sm font-semibold disabled:opacity-50"
                    >
                      <XCircle size={16} /> Refuser
                    </button>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Ce BAT a déjà été traité ({info.statut}).
                </p>
              )}
            </>
          )}
        </div>
      </main>

      {showStickyActions && (
        <div
          data-bat-sticky-actions
          className="sm:hidden fixed inset-x-0 bottom-0 z-50 border-t border-border bg-white/95 backdrop-blur-md px-3 pt-2"
          style={{ paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom))' }}
        >
          <div className="flex flex-col gap-2 max-w-lg mx-auto w-full min-w-0">
            <button
              type="button"
              disabled={submitting}
              onClick={() => submit('accept')}
              className="w-full flex items-center justify-center gap-2 min-h-[44px] bg-green-600 hover:bg-green-700 text-white rounded-[7px] py-2.5 text-sm font-semibold disabled:opacity-50"
            >
              <CheckCircle2 size={16} /> Valider le BAT
            </button>
            <button
              type="button"
              disabled={submitting}
              onClick={() => submit('refuse')}
              className="w-full flex items-center justify-center gap-2 min-h-[44px] border border-primary text-primary rounded-[7px] py-2.5 text-sm font-semibold disabled:opacity-50"
            >
              <XCircle size={16} /> Refuser
            </button>
          </div>
        </div>
      )}

      <footer className="text-center text-[10px] text-muted-foreground py-4 px-3">
        ANS Design Print — Portail validation BAT
      </footer>
    </div>
  );
}
