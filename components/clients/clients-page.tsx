'use client';

import { useState, useEffect, useCallback, Suspense, type ReactNode } from 'react';
import { useSearchParams, useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useSession } from 'next-auth/react';
import {
  Users, Plus, Mail, Phone, Star, Building2, User, X,
  Edit3, Trash2, ArrowLeft, FileText, ClipboardList, MessageCircle, MapPin,
  Receipt, Banknote, Clock, Paperclip, Target, Palette, Package, Check,
  Grid3X3, List, History, Save, RotateCcw, Download, ExternalLink, MessageSquareWarning, Eye,
} from 'lucide-react';
import { formatPrice } from '@/lib/data/catalogue';
import {
  LIVRAISON_AXES, parseClientCharte, serializeClientCharte,
  type ClientAddress, type ClientFileRef, type ClientPhone,
} from '@/lib/client-charte';
import { uxToast } from '@/lib/ux/feedback';
import { OrionPageHeader, OrionConfirmDialog, OrionEmptyState, OrionColumnTable } from '@/components/orion';
import {
  AppListSkeleton, AppButton, AppKpiCard, AppModuleShell, AppModuleToolbar,
  EntityModuleDataBar,
  AppViewToggle, AppTableRowActions, AppListPagination, AppResponsiveKpiGrid, AppStickyActionBar,
} from '@/components/ui/app-ui';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ClientMergeDialog } from '@/components/clients/client-merge-dialog';
import { ClientsKpiStrip } from '@/components/clients/clients-kpi-strip';
import { clientSnapshotFromApi, setSelectedSalesClient } from '@/lib/sales-flow/sales-client-store';
import { statusBadgeClass } from '@/lib/ui/status-styles';
import { statutFromCategorie } from '@/lib/services/client-detail';
import { hasPermission, canManageUsers } from '@/lib/auth/permissions';
import { useDebounce } from '@/lib/hooks/use-debounce';
import { CLIENT_CANAUX_DECOUVERTE, CLIENT_CANAUX_VENTE } from '@/lib/data/client-canaux';
import {
  displayClientStatut, isClientFidele, validateNif, parseClientType, formatClientType,
  parseCanalStored, canalStoredValue,
} from '@/lib/clients/client-display';
import { useModuleDateFilter } from '@/components/layout/module-date-filter-context';
import { unwrapApiData, getApiErrorMessage } from '@/lib/api-client';
import { ANS } from '@/lib/ans-colors';
import { useResponsiveMode } from '@/lib/responsive/use-responsive-mode';
import { prefersCardList } from '@/lib/responsive/layout-registry';
import { VirtualizedList } from '@/components/ui/virtualized-list';
import { FlowPageBanner } from '@/components/flow/flow-page-banner';
import { useOrionLiveRevision } from '@/lib/hooks/use-orion-live-revision';
import { emitOrionLive, liveFetch } from '@/lib/live/orion-live';

type ClientSummary = {
  totalFacture: number; totalPaye: number; solde: number;
  devisCount: number; commandesCount: number; facturesCount: number; paiementsCount: number;
};

type TimelineItem = {
  id: string; type: 'devis' | 'commande' | 'facture' | 'paiement';
  label: string; sublabel?: string; statut?: string; montant?: number; date: string;
};

type ClientData = {
  id: string; code: string; name: string; tel: string | null; whatsapp: string | null;
  email: string | null; type: string | null; adresse: string | null; ville: string | null;
  canalVente?: string | null; canalDecouverte?: string | null; canalCommande?: string | null;
  ca: string | null; cmds: number; statut: string; notes: string | null;
  solde?: number; caTotal?: number; reclamationsOuvertes?: number;
  nif?: string | null; statNumber?: string | null; commercialName?: string | null; categorie?: string | null;
  charte: string | null;
  tags: string | null; archived: boolean; createdAt: string; updatedAt: string;
  _count?: { devis: number; commandes: number };
  devis?: { id: string; numero: string; statut: string; totalHT: number; totalTTC: number }[];
  commandes?: { id: string; numero: string; statut: string; total: number; reste: number; article: string; avancement: number }[];
  factures?: { id: string; numero: string; statut: string; totalTTC: number }[];
  paiements?: { id: string; numero: string; montant: number; type: string; mode: string; datePaiement: string }[];
  summary?: ClientSummary;
  timeline?: TimelineItem[];
};

const TIMELINE_ICON: Record<string, { icon: typeof FileText; color: string }> = {
  devis: { icon: FileText, color: '#FFD60A' },
  commande: { icon: ClipboardList, color: '#10B981' },
  facture: { icon: Receipt, color: ANS.red },
  paiement: { icon: Banknote, color: ANS.redDark },
};

type ReclamationRow = {
  id: string; subject: string; description?: string | null;
  statut: string; priorite: string; createdAt: string;
};

const RECL_STATUT_STYLE: Record<string, string> = {
  Ouverte: 'bg-red-500/10 text-red-500',
  'En cours': 'bg-amber-500/10 text-amber-600',
  Résolue: 'bg-green-500/10 text-green-500',
  Clôturée: 'bg-gray-500/10 text-gray-400',
};

type FileAssetRow = { id: string; name: string; mimeType: string; sizeBytes: number };

function timelineHref(type: TimelineItem['type'], id: string): string {
  const base = { devis: '/devis', commande: '/commandes', facture: '/factures', paiement: '/paiements' }[type];
  return `${base}?id=${id}`;
}

function normalizeFileRows(body: unknown): FileAssetRow[] {
  const data = unwrapApiData<unknown>(body);
  if (!Array.isArray(data)) return [];
  return data.filter(
    (row): row is FileAssetRow =>
      !!row && typeof row === 'object' && typeof (row as FileAssetRow).id === 'string',
  );
}

function mergeFileLists(charteFiles: ClientFileRef[], apiFiles: unknown): ClientFileRef[] {
  const rows = Array.isArray(apiFiles) ? (apiFiles as FileAssetRow[]) : normalizeFileRows(apiFiles);
  const fromApi: ClientFileRef[] = rows.map((f) => ({
    id: f.id, name: f.name, size: f.sizeBytes, type: f.mimeType,
  }));
  const apiIds = new Set(fromApi.map((f) => f.id).filter(Boolean));
  const extra = (charteFiles ?? []).filter((f) => !f.id || !apiIds.has(f.id));
  return [...fromApi, ...extra];
}

function clientFileUrl(id: string, download = false): string {
  return download ? `/api/files/${id}?download=1` : `/api/files/${id}`;
}

function parseTags(tags: string | null): string[] {
  if (!tags) return [];
  try { return JSON.parse(tags) as string[]; } catch { return tags.split(',').map((t) => t.trim()).filter(Boolean); }
}

const getStatutStyle = (s: string) => {
  const label = displayClientStatut(s);
  const m: Record<string, string> = {
    'Client fidèle': 'bg-[#FFD60A]/10 text-[#FFD60A]',
    'VIP': 'bg-[#FFD60A]/10 text-[#FFD60A]',
    'Premium': 'bg-[#FFD60A]/10 text-[#FFD60A]',
    'Inactif': 'bg-gray-500/10 text-gray-400',
    'Archivé': 'bg-red-500/10 text-red-400',
  };
  return m[label] ?? m[s] ?? statusBadgeClass(s);
};

const TYPES = ['Entreprise', 'Particulier', 'Institution', 'Hôtellerie', 'Télécom', 'Banque', 'Éducation', 'Transport', 'Aérien', 'Autre'];

type ClientFormState = {
  name: string; societe: string; tel: string; whatsapp: string; email: string;
  type: string; typeAutre: string;
  adresse: string; ville: string;
  canalVente: string; canalVenteAutre: string;
  canalDecouverte: string; canalDecouverteAutre: string;
  nif: string; statNumber: string; commercialName: string;
  recommandations: string; charteCouleurs: string; livraisonPrefs: string; conditionsCommerciales: string;
  phones: ClientPhone[]; addresses: ClientAddress[]; files: ClientFileRef[];
};

const EMPTY_FORM: ClientFormState = {
  name: '', societe: '', tel: '', whatsapp: '', email: '', type: 'Entreprise', typeAutre: '',
  adresse: '', ville: '',
  canalVente: '', canalVenteAutre: '', canalDecouverte: '', canalDecouverteAutre: '',
  nif: '', statNumber: '', commercialName: '',
  recommandations: '', charteCouleurs: '', livraisonPrefs: '', conditionsCommerciales: '',
  phones: [{ label: 'Principal', number: '' }],
  addresses: [{ label: 'Principale', axe: '', axeDetail: '', repere: '' }],
  files: [],
};

function formFromClient(client: ClientData): ClientFormState {
  const extra = parseClientCharte(client.charte);
  const { type, typeAutre } = parseClientType(client.type);
  const cv = parseCanalStored(client.canalVente);
  const cd = parseCanalStored(client.canalDecouverte);
  const phones = extra.phones?.length
    ? extra.phones
    : [{ label: 'Principal', number: client.tel || '' }];
  const normalizeAddress = (a: ClientAddress): ClientAddress => {
    const m = a.axe.match(/^Autre\s*[—–-]\s*(.+)$/i);
    if (m) return { ...a, axe: 'Autre', axeDetail: m[1].trim() };
    return { ...a, axeDetail: a.axeDetail ?? '' };
  };

  const addresses = (extra.addresses?.length
    ? extra.addresses
    : [{ label: 'Principale', axe: '', axeDetail: '', repere: [client.adresse, client.ville].filter(Boolean).join(', ') }]
  ).map(normalizeAddress);
  return {
    name: client.name,
    societe: extra.societe || client.name,
    tel: client.tel || phones[0]?.number || '',
    whatsapp: client.whatsapp || '',
    email: client.email || '',
    type,
    typeAutre,
    adresse: client.adresse || '',
    ville: client.ville || '',
    canalVente: cv.value,
    canalVenteAutre: cv.autre,
    canalDecouverte: cd.value,
    canalDecouverteAutre: cd.autre,
    nif: client.nif || '',
    statNumber: client.statNumber || '',
    commercialName: client.commercialName || '',
    recommandations: extra.recommandations || '',
    charteCouleurs: extra.charteCouleurs || '',
    livraisonPrefs: extra.livraisonPrefs || '',
    conditionsCommerciales: extra.conditionsCommerciales || '',
    phones,
    addresses,
    files: extra.files || [],
  };
}

