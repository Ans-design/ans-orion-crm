'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { uxToast } from '@/lib/ux/feedback';
import { unwrapApiData, unwrapListItems, getApiErrorMessage } from '@/lib/api-client';
import { useDebounce } from '@/lib/hooks/use-debounce';
import { Receipt, Plus, X, ArrowLeft, ChevronRight, Send, FileText, Wallet, User, Download, Mail, Clock, CheckCircle2, List, LayoutList } from 'lucide-react';
import { formatPrice } from '@/lib/format/french-typography';
import { EncaissementModal, type EncaissementTarget } from '@/components/encaissement-modal';
import {
  AppListSkeleton, AppSearchBar,
  AppStatusBadge, AppButton, AppKpiCard, AppListPagination, AppFormModal, AppFormModalFooter, AppViewToggle,
  EntityModuleDataBar,
} from '@/components/ui/app-ui';
import { OrionPageHeader, OrionEmptyState, OrionColumnTable, OrionStatusBadge } from '@/components/orion';
import { useOrionDrawer } from '@/components/orion/orion-drawer-provider';
import { useCommandeDeepLink } from '@/lib/hooks/use-commande-deep-link';
import { CommandeDeepLinkBanner } from '@/components/commandes/commande-deep-link-banner';
import { FlowPageBanner } from '@/components/flow/flow-page-banner';
import { ComptableExportButton } from '@/components/finance/comptable-export-button';
import { computePaidTotal } from '@/lib/finance/payment-totals';
import { ACTION_INFO_CLASS } from '@/lib/ui/status-styles';
import { hasPermission } from '@/lib/auth/permissions';
import { useOrionLiveRevision } from '@/lib/hooks/use-orion-live-revision';

const STATUTS = ['Brouillon', 'Émise', 'Payée', 'Partiellement payée', 'Annulée'];

function factureReste(f: { totalTTC?: number; paiements?: { montant: number; type?: string }[] }) {
  const paid = computePaidTotal(f.paiements ?? []);
  return Math.max(0, (f.totalTTC || 0) - paid);
}

export default function FacturesPageWrapper() {
  return (
    <Suspense fallback={<AppListSkeleton rows={5} />}>
      <FacturesPage />
    </Suspense>
  );
}

function FacturesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { openDrawer } = useOrionDrawer();
  const { data: session } = useSession();
  const role = (session?.user as { role?: string } | undefined)?.role ?? 'user';
  const canWriteFacture = hasPermission(role, 'factures:write');
  const { commandeId, info: commandeInfo } = useCommandeDeepLink();
  const [list, setList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);
  const [listViewMode, setListViewMode] = useState<'list' | 'table'>('list');
  const [filterMode, setFilterMode] = useState<'all' | 'impayes' | 'overdue'>('all');
  const [filterStatut, setFilterStatut] = useState('');
  const [sel, setSel] = useState<any>(null);
  const [showNew, setShowNew] = useState(false);
  const [showTrash, setShowTrash] = useState(false);
  const liveTick = useOrionLiveRevision(['factures', 'paiements', 'commandes'], { debounceMs: 400 });
  const [saving, setSaving] = useState(false);
  const [cmds, setCmds] = useState<any[]>([]);
  const [nf, setNf] = useState({ commandeId: '', clientId: '', tva: 0, remise: 0, notes: '', dateEcheance: '' });
  const [encTarget, setEncTarget] = useState<EncaissementTarget | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [stats, setStats] = useState<{
    count: number; totalFacture: number; totalPayee: number; totalCreances: number;
  } | null>(null);
  const [sendingEmail, setSendingEmail] = useState(false);

  const loadStats = useCallback(async () => {
    try {
      const r = await fetch('/api/factures?stats=1', { credentials: 'include', cache: 'no-store' });
      if (r.ok) {
        const d = unwrapApiData<{ stats?: typeof stats }>(await r.json());
        setStats(d.stats ?? null);
      }
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { loadStats(); }, [loadStats, liveTick]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const p = new URLSearchParams({
        paginated: '1',
        page: String(page),
        pageSize: '15',
      });
      if (debouncedSearch) p.set('search', debouncedSearch);
      if (filterMode === 'impayes') p.set('impayes', '1');
      else if (filterMode === 'overdue') p.set('overdue', '1');
      else if (filterStatut) p.set('statut', filterStatut);
      if (commandeId) p.set('commande', commandeId);
      if (showTrash) p.set('archived', '1');
      const r = await fetch(`/api/factures?${p}`);
      if (r.ok) {
        const data = unwrapApiData<{ items?: any[]; totalPages?: number; total?: number } | any[]>(await r.json());
        if (data && typeof data === 'object' && !Array.isArray(data) && data.items) {
          setList(data.items);
          setTotalPages(data.totalPages ?? 1);
          setTotalItems(data.total ?? 0);
        } else if (Array.isArray(data)) {
          setList(data);
          setTotalPages(1);
          setTotalItems(data.length ?? 0);
        } else {
          setList([]);
          setTotalPages(1);
          setTotalItems(0);
        }
      } else uxToast.error('Impossible de charger les factures');
    } catch {
      uxToast.error('Erreur réseau');
    } finally { setLoading(false); }
  }, [debouncedSearch, filterStatut, filterMode, page, commandeId, showTrash, liveTick]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); }, [debouncedSearch, filterStatut, filterMode, commandeId, showTrash]);
  useEffect(() => {
    if (commandeId) setNf((prev) => ({ ...prev, commandeId }));
  }, [commandeId]);
  useEffect(() => {
    const s = searchParams.get('statut');
    if (s) setFilterStatut(s);
    if (searchParams.get('impayes') === '1') setFilterMode('impayes');
    if (searchParams.get('overdue') === '1') setFilterMode('overdue');
    const id = searchParams.get('id');
    if (id) openDrawer('facture', id);
  }, [searchParams, openDrawer]);

  const sendFactureByEmail = async (id: string) => {
    setSendingEmail(true);
    try {
      const r = await fetch(`/api/factures/${id}/send-email`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
      const data = await r.json();
      if (r.ok) {
        uxToast.success(`Facture envoyée à ${data.sentTo}`);
        const refreshed = await fetch(`/api/factures/${id}`);
        if (refreshed.ok) setSel(await refreshed.json());
        load();
      } else {
        uxToast.error(getApiErrorMessage(data, 'Envoi email impossible'), 'Envoi email impossible');
      }
    } catch {
      uxToast.error('Erreur réseau');
    } finally {
      setSendingEmail(false);
    }
  };

  const loadCmds = async () => {
    const r = await fetch('/api/commandes?paginated=1&pageSize=50');
    if (r.ok) setCmds(unwrapListItems(await r.json()));
  };

  const handleNew = async () => {
    if (saving) return;
    if (!nf.commandeId) return uxToast.error('Sélectionnez une commande');
    const cmd = cmds.find((c: any) => c.id === nf.commandeId);
    setSaving(true);
    try {
      const r = await fetch('/api/factures', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...nf, clientId: cmd?.clientId || nf.clientId, tva: Number(nf.tva), remise: Number(nf.remise) }),
      });
      if (r.ok) {
        uxToast.success('Facture créée');
        setShowNew(false);
        setNf({ commandeId: '', clientId: '', tva: 0, remise: 0, notes: '', dateEcheance: '' });
        load();
        loadStats();
      } else {
        const err = await r.json().catch(() => ({}));
        uxToast.error(getApiErrorMessage(err, 'Erreur création facture'));
      }
    } finally {
      setSaving(false);
    }
  };

  const updStatut = async (id: string, statut: string) => {
    const r = await fetch(`/api/factures/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ statut }) });
    if (r.ok) { const u = await r.json(); setSel(u); load(); uxToast.success(`Statut: ${statut}`); }
  };

  const totalFacture = stats?.totalFacture ?? list.reduce((s, f) => s + (f.totalTTC || 0), 0);
  const totalPayee = stats?.totalPayee ?? list.filter(f => f.statut === 'Payée').reduce((s, f) => s + (f.totalTTC || 0), 0);
  const totalEnCours = stats?.totalCreances ?? list
    .filter((f) => f.statut === 'Émise' || f.statut === 'Partiellement payée')
    .reduce((s, f) => s + factureReste(f), 0);
  const factureCount = stats?.count ?? totalItems;

  if (sel) {
    const lignes = Array.isArray(sel.lignes) ? sel.lignes : [];
    const totalPaye = sel.paiements?.reduce((s: number, p: any) => s + (p.type === 'Remboursement' ? -p.montant : p.montant), 0) || 0;
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <AppButton type="button" variant="ghost" size="icon" onClick={() => setSel(null)} aria-label="Retour">
            <ArrowLeft size={20} />
          </AppButton>
          <Receipt size={24} className="text-primary" />
          <div><h3 className="font-display font-bold text-lg">{sel.numero}</h3>
            <p className="text-sm text-muted-foreground">{sel.client?.name || 'Sans client'} • {sel.commande?.numero || 'Libre'}</p></div>
          <div className="flex-1" />
          <AppStatusBadge statut={sel.statut} className="text-xs px-3 py-1" />
        </div>
        <div className="bg-card border border-border rounded-[7px] p-4">
          <h4 className="font-display font-bold mb-3">Lignes</h4>
          <div className="space-y-2">
            {lignes.map((l: any, i: number) => (
              <div key={i} className="flex justify-between items-center p-2 bg-accent/50 rounded-[7px] text-sm">
                <span className="flex-1">{l.description}</span>
                <span className="font-mono w-16 text-right">{l.qty}</span>
                <span className="font-mono w-28 text-right">{formatPrice(l.pu)}</span>
                <span className="font-mono font-bold w-32 text-right">{formatPrice(l.total)}</span>
              </div>
            ))}
          </div>
          <div className="border-t border-border mt-3 pt-3 space-y-1 text-sm">
            <div className="flex justify-between"><span>Sous-total</span><span className="font-mono">{formatPrice(sel.sousTotal)}</span></div>
            {sel.remise > 0 && <div className="flex justify-between text-muted-foreground"><span>Remise ({sel.remise}%)</span><span className="font-mono">-{formatPrice(sel.sousTotal * sel.remise / 100)}</span></div>}
            <div className="flex justify-between"><span>Total HT</span><span className="font-mono">{formatPrice(sel.totalHT)}</span></div>
            {sel.tva > 0 && <div className="flex justify-between text-muted-foreground"><span>TVA ({sel.tva}%)</span><span className="font-mono">{formatPrice(sel.totalHT * sel.tva / 100)}</span></div>}
            <div className="flex justify-between font-bold text-base"><span>Total TTC</span><span className="font-mono text-primary">{formatPrice(sel.totalTTC)}</span></div>
            <div className="flex justify-between text-green-500"><span>Payé</span><span className="font-mono">{formatPrice(totalPaye)}</span></div>
            <div className="flex justify-between font-bold"><span>Reste à payer</span><span className="font-mono">{formatPrice(Math.max(0, sel.totalTTC - totalPaye))}</span></div>
          </div>
        </div>
        {sel.paiements?.length > 0 && (
          <div className="bg-card border border-border rounded-[7px] p-4">
            <h4 className="font-display font-bold mb-3">Paiements reçus</h4>
            {sel.paiements.map((p: any) => (
              <div key={p.id} className="flex justify-between items-center p-2 bg-accent/50 rounded-[7px] text-sm mb-1">
                <span>{p.numero} • {p.mode}</span><span className="font-mono font-bold text-green-500">{formatPrice(p.montant)}</span>
              </div>
            ))}
          </div>
        )}
        <div className="flex gap-2 flex-wrap">
          <AppButton type="button" size="sm" variant="outline" asChild>
            <a href={`/api/factures/${sel.id}/pdf?format=pdf`} target="_blank" rel="noopener noreferrer" className="gap-1">
              <Download size={14} /> PDF
            </a>
          </AppButton>
          <AppButton type="button" size="sm" variant="ghost" asChild>
            <a href={`/api/factures/${sel.id}/pdf?format=html`} target="_blank" rel="noopener noreferrer">Aperçu</a>
          </AppButton>
          <AppButton type="button" size="sm" disabled={sendingEmail} onClick={() => sendFactureByEmail(sel.id)} className={`gap-1 ${ACTION_INFO_CLASS}`}>
            <Mail size={14} /> {sendingEmail ? 'Envoi…' : 'Envoyer par email'}
          </AppButton>
          {sel.statut === 'Brouillon' && (
            <AppButton type="button" size="sm" onClick={() => updStatut(sel.id, 'Émise')} className={`gap-1 ${ACTION_INFO_CLASS}`}>
              <Send size={14} /> Émettre
            </AppButton>
          )}
          {sel.statut !== 'Annulée' && sel.statut !== 'Payée' && (
            <AppButton
              type="button"
              size="sm"
              onClick={() => setEncTarget({
                id: sel.id, factureId: sel.id, numero: sel.numero, label: sel.client?.name || 'Client',
                totalTTC: sel.totalTTC, dejaPaye: totalPaye, commandeId: sel.commandeId, clientId: sel.clientId,
              })}
              className="gap-1 bg-green-600 hover:bg-green-700 text-white"
            >
              <Wallet size={14} /> Encaisser
            </AppButton>
          )}
          {sel.statut !== 'Annulée' && sel.statut !== 'Payée' && (
            <AppButton type="button" size="sm" variant="outline" onClick={() => updStatut(sel.id, 'Annulée')} className="text-red-600 border-red-500/30 hover:bg-red-500/10">
              Annuler
            </AppButton>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="factures-page dashboard-full">
      {commandeInfo && <CommandeDeepLinkBanner info={commandeInfo} />}
      <FlowPageBanner
        entity="facture"
        status={filterStatut || (filterMode === 'impayes' ? 'En retard' : 'Non facturé')}
        impactedModules={['Commandes', 'Finance', 'Paiements']}
      />
      <OrionPageHeader
        title="Facturation"
        description="Factures clients · encaissements · créances"
        icon={Receipt}
        actions={
          <div className="flex flex-wrap gap-2 items-center" title="Export Excel = liste filtrée ; Export comptable = écritures DGI">
            <EntityModuleDataBar entity="factures" trash={showTrash} onTrashChange={setShowTrash} />
            <ComptableExportButton variant="outline" />
            {canWriteFacture && (
              <AppButton type="button" size="sm" onClick={() => { setShowNew(true); loadCmds(); }}>
                <Plus size={14} /> Nouvelle facture
              </AppButton>
            )}
          </div>
        }
      />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <AppKpiCard label="Factures" value={factureCount} icon={Receipt} tone="brand" />
        <AppKpiCard label="Total facturé" value={totalFacture} icon={FileText} tone="info" format="price" />
        <AppKpiCard label="Payé" value={totalPayee} icon={CheckCircle2} tone="success" format="price" />
        <AppKpiCard label="Créances (reste)" value={totalEnCours} icon={Clock} tone="gold" format="price" />
      </div>
      <div className="orion-filter-toolbar">
        <AppSearchBar value={search} onChange={setSearch} placeholder="Rechercher facture, client…" className="flex-1 min-w-[160px]" />
        <AppViewToggle
          value={listViewMode}
          onChange={setListViewMode}
          options={[
            { id: 'list', label: 'Cartes', icon: List },
            { id: 'table', label: 'Tableau', icon: LayoutList },
          ]}
        />
        <div className="factures-filters">
          <button type="button" onClick={() => { setFilterMode('all'); setFilterStatut(''); }} className={`factures-filter${filterMode === 'all' && !filterStatut ? ' is-active' : ''}`}>Tous</button>
          <button type="button" onClick={() => { setFilterMode('impayes'); setFilterStatut(''); }} className={`factures-filter is-danger${filterMode === 'impayes' ? ' is-active' : ''}`}>Impayées</button>
          <button type="button" onClick={() => { setFilterMode('overdue'); setFilterStatut(''); }} className={`factures-filter is-warn${filterMode === 'overdue' ? ' is-active' : ''}`}>Échues</button>
          {STATUTS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => { setFilterMode('all'); setFilterStatut(s); }}
              className={`factures-filter${filterMode === 'all' && filterStatut === s ? ' is-active' : ''}`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>
      {loading ? (
        <AppListSkeleton rows={5} />
      ) : list.length === 0 ? (
        <OrionEmptyState
          icon={Receipt}
          title="Aucune facture"
          description="Créez une facture à partir d'une commande terminée ou en cours."
          action={
            canWriteFacture ? (
              <AppButton type="button" onClick={() => { setShowNew(true); loadCmds(); }}>
                Nouvelle facture
              </AppButton>
            ) : undefined
          }
        />
      ) : listViewMode === 'table' ? (
        <>
          <OrionColumnTable
            data={list}
            rowKey={(f) => f.id}
            enableSorting
            onRowClick={(f) => openDrawer('facture', f.id)}
            columns={[
              { id: 'numero', accessorKey: 'numero', enableSorting: true, header: 'N°', cell: (f) => <span className="font-mono text-sm">{f.numero}</span> },
              { id: 'client', accessorFn: (f) => f.client?.name ?? '', enableSorting: true, header: 'Client', cell: (f) => f.client?.name || 'Sans client' },
              { id: 'statut', accessorKey: 'statut', enableSorting: true, header: 'Statut', cell: (f) => <OrionStatusBadge statut={f.statut} /> },
              { id: 'total', accessorKey: 'totalTTC', enableSorting: true, header: 'TTC', cell: (f) => <span className="font-mono">{formatPrice(f.totalTTC)}</span> },
              {
                id: 'reste',
                accessorFn: (f) => factureReste(f),
                enableSorting: true,
                header: 'Reste',
                cell: (f) => {
                  const reste = factureReste(f);
                  return reste > 0 && f.statut !== 'Payée' ? <span className="font-mono text-red-500">{formatPrice(reste)}</span> : '—';
                },
              },
              {
                id: 'date',
                accessorKey: 'createdAt',
                enableSorting: true,
                header: 'Date',
                cell: (f) => new Date(f.createdAt).toLocaleDateString('fr-FR'),
              },
            ]}
          />
          <AppListPagination page={page} totalPages={totalPages} onPageChange={setPage} total={totalItems} />
        </>
      ) : (
        <>
          <div className="factures-grid">
            {list.map((f: any) => {
              const paye = f.paiements?.reduce((s: number, p: any) => s + (p.type === 'Remboursement' ? -p.montant : p.montant), 0) || 0;
              const reste = Math.max(0, (f.totalTTC || 0) - paye);
              return (
                <button
                  key={f.id}
                  type="button"
                  className="facture-card"
                  data-statut={f.statut}
                  onClick={() => openDrawer('facture', f.id)}
                >
                  <div className="facture-card__top">
                    <span className="facture-card__icon" data-statut={f.statut} aria-hidden>
                      <Receipt size={15} strokeWidth={2} />
                    </span>
                    <div className="facture-card__main">
                      <div className="facture-card__num-row">
                        <span className="facture-card__num">{f.numero}</span>
                        <AppStatusBadge statut={f.statut} />
                      </div>
                      <div className="facture-card__client">{f.client?.name || 'Sans client'}</div>
                      <div className="facture-card__links">
                        {f.commandeId && f.commande?.numero ? (
                          <Link
                            href={`/commandes/${f.commandeId}?tab=finance`}
                            onClick={(e) => e.stopPropagation()}
                            className="facture-card__chip"
                          >
                            {f.commande.numero}
                          </Link>
                        ) : null}
                        {f.clientId ? (
                          <span
                            role="link"
                            tabIndex={0}
                            className="facture-card__chip"
                            onClick={(e) => {
                              e.stopPropagation();
                              router.push(`/clients/${f.clientId}`);
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.stopPropagation();
                                router.push(`/clients/${f.clientId}`);
                              }
                            }}
                          >
                            <User size={10} /> Fiche
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </div>
                  <div className="facture-card__foot">
                    <div className="facture-card__amounts">
                      <span className="facture-card__ttc">{formatPrice(f.totalTTC)}</span>
                      {reste > 0 && f.statut !== 'Payée' ? (
                        <span className="facture-card__reste">Reste {formatPrice(reste)}</span>
                      ) : null}
                    </div>
                    <div className="facture-card__meta">
                      <span className="facture-card__date">
                        {new Date(f.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}
                      </span>
                      {f.statut !== 'Payée' && f.statut !== 'Annulée' ? (
                        <span
                          role="button"
                          tabIndex={0}
                          className="facture-card__pay"
                          title="Encaisser"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEncTarget({
                              id: f.id,
                              factureId: f.id,
                              numero: f.numero,
                              label: f.client?.name || '',
                              totalTTC: f.totalTTC,
                              dejaPaye: paye,
                              commandeId: f.commandeId,
                              clientId: f.clientId,
                            });
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.stopPropagation();
                              setEncTarget({
                                id: f.id,
                                factureId: f.id,
                                numero: f.numero,
                                label: f.client?.name || '',
                                totalTTC: f.totalTTC,
                                dejaPaye: paye,
                                commandeId: f.commandeId,
                                clientId: f.clientId,
                              });
                            }
                          }}
                        >
                          <Wallet size={14} />
                        </span>
                      ) : (
                        <ChevronRight size={14} className="text-muted-foreground" />
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
          <AppListPagination page={page} totalPages={totalPages} total={totalItems} onPageChange={setPage} />
        </>
      )}
      <AppFormModal
        open={showNew}
        onOpenChange={setShowNew}
        title="Nouvelle facture"
        footer={<AppFormModalFooter onCancel={() => setShowNew(false)} onSubmit={handleNew} submitLabel="Créer" loading={saving} />}
      >
        <div><label className="text-xs font-medium text-muted-foreground mb-1 block">Commande *</label>
          <select value={nf.commandeId} onChange={e => setNf({ ...nf, commandeId: e.target.value })} className="w-full bg-accent border border-border rounded-[7px] px-3 py-2 text-sm">
            <option value="">Sélectionner...</option>
            {cmds.map((c: any) => <option key={c.id} value={c.id}>{c.numero} — {c.article} ({formatPrice(c.total)})</option>)}
          </select></div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className="text-xs font-medium text-muted-foreground mb-1 block">TVA (%)</label>
            <input type="number" value={nf.tva} onChange={e => setNf({ ...nf, tva: Number(e.target.value) })} className="w-full bg-accent border border-border rounded-[7px] px-3 py-2 text-sm" placeholder="0" /></div>
          <div><label className="text-xs font-medium text-muted-foreground mb-1 block">Remise (%)</label>
            <input type="number" value={nf.remise} onChange={e => setNf({ ...nf, remise: Number(e.target.value) })} className="w-full bg-accent border border-border rounded-[7px] px-3 py-2 text-sm" placeholder="0" /></div></div>
        <div><label className="text-xs font-medium text-muted-foreground mb-1 block">Échéance</label>
          <input type="date" value={nf.dateEcheance} onChange={e => setNf({ ...nf, dateEcheance: e.target.value })} className="w-full bg-accent border border-border rounded-[7px] px-3 py-2 text-sm" /></div>
        <div><label className="text-xs font-medium text-muted-foreground mb-1 block">Notes</label>
          <textarea value={nf.notes} onChange={e => setNf({ ...nf, notes: e.target.value })} className="w-full bg-accent border border-border rounded-[7px] px-3 py-2 text-sm" rows={2} /></div>
      </AppFormModal>
      <EncaissementModal target={encTarget} onClose={() => setEncTarget(null)} onSuccess={() => { load(); if (sel) fetch(`/api/factures/${sel.id}`).then(async (r) => { if (r.ok) setSel(await r.json()); }); }} />
    </div>
  );
}