function payloadFromForm(form: ClientFormState, isUpdate = false) {
  const primaryTel = form.phones.find((p) => p.number.trim())?.number.trim() || form.tel.trim();
  const primaryAddr = form.addresses[0];
  const resolvedType = form.type === 'Autre' ? formatClientType('Autre', form.typeAutre) : form.type;
  const base = {
    name: form.name.trim(),
    tel: primaryTel || null,
    whatsapp: form.whatsapp.trim() || null,
    email: form.email.trim() || null,
    type: resolvedType,
    adresse: primaryAddr?.repere?.trim() || form.adresse.trim() || null,
    ville: form.ville.trim() || null,
    canalVente: canalStoredValue(form.canalVente, form.canalVenteAutre),
    canalDecouverte: canalStoredValue(form.canalDecouverte, form.canalDecouverteAutre),
    nif: form.nif.trim() || null,
    statNumber: form.statNumber.trim() || null,
    commercialName: form.commercialName.trim() || null,
    charte: serializeClientCharte({
      societe: form.societe.trim() || undefined,
      recommandations: form.recommandations.trim() || undefined,
      charteCouleurs: form.charteCouleurs.trim() || undefined,
      livraisonPrefs: form.livraisonPrefs.trim() || undefined,
      conditionsCommerciales: form.conditionsCommerciales.trim() || undefined,
      phones: form.phones.filter((p) => p.number.trim()),
      addresses: form.addresses
        .filter((a) => a.repere.trim() || a.axe)
        .map((a) => ({
          ...a,
          axe: a.axe === 'Autre' && a.axeDetail?.trim() ? `Autre — ${a.axeDetail.trim()}` : a.axe,
        })),
      files: form.files,
    }),
  };
  if (isUpdate) return base;
  return { ...base, categorie: 'Client', statut: statutFromCategorie('Client') };
}

export default function ClientsPageWrapper({ mode }: ClientsPageProps) {
  return (
    <Suspense fallback={<div className="p-8 text-center text-muted-foreground">Chargement clients…</div>}>
      <ClientsPage mode={mode} />
    </Suspense>
  );
}

export type ClientsPageMode = 'list' | 'detail';

type ClientsPageProps = {
  mode: ClientsPageMode;
};

export function ClientsPage({ mode }: ClientsPageProps) {
  const searchParams = useSearchParams();
  const params = useParams<{ id?: string }>();
  const router = useRouter();
  const { data: session } = useSession();
  const role = (session?.user as { role?: string })?.role ?? 'user';
  const canWrite = hasPermission(role, 'clients:write');
  const canMergeClients = canManageUsers(role);
  const { queryString, revision } = useModuleDateFilter();
  const liveTick = useOrionLiveRevision(['clients', 'devis', 'commandes']);
  const [clients, setClients] = useState<ClientData[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const pageSize = 25;
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);
  const [filterStatut, setFilterStatut] = useState('tous');
  const [showArchived, setShowArchived] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingClient, setEditingClient] = useState<ClientData | null>(null);
  const [selectedClient, setSelectedClient] = useState<ClientData | null>(null);
  const [formTab, setFormTab] = useState<'infos' | 'criteres' | 'fichiers'>('infos');
  const [form, setForm] = useState<ClientFormState>(EMPTY_FORM);
  const [listViewMode, setListViewMode] = useState<'cards' | 'table'>('table');
  const [detailTab, setDetailTab] = useState<'apercu' | 'activite' | 'criteres' | 'fichiers' | 'reclamations'>('apercu');
  const { mode: responsiveMode, ready } = useResponsiveMode();

  useEffect(() => {
    if (!ready) return;
    if (prefersCardList('/clients', responsiveMode) && listViewMode === 'table') {
      setListViewMode('cards');
    }
  }, [ready, responsiveMode, listViewMode]);
  const [historyClient, setHistoryClient] = useState<ClientData | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [noteDraft, setNoteDraft] = useState('');
  const [savingNote, setSavingNote] = useState(false);
  const [archiveTarget, setArchiveTarget] = useState<string | null>(null);
  const [removePhoneIndex, setRemovePhoneIndex] = useState<number | null>(null);
  const [removeAddressIndex, setRemoveAddressIndex] = useState<number | null>(null);
  const [restoreTarget, setRestoreTarget] = useState<string | null>(null);
  const [duplicateWarning, setDuplicateWarning] = useState<{
    duplicates: { id: string; code: string; name: string; reasons: string[] }[];
  } | null>(null);
  const [mergeDialog, setMergeDialog] = useState<{
    target: { id: string; code: string; name: string };
    sources: { id: string; code: string; name: string }[];
  } | null>(null);
  const [clientFiles, setClientFiles] = useState<FileAssetRow[]>([]);
  const [clientReclamations, setClientReclamations] = useState<ReclamationRow[]>([]);
  const [reclamationStats, setReclamationStats] = useState({ ouvertes: 0, urgentes: 0 });
  const [crmSummary, setCrmSummary] = useState({ total: 0, actifs: 0, vip: 0, nouveauxMois: 0, reclamations: 0 });
  const [detailLoading, setDetailLoading] = useState(false);
  const [newReclamation, setNewReclamation] = useState({ subject: '', description: '', priorite: 'Normale' });

  useEffect(() => {
    const statutQ = searchParams.get('statut');
    if (statutQ) setFilterStatut(statutQ);
    if (searchParams.get('flow') === 'pos' && searchParams.get('new') === '1') {
      setShowForm(true);
      setEditingClient(null);
      setForm(EMPTY_FORM);
    }
  }, [searchParams]);

  const posFlow = searchParams.get('flow') === 'pos';

  const selectClientForPos = (client: ClientData) => {
    setSelectedSalesClient(clientSnapshotFromApi(client));
    void import('@/lib/commercial/commercial-journey-store').then(({ emitCommercialJourney }) => {
      emitCommercialJourney('client_selected', { clientId: client.id, cartCount: 0 });
    });
    uxToast.success(`Client « ${client.name} » sélectionné — catalogue POS`);
    router.push('/pos');
  };

  const fetchClients = useCallback(async () => {
    void revision;
    void liveTick;
    setLoading(true);
    try {
      const qs = new URLSearchParams();
      qs.set('page', String(page));
      qs.set('pageSize', String(pageSize));
      if (debouncedSearch) qs.set('search', debouncedSearch);
      if (showArchived) {
        qs.set('archived', 'true');
      } else if (filterStatut !== 'tous') {
        qs.set('statut', filterStatut);
      }
      const dateQs = new URLSearchParams(queryString);
      dateQs.forEach((v, k) => qs.set(k, v));
      const res = await fetch(`/api/clients?${qs}`);
      if (res.ok) {
        const data = unwrapApiData<unknown>(await res.json());
        const list = Array.isArray(data)
          ? data
          : Array.isArray((data as { items?: unknown })?.items)
            ? (data as { items: ClientData[] }).items
            : Array.isArray((data as { clients?: unknown })?.clients)
              ? (data as { clients: ClientData[] }).clients
              : [];
        setClients(list as ClientData[]);
        const paginated = data as { total?: number; totalPages?: number; page?: number };
        if (typeof paginated?.total === 'number') {
          setTotalItems(paginated.total);
          setTotalPages(paginated.totalPages ?? Math.max(1, Math.ceil(paginated.total / pageSize)));
        } else {
          setTotalItems(list.length);
          setTotalPages(1);
        }
      }
      else uxToast.error('Erreur chargement clients');
    } catch { uxToast.error('Erreur chargement clients'); }
    finally { setLoading(false); }
  }, [debouncedSearch, filterStatut, showArchived, queryString, revision, page, pageSize, liveTick]);

  useEffect(() => { setPage(1); }, [debouncedSearch, filterStatut, showArchived]);

  useEffect(() => { fetchClients(); }, [fetchClients]);

  const refreshCrmSummary = useCallback(() => {
    fetch('/api/clients?summary=1')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        const summary = d ? unwrapApiData<typeof crmSummary>(d) : null;
        if (summary && typeof summary === 'object') setCrmSummary(summary);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetch('/api/reclamations?stats=1')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        const stats = d ? unwrapApiData<typeof reclamationStats>(d) : null;
        if (stats && typeof stats === 'object') setReclamationStats(stats);
      })
      .catch(() => {});
    refreshCrmSummary();
  }, [refreshCrmSummary]);

  useEffect(() => {
    if (!selectedClient?.id) {
      setClientReclamations([]);
      return;
    }
    fetch(`/api/reclamations?clientId=${selectedClient.id}`)
      .then((r) => (r.ok ? r.json() : { items: [] }))
      .then((body: unknown) => {
        const data = unwrapApiData<{ items?: ReclamationRow[] } | ReclamationRow[]>(body);
        if (Array.isArray(data)) setClientReclamations(data);
        else setClientReclamations(Array.isArray(data?.items) ? data.items : []);
      })
      .catch(() => setClientReclamations([]));
  }, [selectedClient?.id]);

  const fetchClientDetail = useCallback(async (id: string) => {
    setDetailLoading(true);
    try {
      const res = await fetch(`/api/clients/${id}`);
      if (res.status === 404) {
        uxToast.error('Client introuvable');
        setSelectedClient(null);
        router.replace('/clients');
        return;
      }
      if (res.ok) {
        setSelectedClient(unwrapApiData<ClientData>(await res.json()));
      } else {
        uxToast.error('Erreur chargement fiche client');
      }
    } catch { uxToast.error('Erreur chargement fiche client'); }
    finally { setDetailLoading(false); }
  }, [router]);

  useEffect(() => {
    if (mode === 'list') {
      setSelectedClient(null);
      return;
    }
    const fromPath = params?.id;
    const fromQuery = searchParams.get('client');
    const clientId = fromPath || fromQuery;
    if (!clientId) return;
    void fetchClientDetail(clientId);
    if (fromQuery && !fromPath) {
      router.replace(`/clients/${clientId}`);
    }
  }, [mode, params?.id, searchParams, router, fetchClientDetail]);

  const openClientProfile = (id: string) => {
    router.push(`/clients/${id}`);
    fetchClientDetail(id);
  };

  const closeClientProfile = () => {
    setSelectedClient(null);
    router.push('/clients');
  };

  const showDetail = mode === 'detail' && selectedClient;

  useEffect(() => {
    if (!selectedClient) return;
    setNoteDraft(selectedClient.notes || '');
    setDetailTab('apercu');
  }, [selectedClient]);

  const saveQuickNote = async (clientId: string) => {
    setSavingNote(true);
    try {
      const res = await liveFetch(`/api/clients/${clientId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: noteDraft.trim() || null }),
      });
      if (res.ok) {
        uxToast.success('Note enregistrée');
        emitOrionLive('clients', { entityId: clientId, source: 'quickNote' });
        const updated = unwrapApiData<ClientData>(await res.json());
        setSelectedClient((prev) => (prev?.id === clientId ? { ...prev, notes: updated.notes } : prev));
        setHistoryClient((prev) => (prev?.id === clientId ? { ...prev, notes: updated.notes } : prev));
        fetchClients();
      } else uxToast.error('Erreur enregistrement');
    } catch { uxToast.error('Erreur réseau'); }
    setSavingNote(false);
  };

  const openHistory = async (client: ClientData) => {
    setHistoryLoading(true);
    setHistoryClient(client);
    try {
      const res = await fetch(`/api/clients/${client.id}`);
      if (res.ok) {
        const data = unwrapApiData<ClientData>(await res.json());
        setHistoryClient(data);
        setNoteDraft(data.notes || '');
      }
    } catch { uxToast.error('Erreur chargement historique'); }
    setHistoryLoading(false);
  };

  useEffect(() => {
    if (selectedClient?.id) {
      fetch(`/api/files?clientId=${selectedClient.id}`)
        .then((r) => (r.ok ? r.json() : []))
        .then((body) => setClientFiles(normalizeFileRows(body)))
        .catch(() => setClientFiles([]));
    } else {
      setClientFiles([]);
    }
  }, [selectedClient?.id]);

  const handleSubmit = async (opts?: { forceDuplicate?: boolean; continueToPos?: boolean }) => {
    if (!form.name.trim()) { uxToast.error('Le nom est requis'); return; }
    if (form.nif.trim()) {
      const nifErr = validateNif(form.nif);
      if (nifErr) { uxToast.error(nifErr); return; }
    }
    if (form.type === 'Autre' && !form.typeAutre.trim()) {
      uxToast.error('Précisez le type de client');
      return;
    }
    if (form.canalVente === 'Autre' && !form.canalVenteAutre.trim()) {
      uxToast.error('Précisez le canal de vente');
      return;
    }
    if (form.canalDecouverte === 'Autre' && !form.canalDecouverteAutre.trim()) {
      uxToast.error('Précisez le canal de découverte');
      return;
    }
    for (const addr of form.addresses) {
      if (addr.axe === 'Autre' && !addr.axeDetail?.trim()) {
        uxToast.error('Précisez l\'axe de livraison « Autre »');
        return;
      }
    }
    try {
      const url = editingClient ? `/api/clients/${editingClient.id}` : '/api/clients';
      const method = editingClient ? 'PUT' : 'POST';
      const body = { ...payloadFromForm(form, !!editingClient), ...(opts?.forceDuplicate ? { forceDuplicate: true } : {}) };
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      if (res.status === 409 && !editingClient) {
        const err = await res.json();
        if (err.duplicates?.length) {
          setDuplicateWarning({ duplicates: err.duplicates });
          return;
        }
      }
      if (res.ok) {
        const saved = unwrapApiData<ClientData>(await res.json());
        uxToast.success(editingClient ? 'Client mis à jour' : 'Client créé');
        setShowForm(false);
        const editedId = editingClient?.id;
        setEditingClient(null);
        setFormTab('infos');
        setForm(EMPTY_FORM);
        setDuplicateWarning(null);
        fetchClients();
        refreshCrmSummary();
        if (editedId && selectedClient?.id === editedId) {
          setSelectedClient(saved);
          fetchClientDetail(editedId);
        } else if (!editedId && saved?.id) {
          setSelectedClient(saved);
        }
        if (opts?.continueToPos && saved?.id) {
          selectClientForPos(saved);
          return;
        }
      } else {
        const err = await res.json().catch(() => ({}));
        uxToast.error(getApiErrorMessage(err, 'Erreur'), 'Erreur');
      }
    } catch { uxToast.error('Erreur réseau'); }
  };

  const handleArchive = (id: string) => setArchiveTarget(id);

  const doArchive = async () => {
    if (!archiveTarget) return;
    const id = archiveTarget;
    setArchiveTarget(null);
    try {
      const res = await fetch(`/api/clients/${id}`, { method: 'DELETE' });
      if (res.ok) {
        uxToast.success('Client mis à la corbeille');
        fetchClients();
        refreshCrmSummary();
        if (selectedClient?.id === id) {
          setSelectedClient(null);
          router.replace('/clients');
        }
      } else {
        const err = await res.json().catch(() => ({}));
        uxToast.error(getApiErrorMessage(err, 'Erreur archivage'), 'Erreur archivage');
      }
    } catch { uxToast.error('Erreur archivage'); }
  };

  const doRestore = async () => {
    if (!restoreTarget) return;
    const id = restoreTarget;
    setRestoreTarget(null);
    try {
      const res = await fetch(`/api/clients/${id}/restore`, { method: 'POST' });
      if (res.ok) {
        uxToast.success('Client restauré');
        fetchClients();
        refreshCrmSummary();
        if (selectedClient?.id === id) fetchClientDetail(id);
        if (showArchived) setShowArchived(false);
      } else {
        const err = await res.json().catch(() => ({}));
        uxToast.error(getApiErrorMessage(err, 'Erreur restauration'), 'Erreur restauration');
      }
    } catch { uxToast.error('Erreur restauration'); }
  };

  const openEdit = async (client: ClientData) => {
    if (!canWrite) return;
    setEditingClient(client);
    const base = formFromClient(client);
    try {
      const res = await fetch(`/api/files?clientId=${client.id}`);
      if (res.ok) {
        base.files = mergeFileLists(base.files, await res.json());
      }
    } catch { /* ignore */ }
    setForm(base);
    setFormTab('infos');
    setShowForm(true);
  };

  const handleFilePick = async (fileList: FileList | null) => {
    if (!fileList?.length) return;
    for (const file of Array.from(fileList)) {
      if (editingClient?.id) {
        const fd = new FormData();
        fd.append('file', file);
        fd.append('clientId', editingClient.id);
        fd.append('category', 'autre');
        try {
          const res = await fetch('/api/files', { method: 'POST', body: fd });
          if (res.ok) {
            uxToast.success(`${file.name} uploadé`);
            const uploaded = unwrapApiData<FileAssetRow>(await res.json());
            setForm((f) => ({
              ...f,
              files: [...f.files, {
                name: uploaded.name,
                size: uploaded.sizeBytes,
                type: uploaded.mimeType,
                id: uploaded.id,
              }],
            }));
          } else uxToast.error(`Erreur upload ${file.name}`);
        } catch {
          uxToast.error('Erreur upload');
        }
      } else {
        setForm((f) => ({
          ...f,
          files: [...f.files, { name: file.name, size: file.size, type: file.type || 'application/octet-stream' }],
        }));
      }
    }
  };

  const stats = {
    total: crmSummary.total ?? clients.length,
    actifs: crmSummary.actifs,
    vip: crmSummary.vip,
    nouveauxMois: crmSummary.nouveauxMois,
    reclamations: crmSummary.reclamations || reclamationStats.ouvertes,
  };

  const submitReclamation = async (clientId: string) => {
    if (!newReclamation.subject.trim()) { uxToast.error('Sujet requis'); return; }
    const r = await fetch('/api/reclamations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clientId, ...newReclamation }),
    });
    if (r.ok) {
      uxToast.success('Réclamation enregistrée');
      setNewReclamation({ subject: '', description: '', priorite: 'Normale' });
      const listBody = await fetch(`/api/reclamations?clientId=${clientId}`).then((res) => res.json());
      const list = unwrapApiData<{ items?: ReclamationRow[] } | ReclamationRow[]>(listBody);
      if (Array.isArray(list)) setClientReclamations(list);
      else setClientReclamations(Array.isArray(list?.items) ? list.items : []);
      fetchClients();
      refreshCrmSummary();
    } else uxToast.error('Erreur enregistrement');
  };

  const updateReclamationStatut = async (id: string, statut: string) => {
    const r = await fetch(`/api/reclamations/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ statut }),
    });
    if (r.ok && selectedClient) {
      const updated = unwrapApiData<ReclamationRow>(await r.json());
      setClientReclamations((prev) => prev.map((x) => (x.id === id ? { ...x, ...updated } : x)));
      uxToast.success('Statut mis à jour');
    }
  };

  const openNewClientForm = () => {
    if (!canWrite) return;
    setEditingClient(null);
    setForm(EMPTY_FORM);
    setFormTab('infos');
    setShowForm(true);
  };

  useEffect(() => {
    if (searchParams.get('action') === 'new') openNewClientForm();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams.get('action')]);

  const hasActiveFilters = search.trim() !== '' || (!showArchived && filterStatut !== 'tous');

  const clientsEmptyState = (
    <OrionEmptyState
      icon={Users}
      title={hasActiveFilters ? 'Aucun client trouvé' : showArchived ? 'Aucun client archivé' : 'Aucun client enregistré'}
      description={
        hasActiveFilters
          ? 'Modifiez votre recherche ou le filtre statut pour afficher d\'autres résultats.'
          : showArchived
            ? 'Les clients archivés apparaîtront ici.'
            : 'Créez votre premier client pour commencer à gérer devis, commandes et factures.'
      }
      action={
        hasActiveFilters ? (
          <AppButton type="button" variant="outline" onClick={() => { setSearch(''); setFilterStatut('tous'); }}>
            Réinitialiser les filtres
          </AppButton>
        ) : (
          canWrite ? (
          <AppButton type="button" onClick={openNewClientForm}>
            <Plus size={16} /> Nouveau client
          </AppButton>
          ) : undefined
        )
      }
    />
  );

  // Detail view
  let pageBody: ReactNode;

  if (mode === 'detail' && detailLoading) {
    pageBody = <AppListSkeleton rows={8} />;
  } else if (showDetail) {
    const c = selectedClient!;
    const s = c.summary;
    const tagList = parseTags(c.tags);
    const charte = parseClientCharte(c.charte);
    const mergedFiles = mergeFileLists(charte.files ?? [], clientFiles);
    const detailTabs = [
      { id: 'apercu' as const, label: 'Aperçu', icon: User },
      { id: 'activite' as const, label: 'Activité', icon: Clock },
      { id: 'reclamations' as const, label: 'Réclamations', icon: MessageSquareWarning },
      { id: 'criteres' as const, label: 'Critères', icon: Target },
      { id: 'fichiers' as const, label: 'Fichiers', icon: Paperclip },
    ];

    pageBody = (
      <div className="space-y-6">
        <button type="button" onClick={closeClientProfile} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft size={16} /> Retour à la liste
        </button>
        {c.archived && (
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 px-4 py-3 rounded-[7px] border border-amber-500/30 bg-amber-500/10 text-sm">
            <span className="text-amber-700 dark:text-amber-300">Ce client est archivé — visible en lecture seule.</span>
            {canWrite && (
              <button
                type="button"
                onClick={() => setRestoreTarget(c.id)}
                className="sm:ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-500/10 text-green-600 font-semibold text-xs hover:bg-green-500/20"
              >
                <RotateCcw size={14} /> Restaurer
              </button>
            )}
          </div>
        )}
        <div className="bg-card border border-border rounded-[7px] p-6">
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-[7px] bg-primary/10 flex items-center justify-center">
                {c.type === 'Particulier' ? <User size={24} className="text-primary" /> : <Building2 size={24} className="text-primary" />}
              </div>
              <div>
                <div className="flex items-center gap-3 flex-wrap">
                  <h1 className="orion-text-page-title">{charte.societe || c.name}</h1>
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${getStatutStyle(c.statut)}`}>{displayClientStatut(c.statut)}</span>
                  {isClientFidele(c) && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#FFD60A]/10 text-[#FFD60A] flex items-center gap-1">
                      <Star size={10} /> Fidèle
                    </span>
                  )}
                </div>
                {charte.societe && charte.societe !== c.name && (
                  <p className="text-sm text-muted-foreground mt-0.5">{c.name}</p>
                )}
                <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground flex-wrap">
                  <span className="font-mono text-primary">{c.code}</span>
                  <span>•</span>
                  <span>{c.type}</span>
                  <span>•</span>
                  <span>Client depuis {new Date(c.createdAt).toLocaleDateString('fr-FR')}</span>
                </div>
                {tagList.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {tagList.map((t) => (
                      <span key={t} className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-accent text-muted-foreground">
                        {t}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="flex gap-2">
              {canWrite && !c.archived && (
                <>
                  <button type="button" onClick={() => openEdit(c)} className="px-3 py-2 rounded-lg hover:bg-accent text-sm font-semibold flex items-center gap-1.5" title="Modifier">
                    <Edit3 size={16} /> Modifier
                  </button>
                  <button type="button" onClick={() => handleArchive(c.id)} className="p-2 rounded-lg hover:bg-red-500/10 text-red-400" title="Mettre à la corbeille"><Trash2 size={16} /></button>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="flex gap-1 p-1 bg-accent/40 rounded-[7px]">
          {detailTabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setDetailTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-[7px] text-xs font-semibold transition-all ${
                detailTab === tab.id ? 'bg-primary/10 text-primary shadow-sm' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <tab.icon size={14} />
              {tab.label}
            </button>
          ))}
        </div>

        {detailTab === 'apercu' && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 bg-card border border-border rounded-[7px] p-4">
              {(charte.phones?.length ? charte.phones : [{ label: 'Principal', number: c.tel || '' }]).filter((p) => p.number).map((ph, i) => (
                <div key={i} className="flex items-center gap-2 text-sm">
                  <Phone size={14} className="text-muted-foreground shrink-0" />
                  <div>
                    <div className="orion-text-meta">{ph.label}</div>
                    {ph.number}
                  </div>
                </div>
              ))}
              {c.email && <div className="flex items-center gap-2 text-sm"><Mail size={14} className="text-muted-foreground shrink-0" />{c.email}</div>}
              {c.whatsapp && <div className="flex items-center gap-2 text-sm"><MessageCircle size={14} className="text-green-500 shrink-0" />{c.whatsapp}</div>}
              {(charte.addresses?.length ? charte.addresses : [{ label: 'Principale', axe: '', repere: [c.adresse, c.ville].filter(Boolean).join(', ') }]).filter((a) => a.repere || a.axe).map((addr, i) => (
                <div key={i} className="flex items-start gap-2 text-sm sm:col-span-2">
                  <MapPin size={14} className="text-muted-foreground shrink-0 mt-0.5" />
                  <div>
                    <div className="orion-text-meta">{addr.label}{addr.axe ? ` · ${addr.axe}` : ''}</div>
                    {addr.repere}
                  </div>
                </div>
              ))}
              {c.nif && <div className="text-xs text-muted-foreground">NIF: {c.nif}</div>}
              {c.commercialName && <div className="text-xs text-muted-foreground">Commercial: {c.commercialName}</div>}
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-card border border-border rounded-[7px] p-4 text-center">
                <div className={`font-mono text-xl font-bold ${(s?.solde ?? 0) > 0 ? 'text-red-500' : 'text-green-500'}`}>
                  {formatPrice(s?.solde ?? 0)}
                </div>
                <div className="text-xs text-muted-foreground mt-1">Solde / reste dû</div>
              </div>
              <div className="bg-card border border-border rounded-[7px] p-4 text-center">
                <div className="font-mono text-xl font-bold text-primary">{formatPrice(s?.totalPaye ?? 0)}</div>
                <div className="text-xs text-muted-foreground mt-1">Total encaissé</div>
              </div>
              <div className="bg-card border border-border rounded-[7px] p-4 text-center">
                <div className="font-mono text-xl font-bold text-primary">{formatPrice(s?.totalFacture ?? 0)}</div>
                <div className="text-xs text-muted-foreground mt-1">Total facturé</div>
              </div>
              <div className="bg-card border border-border rounded-[7px] p-4 text-center">
                <div className="font-mono text-xl font-bold text-primary">{s?.commandesCount ?? c.commandes?.length ?? 0}</div>
                <div className="text-xs text-muted-foreground mt-1">Commandes · {s?.devisCount ?? 0} devis</div>
              </div>
            </div>

            {canWrite && !c.archived && (
            <div className="bg-card border border-border rounded-[7px] p-4">
              <label className="orion-text-label mb-2 block">Note client / charte / dossier local</label>
              <textarea
                value={noteDraft}
                onChange={(e) => setNoteDraft(e.target.value)}
                rows={4}
                placeholder="Note, charte graphique, chemin dossier local..."
                className="w-full bg-background border border-border rounded-[7px] px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30 resize-y"
              />
              <AppButton
                type="button"
                onClick={() => saveQuickNote(c.id)}
                disabled={savingNote}
                className="mt-3"
              >
                <Save size={14} /> {savingNote ? 'Enregistrement…' : 'Enregistrer la note'}
              </AppButton>
            </div>
            )}
            {(!canWrite || c.archived) && c.notes && (
              <div className="bg-card border border-border rounded-[7px] p-4">
                <label className="orion-text-label mb-2 block">Notes</label>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{c.notes}</p>
              </div>
            )}
          </>
        )}

        {detailTab === 'activite' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-card border border-border rounded-[7px] p-4">
            <h3 className="font-semibold text-sm flex items-center gap-2 mb-4">
              <Clock size={16} className="text-primary" /> Timeline d&apos;activité
            </h3>
            {(c.timeline?.length ?? 0) === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">Aucune activité enregistrée</p>
            ) : (
              <div className="space-y-0 max-h-[420px] overflow-y-auto pr-1">
                {c.timeline!.map((item, i) => {
                  const meta = TIMELINE_ICON[item.type];
                  const Icon = meta.icon;
                  return (
                    <button
                      key={`${item.type}-${item.id}`}
                      type="button"
                      onClick={() => router.push(timelineHref(item.type, item.id))}
                      className="flex gap-3 pb-4 relative w-full text-left rounded-lg hover:bg-accent/30 -mx-1 px-1 transition-colors"
                    >
                      {i < c.timeline!.length - 1 && (
                        <div className="absolute left-[15px] top-8 bottom-0 w-px bg-border" />
                      )}
                      <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 z-10" style={{ background: `${meta.color}20` }}>
                        <Icon size={14} style={{ color: meta.color }} />
                      </div>
                      <div className="flex-1 min-w-0 pt-0.5">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-mono text-xs text-primary flex items-center gap-1">
                            {item.label}
                            <ExternalLink size={10} className="opacity-50" />
                          </span>
                          {item.montant != null && (
                            <span className="font-mono text-xs font-semibold shrink-0">{formatPrice(item.montant)}</span>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5 truncate">{item.sublabel}</div>
                        <div className="flex items-center gap-2 mt-1">
                          {item.statut && (
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${getStatutStyle(item.statut)}`}>{item.statut}</span>
                          )}
                          <span className="text-[10px] text-muted-foreground">
                            {new Date(item.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </span>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Colonne droite : devis + factures + paiements */}
          <div className="space-y-4">
            {c.devis && c.devis.length > 0 && (
              <div className="bg-card border border-border rounded-[7px] p-4">
                <h3 className="font-semibold text-sm flex items-center gap-2 mb-3"><FileText size={16} className="text-[#FFD60A]" /> Devis ({c.devis.length})</h3>
                <div className="space-y-2">
                  {c.devis.slice(0, 5).map((d) => (
                    <div key={d.id} className="flex items-center justify-between py-2 border-b border-border last:border-0 text-sm gap-2">
                      <button type="button" onClick={() => router.push(`/devis?id=${d.id}`)} className="flex items-center gap-2 min-w-0 flex-1 hover:bg-accent/30 rounded-lg px-1 transition-colors text-left">
                        <span className="font-mono text-xs text-primary">{d.numero}</span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${getStatutStyle(d.statut)}`}>{d.statut}</span>
                        <span className="font-mono text-xs text-[#FFD60A] shrink-0 ml-auto">{formatPrice(d.totalHT)}</span>
                      </button>
                      <a
                        href={`/api/devis/${d.id}/pdf?doc=proforma&format=pdf&download=1`}
                        download
                        className="shrink-0 flex items-center gap-1 text-[10px] font-semibold text-[#7b1fa2] hover:underline px-2 py-1 rounded-lg bg-[#7b1fa2]/10"
                        title="Télécharger proforma"
                      >
                        <Download size={12} /> PDF
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {c.factures && c.factures.length > 0 && (
              <div className="bg-card border border-border rounded-[7px] p-4">
                <h3 className="font-semibold text-sm flex items-center gap-2 mb-3"><Receipt size={16} className="text-primary" /> Factures ({c.factures.length})</h3>
                <div className="space-y-2">
                  {c.factures.slice(0, 5).map((f) => (
                    <div key={f.id} className="flex items-center justify-between py-2 border-b border-border last:border-0 text-sm gap-2">
                      <button type="button" onClick={() => router.push(`/factures?id=${f.id}`)} className="flex items-center gap-2 flex-1 hover:bg-accent/30 rounded-lg px-1 transition-colors text-left">
                        <span className="font-mono text-xs text-primary">{f.numero}</span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${getStatutStyle(f.statut)}`}>{f.statut}</span>
                        <span className="font-mono text-xs ml-auto">{formatPrice(f.totalTTC)}</span>
                      </button>
                      <a
                        href={`/api/factures/${f.id}/pdf?format=pdf&download=1`}
                        download
                        className="shrink-0 flex items-center gap-1 text-[10px] font-semibold text-primary hover:underline px-2 py-1 rounded-lg bg-primary/10"
                        title="Télécharger facture PDF"
                      >
                        <Download size={12} /> PDF
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {c.paiements && c.paiements.length > 0 && (
              <div className="bg-card border border-border rounded-[7px] p-4">
                <h3 className="font-semibold text-sm flex items-center gap-2 mb-3"><Banknote size={16} className="text-primary" /> Paiements ({c.paiements.length})</h3>
                <div className="space-y-2">
                  {c.paiements.slice(0, 5).map((p) => (
                    <button key={p.id} type="button" onClick={() => router.push(`/paiements?id=${p.id}`)} className="flex items-center justify-between py-2 border-b border-border last:border-0 text-sm w-full hover:bg-accent/30 rounded-lg px-1 transition-colors">
                      <div>
                        <span className="font-mono text-xs text-primary">{p.numero}</span>
                        <span className="text-xs text-muted-foreground ml-2">{p.mode} · {p.type}</span>
                      </div>
                      <span className="font-mono text-xs text-green-500">{formatPrice(p.montant)}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {c.commandes && c.commandes.length > 0 && (
              <div className="bg-card border border-border rounded-[7px] p-4">
                <h3 className="font-semibold text-sm flex items-center gap-2 mb-3"><ClipboardList size={16} className="text-[#10B981]" /> Commandes en cours</h3>
                <div className="space-y-2">
                  {c.commandes.slice(0, 4).map((cmd) => (
                    <button key={cmd.id} type="button" onClick={() => router.push(`/commandes?id=${cmd.id}`)} className="py-2 border-b border-border last:border-0 w-full text-left hover:bg-accent/30 rounded-lg px-1 transition-colors">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-mono text-xs text-primary">{cmd.numero}</span>
                        <span className="font-mono text-xs">{formatPrice(cmd.total)}</span>
                      </div>
                      <div className="text-xs text-muted-foreground truncate mt-0.5">{cmd.article}</div>
                      <div className="flex items-center gap-2 mt-1">
                        <div className="flex-1 h-1 bg-accent rounded-full overflow-hidden">
                          <div className="h-full bg-primary rounded-full" style={{ width: `${cmd.avancement}%` }} />
                        </div>
                        <span className="text-[10px] text-muted-foreground">{cmd.avancement}%</span>
                        {cmd.reste > 0 && <span className="text-[10px] text-red-400">Reste {formatPrice(cmd.reste)}</span>}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
        )}

        {detailTab === 'reclamations' && (
          <div className="space-y-4">
            <div className="bg-card border border-border rounded-[7px] p-4">
              <h3 className="font-semibold text-sm flex items-center gap-2 mb-4">
                <MessageSquareWarning size={16} className="text-orange-500" />
                Réclamations SAV ({clientReclamations.length})
              </h3>
              {clientReclamations.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">Aucune réclamation pour ce client.</p>
              ) : (
                <div className="space-y-3">
                  {clientReclamations.map((r) => (
                    <div key={r.id} className="p-3 rounded-lg border border-border bg-accent/20">
                      <div className="flex items-start justify-between gap-2 flex-wrap">
                        <div>
                          <p className="font-semibold text-sm">{r.subject}</p>
                          {r.description && <p className="text-xs text-muted-foreground mt-1">{r.description}</p>}
                          <p className="text-[10px] text-muted-foreground mt-1">
                            {new Date(r.createdAt).toLocaleDateString('fr-FR')} · Priorité {r.priorite}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${RECL_STATUT_STYLE[r.statut] ?? RECL_STATUT_STYLE.Ouverte}`}>
                            {r.statut}
                          </span>
                          {canWrite && r.statut !== 'Clôturée' && r.statut !== 'Résolue' && (
                            <select
                              value={r.statut}
                              onChange={(e) => updateReclamationStatut(r.id, e.target.value)}
                              className="text-xs bg-background border border-border rounded-lg px-2 py-1"
                            >
                              <option value="Ouverte">Ouverte</option>
                              <option value="En cours">En cours</option>
                              <option value="Résolue">Résolue</option>
                              <option value="Clôturée">Clôturée</option>
                            </select>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            {canWrite && !c.archived && (
              <div className="bg-card border border-border rounded-[7px] p-4">
                <h4 className="text-sm font-semibold mb-3">Nouvelle réclamation</h4>
                <div className="space-y-3">
                  <input
                    type="text"
                    placeholder="Sujet"
                    value={newReclamation.subject}
                    onChange={(e) => setNewReclamation((f) => ({ ...f, subject: e.target.value }))}
                    className="w-full bg-background border border-border rounded-[7px] px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30"
                  />
                  <textarea
                    placeholder="Description (optionnel)"
                    value={newReclamation.description}
                    onChange={(e) => setNewReclamation((f) => ({ ...f, description: e.target.value }))}
                    rows={3}
                    className="w-full bg-background border border-border rounded-[7px] px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30 resize-y"
                  />
                  <div className="flex gap-3 flex-wrap">
                    <select
                      value={newReclamation.priorite}
                      onChange={(e) => setNewReclamation((f) => ({ ...f, priorite: e.target.value }))}
                      className="bg-background border border-border rounded-[7px] px-3 py-2 text-sm"
                    >
                      <option value="Basse">Basse</option>
                      <option value="Normale">Normale</option>
                      <option value="Haute">Haute</option>
                      <option value="Urgente">Urgente</option>
                    </select>
                    <AppButton type="button" onClick={() => submitReclamation(c.id)}>
                      Enregistrer
                    </AppButton>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {detailTab === 'criteres' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {[
              { label: 'Recommandations', value: charte.recommandations, icon: Star, color: '#FFD60A' },
              { label: 'Charte couleurs', value: charte.charteCouleurs, icon: Palette, color: ANS.red },
              { label: 'Préférences livraison', value: charte.livraisonPrefs, icon: Package, color: '#10B981' },
              { label: 'Conditions commerciales', value: charte.conditionsCommerciales, icon: Target, color: ANS.redDark },
            ].map((block) => (
              <div key={block.label} className="bg-card border border-border rounded-[7px] p-4">
                <h3 className="font-semibold text-sm flex items-center gap-2 mb-2">
                  <block.icon size={16} style={{ color: block.color }} /> {block.label}
                </h3>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{block.value || '— Non renseigné —'}</p>
              </div>
            ))}
            <div className="bg-card border border-border rounded-[7px] p-4 lg:col-span-2">
              <h3 className="font-semibold text-sm flex items-center gap-2 mb-3"><MapPin size={16} className="text-primary" /> Adresses & axes livraison</h3>
              {(charte.addresses?.length ? charte.addresses : []).filter((a) => a.repere || a.axe).length === 0 ? (
                <p className="text-sm text-muted-foreground">Aucune adresse détaillée — modifier le client pour en ajouter.</p>
              ) : (
                <div className="grid sm:grid-cols-2 gap-3">
                  {(charte.addresses || []).filter((a) => a.repere || a.axe).map((addr, i) => (
                    <div key={i} className="p-3 rounded-lg bg-accent/50 text-sm">
                      <div className="font-semibold text-xs uppercase text-muted-foreground">{addr.label}</div>
                      {addr.axe && <div className="text-primary text-xs mt-0.5">{addr.axe}</div>}
                      <div className="mt-1">{addr.repere}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {detailTab === 'fichiers' && (
          <div className="bg-card border border-border rounded-[7px] p-4">
            <h3 className="font-semibold text-sm flex items-center gap-2 mb-4"><Paperclip size={16} className="text-primary" /> Fichiers & références</h3>
            {mergedFiles.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                Aucun fichier.{canWrite && !c.archived ? ' Ajoutez-en via « Modifier client » → onglet Fichiers.' : ''}
              </p>
            ) : (
              <div className="space-y-2">
                {mergedFiles.map((f, i) => (
                  <div key={f.id ?? `${f.name}-${i}`} className="flex flex-col sm:flex-row sm:items-center justify-between py-3 px-3 rounded-lg bg-accent/40 text-sm gap-3">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      {f.id && f.type?.startsWith('image/') ? (
                        <a href={`/api/files/${f.id}`} target="_blank" rel="noopener noreferrer" className="shrink-0">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={`/api/files/${f.id}`} alt={f.name} className="w-14 h-14 object-cover rounded-lg border border-border" />
                        </a>
                      ) : (
                        <Paperclip size={14} className="text-muted-foreground shrink-0" />
                      )}
                      <span className="truncate font-medium">{f.name}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs text-muted-foreground">
                        {f.size ? `${Math.round(f.size / 1024)} Ko` : ''}{f.type ? ` · ${f.type.split('/').pop()}` : ''}
                      </span>
                      {f.id && (
                        <>
                          <a
                            href={clientFileUrl(f.id, true)}
                            download={f.name}
                            className="flex items-center gap-1 text-xs font-semibold text-[#10B981] hover:underline"
                          >
                            <Download size={12} /> Télécharger
                          </a>
                          <a
                            href={clientFileUrl(f.id)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-xs text-muted-foreground hover:underline"
                          >
                            <Eye size={12} /> Aperçu
                          </a>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    );
  } else {
    pageBody = (
    <AppModuleShell>
      <FlowPageBanner
        entity="client"
        status={filterStatut === 'tous' ? 'CRM' : filterStatut}
        impactedModules={['Devis', 'Commandes', 'Factures', 'ANS Talk']}
      />
      <OrionPageHeader
        title="CRM Clients"
        description={`${stats.total} clients · ${stats.vip} fidèle(s) · ${stats.reclamations} réclamation(s)`}
        compact
        icon={Users}
        actions={
          canWrite ? (
          <AppButton type="button" className="hidden md:inline-flex" onClick={openNewClientForm}>
            <Plus size={16} strokeWidth={1.75} /> Nouveau client
          </AppButton>
          ) : undefined
        }
      />
      <AppResponsiveKpiGrid columns={5} phoneMax={3}>
        <ClientsKpiStrip stats={stats} />
      </AppResponsiveKpiGrid>

      <AppModuleToolbar
        search={{ value: search, onChange: setSearch, placeholder: 'Rechercher par nom, email, code, téléphone…' }}
        filters={(
          <>
            <select value={filterStatut} onChange={(e) => setFilterStatut(e.target.value)} disabled={showArchived} className="orion-select-field shrink-0 disabled:opacity-50">
              <option value="tous">Tous</option>
              <option value="fidele">Client fidèle</option>
              <option value="Prospect">Prospect</option>
              <option value="Actif">Actif</option>
              <option value="Inactif">Inactif</option>
            </select>
            <EntityModuleDataBar
              entity="clients"
              trash={showArchived}
              onTrashChange={setShowArchived}
              onAfterImport={() => { void fetchClients(); }}
            />
          </>
        )}
        viewToggle={(
          <AppViewToggle
            value={listViewMode}
            onChange={setListViewMode}
            options={[
              { id: 'table', label: 'Tableau', icon: List },
              { id: 'cards', label: 'Cartes', icon: Grid3X3 },
            ]}
          />
        )}
      />

      {loading ? (
        <AppListSkeleton rows={6} />
      ) : listViewMode === 'table' ? (
        clients.length === 0 ? (
          clientsEmptyState
        ) : (
        <OrionColumnTable
          data={clients}
          rowKey={(c) => c.id}
          enableSorting
          virtualizeThreshold={50}
          onRowClick={(client) => openClientProfile(client.id)}
          columns={[
            { id: 'code', accessorKey: 'code', header: 'ID', cell: (c) => <span className="orion-ref-muted">{c.code}</span> },
            {
              id: 'name',
              accessorKey: 'name',
              enableSorting: true,
              header: 'Nom',
              cell: (c) => (
                <>
                  <div className="font-semibold">{c.name}</div>
                  {c.tel && <div className="text-xs text-muted-foreground">{c.tel}</div>}
                </>
              ),
            },
            { id: 'type', accessorKey: 'type', header: 'Type', cell: (c) => <span className="text-muted-foreground">{c.type}</span> },
            {
              id: 'caTotal',
              accessorKey: 'caTotal',
              enableSorting: true,
              header: 'CA cumulé',
              headerClassName: 'text-right',
              className: 'text-right font-mono text-xs',
              cell: (c) => formatPrice(c.caTotal ?? 0),
            },
            {
              id: 'solde',
              accessorKey: 'solde',
              enableSorting: true,
              header: 'Solde',
              headerClassName: 'text-right',
              className: 'text-right font-mono text-xs',
              cell: (c) => formatPrice(c.solde ?? 0),
            },
            {
              id: 'statut',
              accessorKey: 'statut',
              header: 'Statut',
              cell: (c) => (
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${getStatutStyle(c.statut)}`}>
                  {displayClientStatut(c.statut)}
                </span>
              ),
            },
            {
              id: 'actions',
              header: 'Actions',
              headerClassName: 'text-right',
              className: 'text-right',
              cell: (c) => (
                <AppTableRowActions
                  actions={[
                    { id: 'history', label: 'Historique', icon: <History size={16} strokeWidth={1.75} />, onClick: () => openHistory(c) },
                    { id: 'profile', label: 'Profil', icon: <Eye size={16} strokeWidth={1.75} />, onClick: () => openClientProfile(c.id) },
                    ...(showArchived && canWrite ? [{
                      id: 'restore',
                      label: 'Restaurer',
                      icon: <RotateCcw size={16} strokeWidth={1.75} />,
                      onClick: () => setRestoreTarget(c.id),
                    }] : canWrite ? [{
                      id: 'edit',
                      label: 'Modifier',
                      icon: <Edit3 size={16} strokeWidth={1.75} />,
                      onClick: () => openEdit(c),
                    }] : []),
                  ]}
                />
              ),
            },
          ]}
        />
        )
      ) : clients.length === 0 ? (
        clientsEmptyState
      ) : (
        <VirtualizedList
          items={clients}
          rowKey={(c) => c.id}
          rowHeight={148}
          threshold={50}
          renderRow={(client) => (
            <div
              onClick={() => openClientProfile(client.id)}
              className="orion-card p-4 cursor-pointer group hover:border-[color-mix(in_srgb,var(--ans-pink-500)_28%,var(--border-subtle))]"
            >
              <div className="flex items-start gap-3">
                <div className="orion-data-row-icon shrink-0">
                  {client.type === 'Particulier' ? <User size={18} strokeWidth={1.75} /> : <Building2 size={18} strokeWidth={1.75} />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-sm truncate">{client.name}</h3>
                    {isClientFidele(client) && <Star size={12} className="text-[var(--ans-gold-500)] shrink-0" aria-label="Client fidèle" />}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${getStatutStyle(client.statut)}`}>{displayClientStatut(client.statut)}</span>
                    <span className="text-[10px] text-[var(--text-muted)]">{client.type}</span>
                    <span className="orion-ref-muted">{client.code}</span>
                  </div>
                </div>
                <div className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0" onClick={(e) => e.stopPropagation()}>
                  <AppTableRowActions
                    actions={[
                      { id: 'hist', label: 'Historique', icon: <History size={16} strokeWidth={1.75} />, onClick: () => openHistory(client) },
                      ...(posFlow && !showArchived ? [{ id: 'pos', label: 'POS', icon: <Eye size={16} strokeWidth={1.75} />, onClick: () => selectClientForPos(client) }] : []),
                      ...(canWrite && !showArchived ? [{ id: 'edit', label: 'Modifier', icon: <Edit3 size={16} strokeWidth={1.75} />, onClick: () => openEdit(client) }] : []),
                      ...(showArchived && canWrite ? [{ id: 'restore', label: 'Restaurer', icon: <RotateCcw size={16} strokeWidth={1.75} />, onClick: () => setRestoreTarget(client.id) }] : []),
                    ]}
                  />
                </div>
              </div>
              <div className="mt-3 space-y-1">
                {client.email && <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]"><Mail size={12} />{client.email}</div>}
                {client.tel && <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]"><Phone size={12} />{client.tel}</div>}
              </div>
              <div className="flex items-center justify-between mt-3 pt-3 border-t border-[var(--border-subtle)]">
                <div>
                  <div className="orion-amount">{formatPrice(client.solde ?? 0)}</div>
                  <div className="text-[10px] text-[var(--text-muted)]">{client.cmds} cmd{client.cmds > 1 ? 's' : ''} • {client._count?.devis || 0} devis</div>
                </div>
                {client.notes && <div className="text-xs text-[var(--text-muted)] italic max-w-[140px] truncate">{client.notes}</div>}
              </div>
            </div>
          )}
        />
      )}

      <AppListPagination page={page} totalPages={totalPages} total={totalItems} onPageChange={setPage} />

      <AppStickyActionBar>
        {canWrite ? (
          <AppButton type="button" onClick={openNewClientForm}>
            <Plus size={16} className="mr-1.5" /> Nouveau client
          </AppButton>
        ) : (
          <AppButton type="button" variant="outline" onClick={() => { void fetchClients(); }}>
            <RotateCcw size={16} className="mr-1.5" /> Actualiser
          </AppButton>
        )}
      </AppStickyActionBar>

    </AppModuleShell>
    );
  }

  return (
    <>
      {pageBody}

      {/* Modal historique rapide */}
      <AnimatePresence>
        {historyClient && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-backdrop backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setHistoryClient(null)}>
            <motion.div initial={{ scale: 0.95, y: 8 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95 }} onClick={(e) => e.stopPropagation()} className="bg-card border border-border rounded-[7px] w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
              <div className="flex items-center justify-between p-5 border-b border-border">
                <h2 className="orion-text-section-title flex items-center gap-2">
                  <History size={18} className="text-primary" /> Historique — {historyClient.name}
                </h2>
                <button type="button" onClick={() => setHistoryClient(null)} className="p-1 rounded-lg hover:bg-accent"><X size={18} /></button>
              </div>
              <div className="p-5 overflow-y-auto flex-1 space-y-4">
                {historyLoading ? (
                  <p className="text-sm text-muted-foreground text-center py-8">Chargement…</p>
                ) : (
                  <>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-3 rounded-[7px] bg-green-500/10 text-center">
                        <div className="font-mono font-bold text-green-500">{formatPrice(historyClient.summary?.totalFacture ?? 0)}</div>
                        <div className="orion-text-meta mt-1">C.A. total</div>
                      </div>
                      <div className="p-3 rounded-[7px] bg-slate-500/10 text-center">
                        <div className="font-mono font-bold text-primary">{historyClient.summary?.commandesCount ?? historyClient.commandes?.length ?? 0}</div>
                        <div className="orion-text-meta mt-1">Commandes</div>
                      </div>
                    </div>
                    <div>
                      <h3 className="orion-text-card-title mb-2">Historique commandes</h3>
                      {(historyClient.commandes?.length ?? 0) === 0 ? (
                        <p className="text-sm text-muted-foreground">Aucune commande</p>
                      ) : (
                        <div className="space-y-2 max-h-56 overflow-y-auto">
                          {historyClient.commandes!.map((cmd) => (
                            <button
                              key={cmd.id}
                              type="button"
                              onClick={() => { setHistoryClient(null); router.push(`/commandes/${cmd.id}`); }}
                              className="w-full p-3 rounded-[7px] bg-accent/40 text-sm text-left hover:bg-accent/70 transition-colors"
                            >
                              <div className="flex items-center justify-between gap-2">
                                <span className="font-mono text-xs text-primary">{cmd.numero}</span>
                                <span className="font-mono text-xs">{formatPrice(cmd.total)}</span>
                              </div>
                              <div className="text-xs text-muted-foreground mt-1 truncate">{cmd.article}</div>
                              <span className={`inline-block mt-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${getStatutStyle(cmd.statut)}`}>{cmd.statut}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    {isClientFidele(historyClient) && (
                      <p className="text-xs text-[#FFD60A] flex items-center gap-1"><Star size={12} /> Client fidèle (CA ou volume)</p>
                    )}
                  </>
                )}
              </div>
              <div className="p-4 border-t border-border flex gap-2">
                <AppButton type="button" variant="outline" onClick={() => setHistoryClient(null)} className="flex-1">Fermer</AppButton>
                <AppButton
                  type="button"
                  onClick={() => { const id = historyClient.id; setHistoryClient(null); openClientProfile(id); }}
                  className="flex-1"
                >
                  Voir fiche complète →
                </AppButton>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal form — Infos / Critères / Fichiers */}
      <AnimatePresence>
        {showForm && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-backdrop backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowForm(false)}>
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} onClick={e => e.stopPropagation()} className="bg-card border border-border rounded-[7px] w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
              <div className="flex items-center justify-between p-5 pb-0">
                <h2 className="orion-text-section-title">{editingClient ? 'Modifier client' : 'Nouveau client'}</h2>
                <button onClick={() => setShowForm(false)} className="p-1 rounded-lg hover:bg-accent"><X size={18} /></button>
              </div>

              <div className="flex gap-1 p-4 pb-0">
                {([
                  { id: 'infos' as const, label: 'Infos', icon: User, color: ANS.redDark },
                  { id: 'criteres' as const, label: 'Critères', icon: Star, color: '#FFD60A' },
                  { id: 'fichiers' as const, label: 'Fichiers', icon: Paperclip, color: ANS.red },
                ]).map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setFormTab(tab.id)}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-[7px] text-xs font-semibold transition-all border-2 ${
                      formTab === tab.id ? 'border-primary bg-background shadow-sm' : 'border-transparent bg-accent/50 text-muted-foreground hover:bg-accent'
                    }`}
                  >
                    <tab.icon size={14} style={{ color: tab.color }} />
                    {tab.label}
                  </button>
                ))}
              </div>

              <div className="p-5 overflow-y-auto flex-1 space-y-4">
                {formTab === 'infos' && (
                  <>
                    <div>
                      <label className="orion-text-label mb-1 block">Nom complet *</label>
                      <input type="text" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="w-full bg-background border border-border rounded-[7px] px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30" placeholder="Raison sociale ou nom" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="orion-text-label mb-1 block">Société</label>
                        <input type="text" value={form.societe} onChange={e => setForm(f => ({ ...f, societe: e.target.value }))} className="w-full bg-background border border-border rounded-[7px] px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30" />
                      </div>
                      <div>
                        <label className="orion-text-label mb-1 block">Type client</label>
                        <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))} className="w-full bg-background border border-border rounded-[7px] px-3 py-2.5 text-sm outline-none">
                          <option value="">— Choisir —</option>
                          {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                        {form.type === 'Autre' && (
                          <input
                            type="text"
                            value={form.typeAutre}
                            onChange={e => setForm(f => ({ ...f, typeAutre: e.target.value }))}
                            className="mt-2 w-full bg-background border border-border rounded-[7px] px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30"
                            placeholder="Précisez le type *"
                          />
                        )}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs font-semibold text-muted-foreground mb-1 block">NIF</label>
                        <input
                          type="text"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          value={form.nif}
                          onChange={e => setForm(f => ({ ...f, nif: e.target.value.replace(/\D/g, '') }))}
                          className="w-full bg-background border border-border rounded-[7px] px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30"
                          placeholder="Optionnel — chiffres uniquement"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-muted-foreground mb-1 block">STAT</label>
                        <input type="text" value={form.statNumber} onChange={e => setForm(f => ({ ...f, statNumber: e.target.value }))} className="w-full bg-background border border-border rounded-[7px] px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30" placeholder="Optionnel — N° STAT" />
                      </div>
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-muted-foreground mb-1 block">Commercial responsable</label>
                      <input type="text" value={form.commercialName} onChange={e => setForm(f => ({ ...f, commercialName: e.target.value }))} className="w-full bg-background border border-border rounded-[7px] px-3 py-2.5 text-sm outline-none" placeholder="Nom du commercial" />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs font-semibold text-muted-foreground mb-1 block">Canal de vente</label>
                        <select value={form.canalVente} onChange={e => setForm(f => ({ ...f, canalVente: e.target.value }))} className="w-full bg-background border border-border rounded-[7px] px-3 py-2.5 text-sm outline-none">
                          <option value="">— Choisir —</option>
                          {CLIENT_CANAUX_VENTE.map((c) => <option key={c} value={c}>{c}</option>)}
                        </select>
                        {form.canalVente === 'Autre' && (
                          <input
                            type="text"
                            value={form.canalVenteAutre}
                            onChange={e => setForm(f => ({ ...f, canalVenteAutre: e.target.value }))}
                            className="mt-2 w-full bg-background border border-border rounded-[7px] px-3 py-2 text-sm outline-none"
                            placeholder="Précision canal vente *"
                          />
                        )}
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-muted-foreground mb-1 block">Canal de découverte</label>
                        <select value={form.canalDecouverte} onChange={e => setForm(f => ({ ...f, canalDecouverte: e.target.value }))} className="w-full bg-background border border-border rounded-[7px] px-3 py-2.5 text-sm outline-none">
                          <option value="">— Choisir —</option>
                          {CLIENT_CANAUX_DECOUVERTE.map((c) => <option key={c} value={c}>{c}</option>)}
                        </select>
                        {form.canalDecouverte === 'Autre' && (
                          <input
                            type="text"
                            value={form.canalDecouverteAutre}
                            onChange={e => setForm(f => ({ ...f, canalDecouverteAutre: e.target.value }))}
                            className="mt-2 w-full bg-background border border-border rounded-[7px] px-3 py-2 text-sm outline-none"
                            placeholder="Précision canal découverte *"
                          />
                        )}
                      </div>
                    </div>
                    <div>
                      <label className="orion-text-label mb-1 block">Email</label>
                      <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} className="w-full bg-background border border-border rounded-[7px] px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30" placeholder="email@example.com" />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="orion-text-label">Contacts téléphoniques</label>
                        <button type="button" onClick={() => setForm(f => ({ ...f, phones: [...f.phones, { label: 'Secondaire', number: '' }] }))} className="text-[10px] font-bold text-primary flex items-center gap-1"><Plus size={12} /> Ajouter</button>
                      </div>
                      <div className="space-y-2">
                        {form.phones.map((ph, i) => (
                          <div key={i} className="grid grid-cols-[1fr_2fr_auto] gap-2 items-center">
                            <input type="text" value={ph.label} onChange={e => setForm(f => { const phones = [...f.phones]; phones[i] = { ...phones[i], label: e.target.value }; return { ...f, phones }; })} className="bg-background border border-border rounded-[7px] px-2 py-2 text-xs outline-none" placeholder="Libellé" />
                            <input type="text" value={ph.number} onChange={e => setForm(f => { const phones = [...f.phones]; phones[i] = { ...phones[i], number: e.target.value }; return { ...f, phones, tel: i === 0 ? e.target.value : f.tel }; })} className="bg-background border border-border rounded-[7px] px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30" placeholder="+261..." />
                            {form.phones.length > 1 && (
                              <button type="button" onClick={() => setRemovePhoneIndex(i)} className="p-2 rounded-lg hover:bg-red-500/10 text-red-500" title="Supprimer"><Trash2 size={14} /></button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="orion-text-label mb-1 block">WhatsApp</label>
                      <input type="text" value={form.whatsapp} onChange={e => setForm(f => ({ ...f, whatsapp: e.target.value }))} className="w-full bg-background border border-border rounded-[7px] px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30" placeholder="+261..." />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="orion-text-label">Adresses & axes de livraison</label>
                        <button type="button" onClick={() => setForm(f => ({ ...f, addresses: [...f.addresses, { label: 'Secondaire', axe: '', axeDetail: '', repere: '' }] }))} className="text-[10px] font-bold text-primary flex items-center gap-1"><Plus size={12} /> Ajouter</button>
                      </div>
                      <div className="space-y-3">
                        {form.addresses.map((addr, i) => (
                          <div key={i} className="border border-border rounded-[7px] p-3 bg-accent/20 space-y-2">
                            <div className="flex gap-2">
                              <input type="text" value={addr.label} onChange={e => setForm(f => { const addresses = [...f.addresses]; addresses[i] = { ...addresses[i], label: e.target.value }; return { ...f, addresses }; })} className="flex-1 bg-background border border-border rounded-lg px-2 py-1.5 text-xs outline-none" placeholder="Libellé" />
                              {form.addresses.length > 1 && (
                                <button type="button" onClick={() => setRemoveAddressIndex(i)} className="p-1.5 rounded-lg hover:bg-red-500/10 text-red-500" title="Supprimer l'adresse"><Trash2 size={14} /></button>
                              )}
                            </div>
                            <select
                              value={!addr.axe ? '' : LIVRAISON_AXES.includes(addr.axe as typeof LIVRAISON_AXES[number]) ? addr.axe : 'Autre'}
                              onChange={e => setForm(f => {
                                const addresses = [...f.addresses];
                                addresses[i] = { ...addresses[i], axe: e.target.value, axeDetail: e.target.value === 'Autre' ? (addresses[i].axeDetail ?? '') : '' };
                                return { ...f, addresses };
                              })}
                              className="w-full bg-background border border-border rounded-lg px-2 py-1.5 text-xs outline-none"
                            >
                              <option value="">— Sélectionner un axe —</option>
                              {LIVRAISON_AXES.map(a => <option key={a} value={a}>{a}</option>)}
                            </select>
                            {addr.axe === 'Autre' && (
                              <input
                                type="text"
                                value={addr.axeDetail ?? ''}
                                onChange={e => setForm(f => { const addresses = [...f.addresses]; addresses[i] = { ...addresses[i], axeDetail: e.target.value }; return { ...f, addresses }; })}
                                className="w-full bg-background border border-border rounded-lg px-2 py-1.5 text-xs outline-none"
                                placeholder="Précisez l'axe *"
                              />
                            )}
                            <textarea value={addr.repere} onChange={e => setForm(f => { const addresses = [...f.addresses]; addresses[i] = { ...addresses[i], repere: e.target.value }; return { ...f, addresses }; })} rows={2} className="w-full bg-background border border-border rounded-lg px-2 py-1.5 text-xs outline-none resize-none" placeholder="Repère, quartier, ville..." />
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}

                {formTab === 'criteres' && (
                  <>
                    {([
                      { key: 'recommandations' as const, title: 'Recommandations spécifiques', icon: Target, placeholder: 'Ex: Toujours proposer pelliculage brillant, préfère format A5, éviter tons pastels...' },
                      { key: 'charteCouleurs' as const, title: 'Charte graphique & couleurs', icon: Palette, placeholder: 'Ex: Couleurs officielles #DC2626 et #1E293B, police Helvetica Neue...' },
                      { key: 'livraisonPrefs' as const, title: 'Préférences de livraison & délais', icon: Package, placeholder: 'Ex: Livraison avant 10h, toujours emballer séparément, délai max 3 jours...' },
                      { key: 'conditionsCommerciales' as const, title: 'Conditions commerciales', icon: Banknote, placeholder: 'Ex: Remise 10% dès 500 pièces, paiement toujours par virement...' },
                    ]).map((block) => (
                      <div key={block.key}>
                        <div className="flex items-center gap-2 mb-1.5">
                          <block.icon size={14} className="text-primary" />
                          <label className="orion-text-label text-primary">{block.title}</label>
                        </div>
                        <textarea
                          value={form[block.key]}
                          onChange={e => setForm(f => ({ ...f, [block.key]: e.target.value }))}
                          rows={3}
                          className="w-full bg-background border border-border rounded-[7px] px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                          placeholder={block.placeholder}
                        />
                      </div>
                    ))}
                  </>
                )}

                {formTab === 'fichiers' && (
                  <>
                    <div className="rounded-lg border border-border bg-accent/30 px-4 py-3 text-xs text-muted-foreground">
                      Upload fichiers (logo, BAT, sources) — stockés en base, téléchargeables depuis la fiche client.
                    </div>
                    <label
                      className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-border rounded-lg p-8 cursor-pointer hover:border-primary/40 hover:bg-accent/30 transition-colors"
                      onDragOver={e => e.preventDefault()}
                      onDrop={e => { e.preventDefault(); handleFilePick(e.dataTransfer.files); }}
                    >
                      <Paperclip size={24} className="text-muted-foreground" />
                      <span className="text-sm font-medium">Glissez ou cliquez pour ajouter un fichier</span>
                      <span className="text-[11px] text-muted-foreground text-center">PDF, images, sources — max 2 Mo</span>
                      <input type="file" multiple className="hidden" onChange={e => handleFilePick(e.target.files)} />
                    </label>
                    {form.files.length === 0 ? (
                      <p className="text-xs text-muted-foreground text-center py-4">Aucun fichier ajouté</p>
                    ) : (
                      <ul className="space-y-2">
                        {form.files.map((file, i) => (
                          <li key={file.id ?? `${file.name}-${i}`} className="flex items-center justify-between bg-accent/40 rounded-lg px-3 py-2 text-xs gap-2">
                            <div className="flex items-center gap-2 min-w-0">
                              {file.id && file.type?.startsWith('image/') && (
                                /* eslint-disable-next-line @next/next/no-img-element */
                                <img src={`/api/files/${file.id}`} alt="" className="w-8 h-8 rounded object-cover" />
                              )}
                              <span className="truncate font-medium">{file.name}</span>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              <span className="text-muted-foreground">{(file.size / 1024).toFixed(1)} Ko</span>
                              {file.id && (
                                <>
                                  <a href={clientFileUrl(file.id, true)} download={file.name} className="text-[#10B981] hover:underline flex items-center gap-0.5">
                                    <Download size={10} /> Télécharger
                                  </a>
                                  <a href={clientFileUrl(file.id)} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:underline flex items-center gap-0.5">
                                    <Eye size={10} /> Aperçu
                                  </a>
                                </>
                              )}
                              <button type="button" onClick={() => setForm(f => ({ ...f, files: f.files.filter((_, j) => j !== i) }))} className="text-primary hover:underline">Retirer</button>
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </>
                )}
              </div>

              <div className="flex flex-col gap-2 p-5 pt-0 border-t border-border mt-auto">
                <div className="flex gap-3">
                  <AppButton type="button" variant="outline" onClick={() => setShowForm(false)} className="flex-1">Annuler</AppButton>
                  <AppButton type="button" onClick={() => handleSubmit()} className="flex-1">
                    <Check size={16} /> {editingClient ? 'Enregistrer' : 'Créer le client'}
                  </AppButton>
                </div>
                {!editingClient ? (
                  <AppButton type="button" variant="outline" onClick={() => handleSubmit({ continueToPos: true })}>
                    <Package size={16} /> Créer et catalogue vente
                  </AppButton>
                ) : null}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      <Dialog open={!!duplicateWarning} onOpenChange={(o) => !o && setDuplicateWarning(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Doublon client détecté</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Un client similaire existe déjà. Souhaitez-vous créer un nouveau client, utiliser l&apos;existant ou annuler ?
          </p>
          {duplicateWarning && (
            <ul className="text-sm space-y-2 max-h-32 overflow-y-auto">
              {duplicateWarning.duplicates.map((d) => (
                <li key={d.id} className="rounded-lg border border-border p-2">
                  <span className="font-semibold">{d.name}</span>
                  <span className="text-muted-foreground text-xs ml-1">({d.code})</span>
                  {d.reasons?.length ? (
                    <p className="text-[10px] text-muted-foreground mt-0.5">{d.reasons.join(' · ')}</p>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setDuplicateWarning(null)}>Annuler</Button>
            {canMergeClients && duplicateWarning && duplicateWarning.duplicates.length >= 1 && (
              <Button
                variant="secondary"
                onClick={() => {
                  const target = duplicateWarning.duplicates[0];
                  setMergeDialog({
                    target: { id: target.id, code: target.code, name: target.name },
                    sources: duplicateWarning.duplicates,
                  });
                  setDuplicateWarning(null);
                }}
              >
                Fusion admin
              </Button>
            )}
            <Button
              variant="secondary"
              onClick={() => {
                const id = duplicateWarning?.duplicates[0]?.id;
                setDuplicateWarning(null);
                setShowForm(false);
                if (id) router.push(`/clients/${id}`);
              }}
            >
              Utiliser client existant
            </Button>
            <Button onClick={() => {
              setDuplicateWarning(null);
              handleSubmit({ forceDuplicate: true });
            }}>
              Créer quand même
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <ClientMergeDialog
        open={!!mergeDialog}
        onClose={() => setMergeDialog(null)}
        target={mergeDialog?.target ?? null}
        sources={mergeDialog?.sources ?? []}
        onMerged={(targetId) => {
          setMergeDialog(null);
          fetchClients();
          refreshCrmSummary();
          router.push(`/clients/${targetId}`);
        }}
      />
      <OrionConfirmDialog
        open={!!archiveTarget}
        onOpenChange={(o) => !o && setArchiveTarget(null)}
        title="Mettre à la corbeille"
        description="Ce client sera retiré de la liste active. Vous pourrez le restaurer depuis la corbeille."
        confirmLabel="Mettre à la corbeille"
        variant="destructive"
        onConfirm={doArchive}
      />
      <OrionConfirmDialog
        open={removePhoneIndex !== null}
        onOpenChange={(o) => !o && setRemovePhoneIndex(null)}
        title="Supprimer ce numéro"
        description="Confirmer la suppression de ce contact téléphonique ?"
        confirmLabel="Supprimer"
        variant="destructive"
        onConfirm={() => {
          if (removePhoneIndex === null) return;
          setForm((f) => ({ ...f, phones: f.phones.filter((_, j) => j !== removePhoneIndex) }));
          setRemovePhoneIndex(null);
        }}
      />
      <OrionConfirmDialog
        open={removeAddressIndex !== null}
        onOpenChange={(o) => !o && setRemoveAddressIndex(null)}
        title="Supprimer cette adresse"
        description="Confirmer la suppression de cette adresse ?"
        confirmLabel="Supprimer"
        variant="destructive"
        onConfirm={() => {
          if (removeAddressIndex === null) return;
          setForm((f) => ({ ...f, addresses: f.addresses.filter((_, j) => j !== removeAddressIndex) }));
          setRemoveAddressIndex(null);
        }}
      />
      <OrionConfirmDialog
        open={!!restoreTarget}
        onOpenChange={(o) => !o && setRestoreTarget(null)}
        title="Restaurer le client"
        description="Remettre ce client dans la liste active ?"
        confirmLabel="Restaurer"
        onConfirm={doRestore}
      />
    </>
  );
}
