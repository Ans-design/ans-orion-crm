'use client';

/**
 * Formules & moteurs — refonte UI maquette ANS (3 vues + formule + résumé).
 * Constructeur & paliers : édition inline sur le parcours 10→110 (panneau avancé conservé).
 */

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  Fragment,
  type FormEvent,
} from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Search, ExternalLink, RefreshCw } from 'lucide-react';
import { LoadingState } from '@/components/ui/loading-state';
import { ErrorState } from '@/components/ui/error-state';
import { getApiErrorMessage } from '@/lib/api-client';
import { cn } from '@/lib/utils';
import { uxToast } from '@/lib/ux/feedback';
import { emitOrionLiveMany } from '@/lib/live/orion-live';
import {
  calculationLabelFr,
  displayProfileLabel,
  filterFormulaProfiles,
  resolveProfileListState,
  uniqueFamilies,
  type FormulaProfileLike,
  type FormulaProfileStatusFilter,
} from '@/lib/pricing/formula-display';
import {
  FM_FLOW_STEPS,
  FM_PARAMETERS,
  FM_RULES,
  FORMULE_FINALE_HT,
  FORMULES_MOTEURS_STORAGE_KEY,
  FM_ENGINE_FAMILY_ALIASES,
  coverageForFmEngine,
  fmEngineAliases,
  fmParamSections,
  fmProfileLabel,
  matchFmEngineByFamily,
  mergeStoredEngines,
  type FmEngine,
  type FmEngineCoverage,
  type FmEngineProfile,
  type FmParamStatus,
  type FmRuleSeverity,
} from '@/lib/pricing/formules-moteurs-catalog';
import {
  FM_FORMAT_KEY_TO_CODE,
  FM_PARAM_TO_VARIABLE,
  FM_STANDARD_RULES_FAMILY,
  buildLiveParamOverrides,
  buildTruthParameters,
  consolidateBusinessRules,
  mergeLiveRules,
  stripCalcOverrides,
  type FmLiveSyncPayload,
} from '@/lib/pricing/formules-moteurs-live-sync';
import type { PricingFamilyCoverage, PricingOverviewStats } from '@/lib/pricing/pricing-types';
import { FormulaEditorCore } from '@/components/admin/formula-workspace/FormulaEditorCore';
import {
  ArticleTierTable,
  tiersToDraft,
  type TierDraftRow,
} from '@/components/backoffice-v2/pricing-tiers/ArticleTierTable';
import { simulateTierLines } from '@/lib/server/modules/pricing/price-tier-simulator.service';
import type {
  ArticleTiersPayload,
  TierMode,
  TierTableRow,
} from '@/lib/server/modules/backoffice-v2/admin-backoffice-tiers.types';
import { posFamilyAccent } from '@/lib/pos/pos-family-accents';
import {
  isPosCatalogueParentCard,
  POS_PARENT_IDS,
} from '@/lib/pos/article-2026-canonical-map';
import { POS_CATALOGUE } from '@/lib/data/catalogue-meta';
import './formules-moteurs.css';
import '@/components/admin/formula-workspace/formula-workspace.css';

type FmView = 'engines' | 'parameters' | 'rules';

type ProfileRow = FormulaProfileLike & {
  articleId: string;
  articleLabel: string;
  family: string | null;
  calculationType: string | null;
  status: string;
  updatedAt?: string;
  prixBase?: number | null;
  qtyMin?: number | null;
  saleUnit?: string | null;
  discountTiers?: Array<{
    unitPrice?: number | null;
    discountPercent?: number | null;
    active?: boolean;
  }>;
  formulaVersions?: { version: number; status: string }[];
  _count?: {
    formulaVersions?: number;
    optionGroups?: number;
    materialPrices?: number;
    stockRules?: number;
  };
};

type ProfileDetail = {
  articleId: string;
  articleLabel?: string;
  family?: string | null;
  calculationType: string | null;
  status: string;
  updatedAt?: string;
  formulaVersions?: Array<{
    version: number;
    status: string;
    expression?: string | null;
    variables?: unknown;
    label?: string | null;
  }>;
};

type StoredPayload = {
  version?: string;
  engines?: FmEngine[];
  overrides?: Record<string, string>;
  updatedAt?: string;
};

type EngineFormState = {
  id: string;
  name: string;
  unit: string;
  base: string;
  construction: string;
  margin: number;
  minimum: number;
  round: number;
  profile: FmEngineProfile;
  active: boolean;
  itemsText: string;
  color: string;
};

type Props = {
  canEdit: boolean;
};

const TIERS_API = '/api/admin-backoffice/tiers/articles';

const VIEW_META: Record<FmView, { title: string; subtitle: string }> = {
  engines: {
    title: 'Articles commerciaux',
    subtitle:
      'Les ~95 cartes POS (Flyer, CV, T-shirt…) — formules, paliers et moteur de famille. Pas les variantes ART-xxx.',
  },
  parameters: {
    title: 'Paramètres de calcul',
    subtitle:
      'Valeurs transverses synchronisées (formats, faces, variables, marges…) — applicables à tous les articles POS.',
  },
  rules: {
    title: 'Règles métier',
    subtitle:
      'Compatibilités, blocages et alertes lus depuis la base — filtrables par famille d’article.',
  },
};

const PARAM_GROUP_OPTIONS = [
  { value: 'all', label: 'Toutes les sections' },
  { value: 'source', label: 'Priorité des prix' },
  { value: 'sequence', label: 'Construction du prix' },
  { value: 'rectoverso', label: 'Recto-verso' },
  { value: 'format', label: 'Formats' },
  { value: 'variable', label: 'Variables' },
  { value: 'control', label: 'Contrôles' },
] as const;

const STATUS_LABEL: Record<FmParamStatus, string> = {
  ok: 'Actif',
  info: 'Référence',
  warn: 'À contrôler',
  block: 'Bloquant',
  violet: 'Palier',
};

const SEVERITY_LABEL: Record<FmRuleSeverity, string> = {
  block: 'Bloquante',
  warn: 'Alerte',
  info: 'Information',
};

function money(value: number): string {
  return `${Number(value || 0).toLocaleString('fr-FR')} Ar`;
}

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

/** Filtre global familles — « Tous » ne doit jamais matcher le texte des règles. */
function isAllFamiliesFilter(value: string | null | undefined): boolean {
  const v = String(value ?? '').trim().toLowerCase();
  if (!v) return true;
  return (
    v === '__all__'
    || v === '*'
    || v === 'all'
    || v === 'tous'
    || v === 'toutes'
    || v === 'toutes les familles'
    || v.startsWith('toutes les familles')
  );
}

function slugifyEngineId(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function loadStored(): StoredPayload | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(FORMULES_MOTEURS_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as StoredPayload;
  } catch {
    return null;
  }
}

function emptyForm(): EngineFormState {
  return {
    id: '',
    name: '',
    unit: 'Pièce',
    base: '',
    construction: '',
    margin: 25,
    minimum: 1000,
    round: 50,
    profile: 'universal',
    active: true,
    itemsText: '',
    color: '#cc0033',
  };
}

function engineToForm(engine: FmEngine): EngineFormState {
  return {
    id: engine.id,
    name: engine.name,
    unit: engine.unit,
    base: engine.base,
    construction: engine.construction,
    margin: engine.margin,
    minimum: engine.minimum,
    round: engine.round,
    profile: engine.profile,
    active: engine.active,
    itemsText: engine.items.join(', '),
    color: engine.color,
  };
}

export function FormulesMoteursWorkspace({ canEdit }: Props) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const articleFromUrl = searchParams.get('article');
  const fmFromUrl = (searchParams.get('fm') || searchParams.get('view') || '').toLowerCase();

  const initialView = ((): FmView => {
    if (fmFromUrl === 'rules' || fmFromUrl === 'regles' || fmFromUrl === 'regles-metier') return 'rules';
    if (fmFromUrl === 'parameters' || fmFromUrl === 'params' || fmFromUrl === 'parametres') return 'parameters';
    return 'engines';
  })();

  const [view, setView] = useState<FmView>(initialView);
  const [engines, setEngines] = useState<FmEngine[]>(() => mergeStoredEngines());
  const [overrides, setOverrides] = useState<Record<string, string>>({});
  const [families, setFamilies] = useState<PricingFamilyCoverage[]>([]);
  const [overviewStats, setOverviewStats] = useState<PricingOverviewStats | null>(null);
  const [syncLoaded, setSyncLoaded] = useState(false);
  const [liveSync, setLiveSync] = useState<FmLiveSyncPayload | null>(null);
  const [liveOverrides, setLiveOverrides] = useState<Record<string, string>>({});
  const [focusEngineId, setFocusEngineId] = useState<string | null>(null);

  const [engineQuery, setEngineQuery] = useState('');
  const [engineStatus, setEngineStatus] = useState<'all' | 'active' | 'inactive'>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  /** Étape du parcours 10→110 sélectionnée dans le détail ouvert. */
  const [activeFlowStep, setActiveFlowStep] = useState<string | null>(null);
  /** Vue principale = articles commerciaux (~95) ; moteurs familles conservés en sous-vue. */
  const [listMode, setListMode] = useState<'articles' | 'engines'>('articles');
  const [articleStatusFilter, setArticleStatusFilter] =
    useState<FormulaProfileStatusFilter>('all');
  const [articleFamilyFilter, setArticleFamilyFilter] = useState<string | 'all'>('all');
  const [articleEngineFilter, setArticleEngineFilter] = useState<string | 'all'>('all');

  const [paramQuery, setParamQuery] = useState('');
  const [paramGroup, setParamGroup] = useState<string>('all');

  const [ruleQuery, setRuleQuery] = useState('');
  const [ruleType, setRuleType] = useState<'all' | FmRuleSeverity>('all');
  /** Famille sélectionnée — `__all__` = toutes les règles synchronisées. */
  const [ruleFamilyFilter, setRuleFamilyFilter] = useState<string>('__all__');
  /** Afficher uniquement les règles liées à la DB (vrai). */
  const [rulesTruthOnly, setRulesTruthOnly] = useState(true);
  /** Afficher uniquement les paramètres synchronisés DB. */
  const [paramsTruthOnly, setParamsTruthOnly] = useState(true);

  useEffect(() => {
    // Si une ancienne valeur « Tous » était en mémoire / URL, basculer sur le vrai filtre global.
    if (ruleFamilyFilter !== '__all__' && isAllFamiliesFilter(ruleFamilyFilter)) {
      setRuleFamilyFilter('__all__');
    }
  }, [ruleFamilyFilter]);

  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<EngineFormState>(emptyForm);

  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [profilesLoading, setProfilesLoading] = useState(false);
  const [profilesError, setProfilesError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(articleFromUrl);
  const [detail, setDetail] = useState<ProfileDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const [draftRows, setDraftRows] = useState<TierDraftRow[]>([]);
  const [tierMode, setTierMode] = useState<TierMode>('percent');
  const [saleUnit, setSaleUnit] = useState('pièce');
  const [prixBase, setPrixBase] = useState<number | null>(null);
  const [prixBaseSource, setPrixBaseSource] = useState<string | null>(null);
  const [tiersLoading, setTiersLoading] = useState(false);
  const [tiersSaving, setTiersSaving] = useState(false);
  const [articleTiers, setArticleTiers] = useState<ArticleTiersPayload | null>(null);
  const [selectedVariantKey, setSelectedVariantKey] = useState('');
  /** Anti-clignotement : soft-refresh si déjà chargé pour le même article. */
  const tiersLoadedForRef = useRef<string | null>(null);
  const tiersFetchSeqRef = useRef(0);

  useEffect(() => {
    try {
      const saved = loadStored();
      setEngines(mergeStoredEngines(saved?.engines));
      if (saved?.overrides) {
        setOverrides(stripCalcOverrides(saved.overrides));
      }
    } catch {
      setEngines(mergeStoredEngines());
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const errors: string[] = [];
      try {
        const r = await fetch('/api/pricing/overview', { cache: 'no-store' });
        const d = await r.json();
        if (!r.ok) throw new Error(getApiErrorMessage(d, 'Sync overview impossible'));
        if (cancelled) return;
        if (Array.isArray(d.families)) setFamilies(d.families);
        if (d.stats) setOverviewStats(d.stats as PricingOverviewStats);
      } catch (e) {
        errors.push(e instanceof Error ? e.message : 'Overview indisponible');
      }

      try {
        const r = await fetch('/api/pricing/formules-moteurs-sync', { cache: 'no-store' });
        const d = (await r.json()) as FmLiveSyncPayload;
        if (!r.ok) throw new Error('Sync paramètres / règles impossible');
        if (cancelled) return;
        setLiveSync(d);
        setLiveOverrides(buildLiveParamOverrides(d));
        // Purge overrides locaux qui contrediraient la DB
        setOverrides((prev) => stripCalcOverrides(prev));
        if (d.errors?.length) errors.push(...d.errors);
      } catch (e) {
        errors.push(e instanceof Error ? e.message : 'Sync Formules indisponible');
      }

      if (!cancelled) {
        setSyncLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (fmFromUrl === 'rules' || fmFromUrl === 'regles' || fmFromUrl === 'regles-metier') {
      setView('rules');
    } else if (fmFromUrl === 'parameters' || fmFromUrl === 'params' || fmFromUrl === 'parametres') {
      setView('parameters');
    } else if (fmFromUrl === 'engines' || fmFromUrl === 'articles') {
      setView('engines');
    }
  }, [fmFromUrl]);

  const setFmView = useCallback(
    (next: FmView) => {
      setView(next);
      const params = new URLSearchParams(searchParams.toString());
      if (!params.get('studio')) params.set('studio', 'calculs');
      if (!params.get('tab') || params.get('tab') === 'engines') {
        params.set('tab', next === 'rules' ? 'regles' : 'engines');
      }
      params.set('fm', next);
      router.replace(`?${params.toString()}`, { scroll: false });
    },
    [router, searchParams],
  );

  useEffect(() => {
    if (articleFromUrl) {
      setSelectedId(articleFromUrl);
      setAdvancedOpen(true);
    }
  }, [articleFromUrl]);

  useEffect(() => {
    if (!advancedOpen || !selectedId || focusEngineId) return;
    const profile = profiles.find((p) => p.articleId === selectedId);
    const matched = matchFmEngineByFamily(profile?.family, engines);
    if (matched) setFocusEngineId(matched.id);
  }, [advancedOpen, selectedId, focusEngineId, profiles, engines]);

  useEffect(() => {
    if (!advancedOpen || !focusEngineId || !profiles.length) return;
    const engine = engines.find((e) => e.id === focusEngineId);
    if (!engine) return;
    const aliases = fmEngineAliases(engine);
    const selectedOk = profiles.some((p) => {
      if (p.articleId !== selectedId) return false;
      const name = (p.family ?? '').toLowerCase();
      return aliases.some((alias) => name.includes(alias) || alias.includes(name));
    });
    if (selectedOk) return;
    const match = profiles.find((p) => {
      const name = (p.family ?? '').toLowerCase();
      return aliases.some((alias) => name.includes(alias) || alias.includes(name));
    });
    if (match) setSelectedId(match.articleId);
  }, [advancedOpen, focusEngineId, profiles, engines, selectedId]);

  useEffect(() => {
    if (!modalOpen && !advancedOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (advancedOpen) setAdvancedOpen(false);
      else if (modalOpen) setModalOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [modalOpen, advancedOpen]);

  const loadProfiles = useCallback(async () => {
    setProfilesLoading(true);
    setProfilesError(null);
    try {
      const r = await fetch('/api/dynamic-pricing', { cache: 'no-store' });
      const d = await r.json();
      if (!r.ok) throw new Error(getApiErrorMessage(d, 'Chargement impossible'));
      const list = (d.profiles ?? []) as ProfileRow[];
      setProfiles(list);
      setSelectedId((prev) => {
        const parents = list.filter((p) =>
          isPosCatalogueParentCard({
            id: p.articleId,
            reference: p.articleId,
            excelId: p.articleId,
            name: p.articleLabel,
            status: p.status,
          }),
        );
        if (articleFromUrl) {
          if (parents.some((p) => p.articleId === articleFromUrl)) return articleFromUrl;
          if (list.some((p) => p.articleId === articleFromUrl)) return articleFromUrl;
        }
        if (prev && parents.some((p) => p.articleId === prev)) return prev;
        return parents[0]?.articleId ?? prev ?? list[0]?.articleId ?? null;
      });
    } catch (e) {
      setProfilesError(e instanceof Error ? e.message : 'Erreur');
      setProfiles([]);
    } finally {
      setProfilesLoading(false);
    }
  }, [articleFromUrl]);

  const loadDetail = useCallback(async (articleId: string) => {
    setDetailLoading(true);
    try {
      const r = await fetch(`/api/dynamic-pricing/${articleId}`, { cache: 'no-store' });
      const d = await r.json();
      if (!r.ok) throw new Error(getApiErrorMessage(d, 'Profil introuvable'));
      setDetail(d.profile as ProfileDetail);
    } catch {
      setDetail(null);
    } finally {
      setDetailLoading(false);
    }
  }, []);

  const applyTiersDraft = useCallback((data: ArticleTiersPayload, variantKey: string) => {
    const filtered = (data.tiers ?? []).filter((t) => (t.variantKey ?? '') === variantKey);
    // Conserver remise % + PU format (PRIX 2026) tels quels — ne pas recalculer
    // contre prixBase article (souvent A0/m² ≠ list format A4).
    setDraftRows(tiersToDraft(filtered));
    const v = data.variants?.find((x) => x.variantKey === variantKey);
    if (v?.listPrixBase != null && v.listPrixBase > 0) {
      setPrixBase(v.listPrixBase);
      setPrixBaseSource(`PRIX 2026 · ${v.variantLabel}`);
    }
  }, []);

  const loadTiers = useCallback(async (articleId: string) => {
    // Déjà chargé pour cet article → ne pas refetch (évite clignotement UI).
    if (tiersLoadedForRef.current === articleId) return;
    const seq = ++tiersFetchSeqRef.current;
    setTiersLoading(true);
    try {
      const r = await fetch(`${TIERS_API}/${articleId}`, { cache: 'no-store' });
      const d = await r.json();
      if (seq !== tiersFetchSeqRef.current) return;
      if (r.ok && d.ok && d.data) {
        const data = d.data as ArticleTiersPayload;
        setArticleTiers(data);
        setTierMode('percent');
        setSaleUnit(data.article.saleUnit || 'pièce');
        const variants = data.variants ?? [];
        const nextKey =
          variants.find((v) => v.variantKey === '180__a4')?.variantKey
          ?? variants.find((v) => v.variantKey === '')?.variantKey
          ?? variants.find((v) => v.variantKey.startsWith('180__'))?.variantKey
          ?? variants[0]?.variantKey
          ?? '';
        const listBase = variants.find((v) => v.variantKey === nextKey)?.listPrixBase;
        setPrixBase(listBase ?? data.article.prixBase ?? null);
        setPrixBaseSource(
          listBase != null
            ? `PRIX 2026 · ${variants.find((v) => v.variantKey === nextKey)?.variantLabel ?? 'variante'}`
            : data.article.prixBaseSource ?? null,
        );
        setSelectedVariantKey(nextKey);
        applyTiersDraft(data, nextKey);
        tiersLoadedForRef.current = articleId;
      } else {
        setArticleTiers(null);
        setDraftRows([]);
        setTierMode('percent');
        setPrixBaseSource(null);
        setSelectedVariantKey('');
        tiersLoadedForRef.current = null;
      }
    } catch {
      if (seq !== tiersFetchSeqRef.current) return;
      setArticleTiers(null);
      setDraftRows([]);
      setTierMode('percent');
      setPrixBaseSource(null);
      setSelectedVariantKey('');
      tiersLoadedForRef.current = null;
    } finally {
      if (seq === tiersFetchSeqRef.current) setTiersLoading(false);
    }
  }, [applyTiersDraft]);

  useEffect(() => {
    void loadProfiles();
  }, [loadProfiles]);

  useEffect(() => {
    if (!advancedOpen || !selectedId) return;
    void loadDetail(selectedId);
    void loadTiers(selectedId);
  }, [advancedOpen, selectedId, loadDetail, loadTiers]);

  useEffect(() => {
    setActiveFlowStep(null);
    tiersLoadedForRef.current = null;
    setDraftRows([]);
    setArticleTiers(null);
    setPrixBase(null);
    setSelectedVariantKey('');
    if (expandedId) {
      setSelectedId(expandedId);
      void loadTiers(expandedId);
      void loadDetail(expandedId);
    }
  }, [expandedId, loadTiers, loadDetail]);

  const selectTierVariant = (variantKey: string) => {
    if (!articleTiers) return;
    setSelectedVariantKey(variantKey);
    applyTiersDraft(articleTiers, variantKey);
  };

  useEffect(() => {
    if (activeFlowStep === '60' || activeFlowStep === '100') setActiveFlowStep(null);
  }, [activeFlowStep]);

  /** Étape 10/80 : s’assurer que paliers/formule sont prêts (no-op si déjà prefetch). */
  useEffect(() => {
    if (view !== 'engines' || listMode !== 'articles' || !expandedId || !activeFlowStep) {
      return;
    }
    if (!['10', '80'].includes(activeFlowStep)) return;
    setSelectedId(expandedId);
    void loadDetail(expandedId);
    void loadTiers(expandedId);
  }, [
    view,
    listMode,
    expandedId,
    activeFlowStep,
    loadDetail,
    loadTiers,
  ]);

  /**
   * Articles commerciaux = cartes parents POS (~95).
   * Exclut ART-xxx / variantes prix — celles-ci restent en DB mais hors liste Formules.
   * Complète les parents catalogue absents d’un profil pour garder la couverture POS.
   */
  const commercialProfiles = useMemo((): ProfileRow[] => {
    const parents = profiles.filter((p) =>
      isPosCatalogueParentCard({
        id: p.articleId,
        reference: p.articleId,
        excelId: p.articleId,
        name: p.articleLabel,
        status: p.status,
      }),
    );
    const have = new Set(parents.map((p) => p.articleId));
    const stubs: ProfileRow[] = [];
    for (const item of POS_CATALOGUE) {
      if (!POS_PARENT_IDS.has(item.id) || have.has(item.id)) continue;
      stubs.push({
        articleId: item.id,
        articleLabel: item.name,
        family: item.category,
        calculationType: null,
        status: 'draft',
        prixBase: item.prixDepart ?? null,
        saleUnit: item.unit ?? 'pièce',
      });
    }
    return [...parents, ...stubs].sort((a, b) =>
      displayProfileLabel(a.articleLabel).localeCompare(
        displayProfileLabel(b.articleLabel),
        'fr',
        { sensitivity: 'base' },
      ),
    );
  }, [profiles]);

  const articleFamilies = useMemo(() => uniqueFamilies(commercialProfiles), [commercialProfiles]);

  const filteredArticles = useMemo(() => {
    const base = filterFormulaProfiles(commercialProfiles, {
      query: engineQuery,
      statusFilter: articleStatusFilter,
      family: articleFamilyFilter === 'all' ? 'all' : articleFamilyFilter,
      includeArchived: articleStatusFilter === 'archived',
    }) as ProfileRow[];

    if (articleEngineFilter === 'all') return base;
    const engine = engines.find((e) => e.id === articleEngineFilter);
    if (!engine) return base;
    const aliases = fmEngineAliases(engine);
    return base.filter((p) => {
      const name = (p.family ?? '').toLowerCase();
      const label = displayProfileLabel(p.articleLabel).toLowerCase();
      return aliases.some(
        (alias) =>
          name.includes(alias) ||
          alias.includes(name) ||
          label.includes(alias),
      );
    });
  }, [
    commercialProfiles,
    engineQuery,
    articleStatusFilter,
    articleFamilyFilter,
    articleEngineFilter,
    engines,
  ]);

  const filteredEngines = useMemo(() => {
    const q = engineQuery.trim().toLowerCase();
    return engines.filter((engine) => {
      const statusMatch =
        engineStatus === 'all' ||
        (engineStatus === 'active' && engine.active) ||
        (engineStatus === 'inactive' && !engine.active);
      if (!statusMatch) return false;
      if (!q) return true;
      const haystack = [engine.name, engine.base, engine.construction, ...engine.items]
        .join(' ')
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [engines, engineQuery, engineStatus]);

  const truthParameters = useMemo(
    () => buildTruthParameters(FM_PARAMETERS, liveSync, overrides),
    [liveSync, overrides],
  );

  const filteredParams = useMemo(() => {
    const q = paramQuery.trim().toLowerCase();
    return truthParameters.filter((param) => {
      // Paliers universel / POS : gérés dans le panneau avancé article — hors table Paramètres.
      if (param.group === 'tier') return false;
      if (paramsTruthOnly) {
        const keepDoc =
          !param.key && (param.group === 'sequence' || param.group === 'source');
        if (!param.truth.isTruth && !keepDoc) return false;
      }
      const groupMatch = paramGroup === 'all' || param.group === paramGroup;
      if (!groupMatch) return false;
      if (!q) return true;
      const hay = [
        param.ref,
        param.name,
        param.value,
        param.rule,
        param.condition,
        param.scope,
        param.section,
        param.truth.liveSource ?? '',
      ]
        .join(' ')
        .toLowerCase();
      return hay.includes(q);
    });
  }, [paramQuery, paramGroup, truthParameters, paramsTruthOnly]);

  const paramSections = useMemo(() => {
    const order = fmParamSections(filteredParams);
    const map = new Map<string, typeof filteredParams>();
    for (const param of filteredParams) {
      if (!map.has(param.section)) map.set(param.section, []);
      map.get(param.section)!.push(param);
    }
    // Sections filtrées absentes de l’ordre catalogue → append.
    for (const section of map.keys()) {
      if (!order.includes(section)) order.push(section);
    }
    return order
      .filter((section) => map.has(section))
      .map((section) => ({
        section,
        params: map.get(section)!,
      }));
  }, [filteredParams]);

  const mergedRules = useMemo(
    () => mergeLiveRules(FM_RULES, liveSync?.businessRules ?? []),
    [liveSync],
  );

  /** Doublons / templates multi-articles fusionnés — source d’affichage onglet 03. */
  const consolidatedRules = useMemo(
    () => consolidateBusinessRules(mergedRules),
    [mergedRules],
  );

  const rawTruthRuleCount = useMemo(
    () => mergedRules.filter((r) => r.isTruth).length,
    [mergedRules],
  );

  const ruleFamilyOptions = useMemo(() => {
    const fromProfiles = uniqueFamilies(commercialProfiles);
    const fromRules = new Set<string>();
    for (const rule of consolidatedRules) {
      const f = rule.family?.trim();
      if (f) fromRules.add(f);
    }
    for (const engine of engines) {
      if (engine.name?.trim()) fromRules.add(engine.name.trim());
    }
    fromRules.add(FM_STANDARD_RULES_FAMILY);
    const merged = new Set<string>([...fromProfiles, ...fromRules]);
    // Évite une fausse famille « Tous / Toutes » qui confond avec le filtre global.
    const sorted = [...merged]
      .filter((f) => !isAllFamiliesFilter(f) && f !== FM_STANDARD_RULES_FAMILY)
      .sort((a, b) => a.localeCompare(b, 'fr', { sensitivity: 'base' }));
    return [FM_STANDARD_RULES_FAMILY, ...sorted];
  }, [commercialProfiles, consolidatedRules, engines]);

  const filteredRules = useMemo(() => {
    const q = ruleQuery.trim().toLowerCase();
    const showAll = isAllFamiliesFilter(ruleFamilyFilter);
    const filterIsStandard =
      ruleFamilyFilter.trim() === FM_STANDARD_RULES_FAMILY
      || /r[eè]gles?\s+standard/i.test(ruleFamilyFilter.trim());

    return consolidatedRules.filter((rule) => {
      if (rulesTruthOnly && !rule.isTruth) return false;
      if (ruleType !== 'all' && rule.severity !== ruleType) return false;

      if (!showAll) {
        const isStandard = rule.scope === 'standard';
        if (filterIsStandard) return isStandard;

        const familyKey = ruleFamilyFilter.trim().toLowerCase();
        const ruleFamily = (rule.family ?? '').trim().toLowerCase();
        // Correspondance sur la famille uniquement (jamais dans le libellé —
        // sinon « Tous » matche « sur tous les produits » → 3 règles au lieu de 400).
        const engine = matchFmEngineByFamily(ruleFamilyFilter, engines);
        const aliases = (engine ? fmEngineAliases(engine) : [])
          .map((a) => a.toLowerCase().trim())
          .filter((a) => a.length >= 3);
        aliases.push(familyKey);

        const familyHit = aliases.some(
          (alias) =>
            ruleFamily === alias
            || ruleFamily.includes(alias)
            || (alias.length >= 4 && alias.includes(ruleFamily) && ruleFamily.length >= 3),
        );
        // Les règles standard s’appliquent aussi à la famille filtrée.
        if (!familyHit && !isStandard) return false;
      }

      if (!q) return true;
      return [rule.code, rule.family, rule.rule, rule.action, rule.severity, rule.source]
        .join(' ')
        .toLowerCase()
        .includes(q);
    });
  }, [ruleFamilyFilter, engines, ruleQuery, ruleType, consolidatedRules, rulesTruthOnly]);

  const ruleSections = useMemo(() => {
    const order: string[] = [];
    const map = new Map<string, typeof filteredRules>();
    for (const rule of filteredRules) {
      const family = rule.family?.trim() || 'Autres';
      if (!map.has(family)) {
        order.push(family);
        map.set(family, []);
      }
      map.get(family)!.push(rule);
    }
    // Zone standard toujours en tête.
    order.sort((a, b) => {
      if (a === FM_STANDARD_RULES_FAMILY) return -1;
      if (b === FM_STANDARD_RULES_FAMILY) return 1;
      return a.localeCompare(b, 'fr', { sensitivity: 'base' });
    });
    return order.map((family) => ({
      family,
      rules: map.get(family)!,
    }));
  }, [filteredRules]);

  const truthParamCount = useMemo(
    () => truthParameters.filter((p) => p.group !== 'tier' && p.truth.isTruth).length,
    [truthParameters],
  );

  /** Contrat compteurs unique — ne jamais mixer dbRaw / fused / visible. */
  const ruleCounts = useMemo(() => {
    const syncFailed = liveSync != null && liveSync.ok === false;
    const dbRaw = syncFailed
      ? 0
      : (liveSync?.counts?.businessRules ?? rawTruthRuleCount);
    const fusedTruth = consolidatedRules.filter((r) => r.isTruth).length;
    const fusedAll = consolidatedRules.length;
    const visible = filteredRules.length;
    return { dbRaw, fusedTruth, fusedAll, visible, syncFailed };
  }, [liveSync, rawTruthRuleCount, consolidatedRules, filteredRules]);

  /**
   * KPI / badge onglet 03 — jamais 00 trompeur :
   * vérité fusionnée → DB brute → catalogue doc.
   */
  const rulesKpi = useMemo(() => {
    if (view === 'rules') {
      return { count: ruleCounts.visible, label: 'affichées' as const };
    }
    if (!rulesTruthOnly) {
      return { count: ruleCounts.fusedAll, label: 'catalogue' as const };
    }
    if (ruleCounts.fusedTruth > 0) {
      return { count: ruleCounts.fusedTruth, label: 'fusionnées' as const };
    }
    if (ruleCounts.dbRaw > 0) {
      return { count: ruleCounts.dbRaw, label: 'synchronisées' as const };
    }
    if (ruleCounts.fusedAll > 0) {
      return { count: ruleCounts.fusedAll, label: 'catalogue' as const };
    }
    return { count: 0, label: 'synchronisées' as const };
  }, [view, ruleCounts, rulesTruthOnly]);

  const rulesBadgeCount = rulesKpi.count;

  const selectedProfile =
    commercialProfiles.find((p) => p.articleId === selectedId)
    ?? profiles.find((p) => p.articleId === selectedId);
  const family = selectedProfile?.family ?? detail?.family ?? null;

  const engineCoverageMap = useMemo(() => {
    const map = new Map<string, FmEngineCoverage>();
    for (const engine of engines) {
      map.set(engine.id, coverageForFmEngine(engine, families));
    }
    return map;
  }, [engines, families]);

  const syncTotals = useMemo(() => {
    let linked = 0;
    let published = 0;
    let coveredEngines = 0;
    for (const engine of engines) {
      const cov = engineCoverageMap.get(engine.id);
      if (!cov) continue;
      linked += cov.profiles;
      published += cov.published;
      if (cov.profiles > 0) coveredEngines += 1;
    }
    return { linked, published, coveredEngines };
  }, [engines, engineCoverageMap]);

  const filteredAdvancedProfiles = useMemo(() => {
    if (!focusEngineId) return commercialProfiles;
    const engine = engines.find((e) => e.id === focusEngineId);
    if (!engine) return commercialProfiles;
    const aliases = fmEngineAliases(engine);
    const matched = commercialProfiles.filter((p) => {
      const name = (p.family ?? '').toLowerCase();
      if (!name) return false;
      return aliases.some((alias) => name.includes(alias) || alias.includes(name));
    });
    return matched.length ? matched : commercialProfiles;
  }, [commercialProfiles, focusEngineId, engines]);

  const simulations = useMemo(() => {
    if (!draftRows.length) return [];
    const mode: TierMode = 'percent';
    const rows: TierTableRow[] = draftRows.map((r, i) => ({
      id: r.id ?? `draft-${i}`,
      articleId: selectedId ?? '',
      variantKey: '',
      variantLabel: null,
      minQty: r.minQty,
      maxQty: r.maxQty,
      value: r.unitPrice,
      unitPrice: r.unitPrice,
      discountPercent: r.discountPercent,
      mode,
      active: r.active,
      source: null,
      sortOrder: i,
    }));
    return simulateTierLines(
      rows,
      mode,
      prixBase,
      saleUnit,
      articleTiers?.article.qtyMin ?? 1,
    );
  }, [draftRows, prixBase, saleUnit, selectedId, articleTiers]);

  const persist = useCallback(
    (nextEngines: FmEngine[], nextOverrides: Record<string, string>) => {
      localStorage.setItem(
        FORMULES_MOTEURS_STORAGE_KEY,
        JSON.stringify({
          version: 'ANS v3',
          engines: nextEngines,
          // Ne jamais persister les overrides calcul (source = DB).
          overrides: stripCalcOverrides(nextOverrides),
          updatedAt: new Date().toISOString(),
        }),
      );
    },
    [],
  );

  const handleSave = async () => {
    if (!canEdit) {
      uxToast.error('Droits insuffisants');
      return;
    }
    persist(engines, overrides);

    const writeErrors: string[] = [];
    for (const [key, value] of Object.entries(overrides)) {
      const varCode = FM_PARAM_TO_VARIABLE[key];
      if (varCode) {
        try {
          const r = await fetch('/api/admin-backoffice/pricing/pricing-variables', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code: varCode, value }),
          });
          const d = await r.json();
          if (!r.ok || d.ok === false) {
            writeErrors.push(d.error?.message ?? `Variable ${varCode}`);
          }
        } catch {
          writeErrors.push(`Variable ${varCode}`);
        }
      }
      const formatCode = FM_FORMAT_KEY_TO_CODE[key];
      if (formatCode) {
        try {
          const ratio = Number(String(value).replace(',', '.'));
          if (!Number.isFinite(ratio)) continue;
          const existing = liveSync?.paperFormats.find(
            (f) => f.formatCode.toUpperCase() === formatCode.toUpperCase(),
          );
          const r = await fetch('/api/admin-backoffice/pricing/paper-formats', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              ...(existing?.id ? { id: existing.id } : {}),
              formatCode,
              ratioA4: ratio,
              widthMm: existing?.widthMm ?? 210,
              heightMm: existing?.heightMm ?? 297,
              active: true,
            }),
          });
          const d = await r.json();
          if (!r.ok || d.ok === false) {
            writeErrors.push(d.error?.message ?? `Format ${formatCode}`);
          }
        } catch {
          writeErrors.push(`Format ${formatCode}`);
        }
      }
    }

    try {
      const r = await fetch('/api/pricing/formules-moteurs-sync', { cache: 'no-store' });
      const d = (await r.json()) as FmLiveSyncPayload;
      if (r.ok) {
        setLiveSync(d);
        setLiveOverrides(buildLiveParamOverrides(d));
      }
    } catch {
      /* ignore refresh errors */
    }

    if (writeErrors.length) {
      uxToast.error(`Enregistré localement — sync DB partielle : ${writeErrors[0]}`);
    } else {
      setOverrides((prev) => stripCalcOverrides(prev));
      uxToast.success('Configuration synchronisée sur la base de vérité');
    }
  };

  const handleCopyFormula = async () => {
    try {
      await navigator.clipboard.writeText(FORMULE_FINALE_HT);
      uxToast.success('Formule copiée');
    } catch {
      uxToast.error('Copie indisponible');
    }
  };

  const openAdvanced = (opts?: {
    preferArticleId?: string | null;
    engineId?: string | null;
  }) => {
    const engineId = opts?.engineId ?? focusEngineId;
    setFocusEngineId(engineId ?? null);
    if (opts?.preferArticleId) {
      setSelectedId(opts.preferArticleId);
    } else if (engineId) {
      const engine = engines.find((e) => e.id === engineId);
      if (engine) {
        const aliases = fmEngineAliases(engine);
        const match = profiles.find((p) => {
          const name = (p.family ?? '').toLowerCase();
          return aliases.some((alias) => name.includes(alias) || alias.includes(name));
        });
        if (match) setSelectedId(match.articleId);
      }
    }
    setAdvancedOpen(true);
    setModalOpen(false);
  };

  const openModal = (engine?: FmEngine) => {
    setForm(engine ? engineToForm(engine) : emptyForm());
    if (engine) setFocusEngineId(engine.id);
    setModalOpen(true);
  };

  const closeModal = () => setModalOpen(false);

  const applyModal = (e: FormEvent) => {
    e.preventDefault();
    if (!canEdit) {
      uxToast.error('Droits insuffisants');
      return;
    }
    const oldId = form.id;
    const id = oldId || slugifyEngineId(form.name);
    if (!id || !form.name.trim()) {
      uxToast.error('Nom de famille requis');
      return;
    }
    const items = form.itemsText
      .split(',')
      .map((v) => v.trim())
      .filter(Boolean);
    const data: FmEngine = {
      id,
      name: form.name.trim(),
      unit: form.unit,
      base: form.base.trim(),
      construction: form.construction.trim(),
      margin: Number(form.margin) || 0,
      minimum: Number(form.minimum) || 0,
      round: Number(form.round) || 1,
      profile: form.profile,
      profileLabel: fmProfileLabel(form.profile),
      active: form.active,
      color: form.color || '#cc0033',
      items,
      familyAliases: FM_ENGINE_FAMILY_ALIASES[id],
    };
    setEngines((prev) => {
      const idx = prev.findIndex((x) => x.id === oldId);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = data;
        return next;
      }
      return [...prev, data];
    });
    closeModal();
    uxToast.success(oldId ? 'Moteur mis à jour' : 'Moteur ajouté');
  };

  const toggleEngineActive = (id: string) => {
    if (!canEdit) return;
    setEngines((prev) => {
      const target = prev.find((engine) => engine.id === id);
      if (!target) return prev;
      const nextActive = !target.active;
      const next = prev.map((engine) =>
        engine.id === id ? { ...engine, active: nextActive } : engine,
      );
      persist(next, overrides);
      queueMicrotask(() =>
        uxToast.success(nextActive ? 'Moteur activé' : 'Moteur désactivé'),
      );
      return next;
    });
  };

  const patchEngine = useCallback(
    (id: string, patch: Partial<FmEngine>) => {
      if (!canEdit) {
        uxToast.error('Droits insuffisants');
        return;
      }
      setEngines((prev) => {
        const next = prev.map((engine) =>
          engine.id === id ? { ...engine, ...patch } : engine,
        );
        persist(next, overrides);
        return next;
      });
    },
    [canEdit, overrides, persist],
  );

  const addTier = () => {
    const last = draftRows[draftRows.length - 1];
    const nextMin = last
      ? (last.maxQty != null
        ? (Number.isInteger(last.maxQty) && last.maxQty >= 1
          ? last.maxQty + 1
          : Math.round((last.maxQty + 0.01) * 1000) / 1000)
        : last.minQty)
      : 1;
    setDraftRows([
      ...draftRows,
      { minQty: nextMin, maxQty: null, unitPrice: null, discountPercent: 0, active: true },
    ]);
  };

  const saveTiers = async () => {
    if (!canEdit || !selectedId) return;
    setTiersSaving(true);
    try {
      const r = await fetch(`${TIERS_API}/${selectedId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tierMode: 'percent',
          qtyMin: articleTiers?.article.qtyMin ?? 1,
          saleUnit,
          publishToPos: true,
          variantKey: selectedVariantKey,
          variantLabel:
            articleTiers?.variants?.find((v) => v.variantKey === selectedVariantKey)?.variantLabel
            ?? null,
          tiers: draftRows,
        }),
      });
      const d = await r.json();
      if (r.ok && d.ok) {
        uxToast.success('Paliers enregistrés et appliqués au POS commercial');
        const payload = d.data as ArticleTiersPayload;
        setArticleTiers(payload);
        setTierMode('percent');
        applyTiersDraft(payload, selectedVariantKey);
        tiersLoadedForRef.current = selectedId;
        if (selectedId) void loadDetail(selectedId);
        // Propagation instantanée Admin → POS / devis / catalogue (multi-onglets)
        emitOrionLiveMany(['pricing', 'catalogue', 'sync'], {
          entityId: selectedId ?? undefined,
          source: 'formules-moteurs-save-tiers',
        });
      } else {
        uxToast.error(d.error?.message ?? 'Erreur sauvegarde paliers');
      }
    } catch {
      uxToast.error('Erreur réseau');
    } finally {
      setTiersSaving(false);
    }
  };

  const meta = VIEW_META[view];
  const variableCount = FM_PARAMETERS.filter((p) => p.group === 'variable').length;

  return (
    <div className="fm-refonte">
      <div className="fm-refonte-heading">
        <div>
          <div className="fm-refonte-eyebrow">Moteur commercial universel</div>
          <h1>{meta.title}</h1>
          <p>{meta.subtitle}</p>
        </div>
        {view === 'engines' && listMode === 'engines' ? (
          <button
            type="button"
            className="fm-refonte-btn fm-refonte-btn--primary"
            onClick={() => openModal()}
            disabled={!canEdit}
          >
            Nouveau moteur
          </button>
        ) : null}
      </div>

      <div className="fm-refonte-formula" aria-label="Formule finale du moteur">
        <div className="fm-refonte-formula__label">Formule finale HT</div>
        <code>{FORMULE_FINALE_HT}</code>
        <div>
          <button
            type="button"
            className="fm-refonte-formula__copy"
            onClick={() => void handleCopyFormula()}
          >
            Copier
          </button>
        </div>
      </div>

      <div className="fm-refonte-sync fm-refonte-sync--ok" aria-label="Chaîne de synchronisation">
        <div>
          <strong>Chaîne liée · mise à jour automatique</strong>
          <span>
            Formule article → Paramètres (02) → Règles (03) → Matières → Articles finis → Catalogue POS.
            Publier la formule ou enregistrer le prix base propage les changements.
          </span>
          {syncLoaded && rulesKpi.label === 'catalogue' && ruleCounts.dbRaw === 0 ? (
            <span className="fm-refonte-sync__hint">
              Aucune BusinessRule en DB — affichage catalogue Formules. Syncer via Admin Règles / Centre sync pour le miroir DB.
            </span>
          ) : null}
        </div>
        <div className="fm-refonte-sync__actions">
          <button
            type="button"
            className="fm-refonte-btn fm-refonte-btn--sm"
            onClick={() => void loadProfiles()}
            title="Recharger les articles"
          >
            <RefreshCw size={12} aria-hidden /> Actualiser
          </button>
          <Link href="/pos" className="fm-refonte-btn fm-refonte-btn--sm">
            Catalogue POS
          </Link>
          <Link href="/administration/prix-articles" className="fm-refonte-btn fm-refonte-btn--sm">
            Articles finis
          </Link>
          <Link
            href="/administration/catalogue-prix-stock?studio=matieres"
            className="fm-refonte-btn fm-refonte-btn--sm"
          >
            Matières
          </Link>
        </div>
      </div>

      <div className="fm-refonte-summary" aria-label="Résumé du moteur">
        <div className="fm-refonte-summary__item">
          <b>{profilesLoading ? '…' : pad2(commercialProfiles.length)}</b>
          <span>
            Articles
            <br />
            commerciaux
          </span>
        </div>
        <div className="fm-refonte-summary__item">
          <b>{pad2(truthParamCount || variableCount)}</b>
          <span>
            Paramètres
            <br />
            synchronisés
          </span>
        </div>
        <div className="fm-refonte-summary__item">
          <b>{!syncLoaded ? '…' : pad2(rulesKpi.count)}</b>
          <span>
            Règles
            <br />
            {rulesKpi.label === 'catalogue' ? 'catalogue' : rulesKpi.label === 'fusionnées' ? 'fusionnées' : rulesKpi.label === 'affichées' ? 'affichées' : 'sync'}
          </span>
        </div>
        <div className="fm-refonte-summary__item">
          <b>
            {!syncLoaded
              ? '…'
              : pad2(
                  commercialProfiles.filter((p) => p.status === 'published').length
                    || overviewStats?.publishedProfiles
                    || 0,
                )}
          </b>
          <span>
            Articles
            <br />
            publiés
          </span>
        </div>
      </div>

      <nav className="fm-refonte-nav" aria-label="Vues Formules & moteurs">
        <button
          type="button"
          className={cn('fm-refonte-nav__btn', view === 'engines' && 'is-active')}
          onClick={() => setFmView('engines')}
        >
          <span className="fm-refonte-nav__icon">01</span>
          Articles commerciaux
          <span className="fm-refonte-nav__count">{pad2(commercialProfiles.length)}</span>
        </button>
        <button
          type="button"
          className={cn('fm-refonte-nav__btn', view === 'parameters' && 'is-active')}
          onClick={() => setFmView('parameters')}
        >
          <span className="fm-refonte-nav__icon">02</span>
          Paramètres de calcul
          <span className="fm-refonte-nav__count">{pad2(truthParamCount || FM_PARAMETERS.filter((p) => p.group !== 'tier').length)}</span>
        </button>
        <button
          type="button"
          className={cn('fm-refonte-nav__btn', view === 'rules' && 'is-active')}
          onClick={() => setFmView('rules')}
        >
          <span className="fm-refonte-nav__icon">03</span>
          Règles métier
          <span className="fm-refonte-nav__count">
            {pad2(rulesBadgeCount)}
          </span>
        </button>
      </nav>

      {view === 'engines' ? (
        <section className="fm-refonte-panel" aria-label="Articles commerciaux">
          <div className="fm-refonte-panel__head">
            <div>
              <h2>
                {listMode === 'articles'
                  ? 'Articles commerciaux POS'
                  : 'Moteurs de prix par famille'}
              </h2>
              <p>
                {listMode === 'articles'
                  ? `${filteredArticles.length} affichés · ${commercialProfiles.length} cartes POS (hors variantes ART-xxx).`
                  : 'Vue synthétique des moteurs familles. Revenir aux articles pour éditer chaque produit.'}
              </p>
            </div>
            <div className="fm-refonte-toolbar">
              <div className="fm-refonte-mode">
                <button
                  type="button"
                  className={cn(
                    'fm-refonte-btn fm-refonte-btn--sm',
                    listMode === 'articles' && 'fm-refonte-btn--primary',
                  )}
                  onClick={() => setListMode('articles')}
                >
                  Articles
                </button>
                <button
                  type="button"
                  className={cn(
                    'fm-refonte-btn fm-refonte-btn--sm',
                    listMode === 'engines' && 'fm-refonte-btn--primary',
                  )}
                  onClick={() => setListMode('engines')}
                >
                  Moteurs familles
                </button>
              </div>
              <div className="fm-refonte-search">
                <Search className="fm-refonte-search__icon" aria-hidden />
                <input
                  type="search"
                  value={engineQuery}
                  onChange={(e) => setEngineQuery(e.target.value)}
                  placeholder={
                    listMode === 'articles'
                      ? 'Rechercher un article, une famille…'
                      : 'Rechercher une famille…'
                  }
                  autoComplete="off"
                />
              </div>
              {listMode === 'articles' ? (
                <>
                  <select
                    className="fm-refonte-select"
                    value={articleStatusFilter}
                    onChange={(e) =>
                      setArticleStatusFilter(e.target.value as FormulaProfileStatusFilter)
                    }
                    aria-label="Filtrer les articles"
                  >
                    <option value="all">Tous les états</option>
                    <option value="active">Actifs POS</option>
                    <option value="draft">Brouillons</option>
                    <option value="no_formula">Sans formule</option>
                    <option value="archived">Archivés</option>
                  </select>
                  <select
                    className="fm-refonte-select"
                    value={articleEngineFilter}
                    onChange={(e) => setArticleEngineFilter(e.target.value)}
                    aria-label="Filtrer par moteur famille"
                  >
                    <option value="all">Tous les moteurs</option>
                    {engines.map((e) => (
                      <option key={e.id} value={e.id}>
                        {e.name}
                      </option>
                    ))}
                  </select>
                  <select
                    className="fm-refonte-select"
                    value={articleFamilyFilter}
                    onChange={(e) =>
                      setArticleFamilyFilter(e.target.value as string | 'all')
                    }
                    aria-label="Filtrer par famille DB"
                  >
                    <option value="all">Toutes les familles</option>
                    {articleFamilies.map((f) => (
                      <option key={f} value={f}>
                        {f}
                      </option>
                    ))}
                  </select>
                </>
              ) : (
                <select
                  className="fm-refonte-select"
                  value={engineStatus}
                  onChange={(e) =>
                    setEngineStatus(e.target.value as 'all' | 'active' | 'inactive')
                  }
                  aria-label="Filtrer les moteurs"
                >
                  <option value="all">Tous les états</option>
                  <option value="active">Actifs</option>
                  <option value="inactive">Inactifs</option>
                </select>
              )}
            </div>
          </div>

          {listMode === 'articles' ? (
            <>
              {profilesLoading ? (
                <div className="fm-refonte-empty">
                  <LoadingState message="Chargement des articles commerciaux…" size="sm" />
                </div>
              ) : profilesError ? (
                <div className="fm-refonte-empty">
                  <ErrorState
                    message={profilesError}
                    onRetry={() => void loadProfiles()}
                  />
                </div>
              ) : (
                <div className="fm-refonte-table-wrap">
                  <table
                    className="fm-refonte-table"
                    aria-label="Articles commerciaux POS"
                  >
                    <thead>
                      <tr>
                        <th>Article</th>
                        <th>Famille</th>
                        <th>Calcul</th>
                        <th>Prix base</th>
                        <th>Unité</th>
                        <th>Paliers</th>
                        <th>Formule</th>
                        <th>État</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredArticles.length === 0 ? (
                        <tr>
                          <td colSpan={8}>
                            <div className="fm-refonte-empty">
                              Aucun article ne correspond à la recherche.
                            </div>
                          </td>
                        </tr>
                      ) : (
                        filteredArticles.map((article) => {
                          const state = resolveProfileListState(article);
                          const fmEngine = matchFmEngineByFamily(article.family, engines);
                          const tiersCount = article.discountTiers?.length ?? 0;
                          const hasFormula =
                            Boolean(article.formulaVersions?.[0]) ||
                            (article._count?.formulaVersions ?? 0) > 0;
                          const open = expandedId === article.articleId;
                          const accent = posFamilyAccent(
                            article.family,
                            fmEngine?.color ?? '#cc0033',
                          );
                          const margin = fmEngine?.margin ?? 25;
                          const minimum = fmEngine?.minimum ?? 0;
                          const round = fmEngine?.round ?? 50;
                          const familyArticles = commercialProfiles
                            .filter(
                              (p) =>
                                p.family &&
                                article.family &&
                                p.family === article.family &&
                                p.articleId !== article.articleId,
                            )
                            .slice(0, 12);
                          const toggle = () =>
                            setExpandedId((prev) =>
                              prev === article.articleId ? null : article.articleId,
                            );
                          return (
                            <Fragment key={article.articleId}>
                              <tr
                                className={cn('fm-refonte-engine-row', open && 'is-open')}
                                style={{ ['--accent' as string]: accent }}
                                tabIndex={0}
                                aria-expanded={open}
                                onClick={toggle}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter' || e.key === ' ') {
                                    e.preventDefault();
                                    toggle();
                                  }
                                }}
                              >
                                <td>
                                  <div className="fm-refonte-engine-main">
                                    <button
                                      type="button"
                                      className="fm-refonte-chevron"
                                      tabIndex={-1}
                                      aria-hidden
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        toggle();
                                      }}
                                    >
                                      ›
                                    </button>
                                    <span className="fm-refonte-engine-accent" />
                                    <div>
                                      <b>{displayProfileLabel(article.articleLabel)}</b>
                                      <small className="fm-refonte-mono">
                                        {article.articleId}
                                      </small>
                                    </div>
                                  </div>
                                </td>
                                <td>
                                  <span
                                    className="fm-refonte-cell-title"
                                    style={{ color: accent }}
                                  >
                                    {article.family ?? '—'}
                                  </span>
                                  {fmEngine ? (
                                    <span className="fm-refonte-cell-sub">
                                      {fmEngine.name}
                                    </span>
                                  ) : null}
                                </td>
                                <td>{calculationLabelFr(article.calculationType)}</td>
                                <td className="fm-refonte-mono">
                                  {article.prixBase != null
                                    ? money(Number(article.prixBase))
                                    : '—'}
                                </td>
                                <td>{article.saleUnit || 'pièce'}</td>
                                <td className="fm-refonte-mono">
                                  {tiersCount > 0 ? `${tiersCount}` : '—'}
                                </td>
                                <td>
                                  <span
                                    className={cn(
                                      'fm-refonte-badge',
                                      hasFormula
                                        ? 'fm-refonte-badge--ok'
                                        : 'fm-refonte-badge--warn',
                                    )}
                                  >
                                    {hasFormula
                                      ? `v${article.formulaVersions?.[0]?.version ?? '—'}`
                                      : 'Absente'}
                                  </span>
                                </td>
                                <td>
                                  <span
                                    className={cn(
                                      'fm-refonte-badge',
                                      state.tone === 'ok' && 'fm-refonte-badge--ok',
                                      state.tone === 'warn' && 'fm-refonte-badge--warn',
                                      state.tone === 'danger' && 'fm-refonte-badge--block',
                                      state.tone === 'muted' && 'fm-refonte-badge--info',
                                    )}
                                  >
                                    {state.primary}
                                  </span>
                                </td>
                              </tr>
                              {open ? (
                                <tr
                                  className="fm-refonte-details-row"
                                  style={{ ['--accent' as string]: accent }}
                                >
                                  <td colSpan={8}>
                                    <div className="fm-refonte-engine-detail">
                                      <div className="fm-refonte-flow-block">
                                        <EditableFlowSteps
                                          hints={{
                                            '10':
                                              article.prixBase != null
                                                ? money(Number(article.prixBase))
                                                : 'Prix profil',
                                            '80':
                                              tiersCount > 0
                                                ? `${tiersCount} paliers`
                                                : 'Selon profil',
                                            '90': `${margin} %`,
                                            '100': money(minimum),
                                            '110': money(round),
                                          }}
                                          activeStep={activeFlowStep}
                                          onSelect={setActiveFlowStep}
                                        />
                                        {!activeFlowStep ? (
                                          <p className="fm-refonte-flow-hint">
                                            Cliquez une étape du parcours pour le résumé ou la
                                            configuration (formule, paliers, majoration…).
                                          </p>
                                        ) : null}
                                      </div>
                                      <div className="fm-refonte-detail-rail">
                                        <aside className="fm-refonte-detail-side">
                                          <header className="fm-refonte-detail-side__head">
                                            <p className="fm-refonte-detail-side__eyebrow">
                                              Famille sélectionnée
                                            </p>
                                            <h3>
                                              {fmEngine?.name ??
                                                article.family ??
                                                'Article'}
                                            </h3>
                                          </header>
                                          <div className="fm-refonte-tokens">
                                            <span className="fm-refonte-token">
                                              {displayProfileLabel(article.articleLabel)}
                                            </span>
                                            {familyArticles.map((p) => (
                                              <span
                                                key={p.articleId}
                                                className="fm-refonte-token"
                                              >
                                                {displayProfileLabel(p.articleLabel)}
                                              </span>
                                            ))}
                                            {fmEngine?.items.map((item) => (
                                              <span key={item} className="fm-refonte-token">
                                                {item}
                                              </span>
                                            ))}
                                          </div>
                                          <dl className="fm-refonte-detail-specs">
                                            <div>
                                              <dt>Base</dt>
                                              <dd>
                                                {fmEngine?.base ??
                                                  (article.prixBase != null
                                                    ? money(Number(article.prixBase))
                                                    : 'Prix de base profil')}
                                              </dd>
                                            </div>
                                            <div>
                                              <dt>Paramètres</dt>
                                              <dd>
                                                {fmEngine
                                                  ? `Marge ${margin}% · min. ${money(minimum)} · arrondi ${money(round)}`
                                                  : `Formule ${hasFormula ? `v${article.formulaVersions?.[0]?.version ?? '—'}` : 'à compléter'} · paliers ${tiersCount > 0 ? tiersCount : 'aucun'}`}
                                              </dd>
                                            </div>
                                            <div className="fm-refonte-detail-specs__full">
                                              <dt>Construction</dt>
                                              <dd>
                                                {fmEngine?.construction ??
                                                  calculationLabelFr(article.calculationType)}
                                              </dd>
                                            </div>
                                          </dl>
                                        {activeFlowStep ? (
                                          <div
                                            className="fm-refonte-flow-editor"
                                            onClick={(e) => e.stopPropagation()}
                                          >
                                            <ArticleFlowStepEditor
                                              step={activeFlowStep}
                                              article={article}
                                              fmEngine={fmEngine}
                                              canEdit={canEdit}
                                              detail={
                                                selectedId === article.articleId
                                                  ? detail
                                                  : null
                                              }
                                              detailLoading={
                                                selectedId === article.articleId &&
                                                detailLoading
                                              }
                                              tiersLoading={
                                                selectedId === article.articleId &&
                                                tiersLoading
                                              }
                                              draftRows={
                                                selectedId === article.articleId
                                                  ? draftRows
                                                  : []
                                              }
                                              setDraftRows={setDraftRows}
                                              tierMode={tierMode}
                                              saleUnit={saleUnit}
                                              prixBase={
                                                selectedId === article.articleId
                                                  ? prixBase
                                                  : article.prixBase ?? null
                                              }
                                              prixBaseSource={
                                                selectedId === article.articleId
                                                  ? prixBaseSource
                                                  : null
                                              }
                                              simulations={
                                                selectedId === article.articleId
                                                  ? simulations
                                                  : []
                                              }
                                              tiersSaving={tiersSaving}
                                              variants={
                                                selectedId === article.articleId
                                                  ? (articleTiers?.variants ?? [])
                                                  : []
                                              }
                                              selectedVariantKey={
                                                selectedId === article.articleId
                                                  ? selectedVariantKey
                                                  : ''
                                              }
                                              onSelectVariant={selectTierVariant}
                                              onAddTier={addTier}
                                              onSaveTiers={() => void saveTiers()}
                                              onReloadDetail={() =>
                                                void loadDetail(article.articleId)
                                              }
                                              onReloadProfiles={() => void loadProfiles()}
                                              onPatchEngine={
                                                fmEngine
                                                  ? (patch) =>
                                                      patchEngine(fmEngine.id, patch)
                                                  : undefined
                                              }
                                              onOpenParameters={() => {
                                                setFmView('parameters');
                                                setParamsTruthOnly(true);
                                              }}
                                              onOpenRules={() => {
                                                if (article.family) {
                                                  setRuleFamilyFilter(article.family);
                                                }
                                                setFmView('rules');
                                                setRulesTruthOnly(true);
                                              }}
                                            />
                                          </div>
                                        ) : null}
                                        </aside>
                                      </div>
                                    </div>
                                  </td>
                                </tr>
                              ) : null}
                            </Fragment>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              )}
              <div className="fm-refonte-table-foot">
                Cliquez une ligne pour ouvrir le parcours. L’étape 10 édite la formule
                (expression + blocs) et l’applique au POS. Les étapes 80 / 90 / 110 restent
                modifiables ici — le minimum se règle dans le moteur famille.
              </div>
            </>
          ) : (
            <div className="fm-refonte-table-wrap">
              <table className="fm-refonte-table" aria-label="Moteurs de prix">
                <thead>
                  <tr>
                    <th>Famille / articles</th>
                    <th>Base & unité</th>
                    <th>Construction du prix</th>
                    <th>Majoration</th>
                    <th>Minimum</th>
                    <th>Arrondi</th>
                    <th>Paliers</th>
                    <th>État</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEngines.length === 0 ? (
                    <tr>
                      <td colSpan={8}>
                        <div className="fm-refonte-empty">
                          Aucun moteur ne correspond à la recherche.
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredEngines.map((engine) => {
                      const open = expandedId === engine.id;
                      const coverage =
                        engineCoverageMap.get(engine.id) ?? {
                          profiles: 0,
                          published: 0,
                          draft: 0,
                          families: [] as string[],
                        };
                      return (
                        <EngineRows
                          key={engine.id}
                          engine={engine}
                          open={open}
                          canEdit={canEdit}
                          coverage={coverage}
                          syncLoaded={syncLoaded}
                          activeFlowStep={open ? activeFlowStep : null}
                          onSelectFlowStep={setActiveFlowStep}
                          onToggleExpand={() =>
                            setExpandedId((prev) =>
                              prev === engine.id ? null : engine.id,
                            )
                          }
                          onToggleActive={() => toggleEngineActive(engine.id)}
                          onPatch={(patch) => patchEngine(engine.id, patch)}
                          onEditEngine={() => openModal(engine)}
                        />
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}
        </section>
      ) : null}

      {view === 'parameters' ? (
        <section className="fm-refonte-panel" aria-label="Paramètres de calcul">
          <div className="fm-refonte-panel__head">
            <div>
              <h2>Paramètres de calcul</h2>
              <p>
                {truthParamCount} valeurs synchronisées — applicables aux {commercialProfiles.length} articles commerciaux
                {paramsTruthOnly ? ' (mode vrai)' : ` · ${truthParameters.length} lignes dont catalogue`}.
              </p>
            </div>
            <div className="fm-refonte-toolbar">
              <div className="fm-refonte-mode">
                <button
                  type="button"
                  className={cn(
                    'fm-refonte-btn fm-refonte-btn--sm',
                    paramsTruthOnly && 'fm-refonte-btn--primary',
                  )}
                  onClick={() => setParamsTruthOnly(true)}
                >
                  Valeurs vraies
                </button>
                <button
                  type="button"
                  className={cn(
                    'fm-refonte-btn fm-refonte-btn--sm',
                    !paramsTruthOnly && 'fm-refonte-btn--primary',
                  )}
                  onClick={() => setParamsTruthOnly(false)}
                >
                  Tout + catalogue
                </button>
              </div>
              <div className="fm-refonte-search">
                <Search className="fm-refonte-search__icon" aria-hidden />
                <input
                  type="search"
                  value={paramQuery}
                  onChange={(e) => setParamQuery(e.target.value)}
                  placeholder="Rechercher un paramètre…"
                  autoComplete="off"
                />
              </div>
              <select
                className="fm-refonte-select"
                value={paramGroup}
                onChange={(e) => setParamGroup(e.target.value)}
                aria-label="Filtrer les paramètres"
              >
                {PARAM_GROUP_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="fm-refonte-param-grid" aria-label="Paramètres de calcul fusionnés">
            {filteredParams.length === 0 ? (
              <div className="fm-refonte-empty fm-refonte-param-grid__empty">
                Aucun paramètre ne correspond à la recherche.
              </div>
            ) : (
              paramSections.map(({ section, params }) => (
                <article key={section} className="fm-refonte-param-card">
                  <header className="fm-refonte-param-card__head">
                    <h3>{section}</h3>
                    <span>{params.length}</span>
                  </header>
                  <ul className="fm-refonte-param-card__list">
                    {params.map((param) => {
                      const meta = param.truth;
                      const sourceLabel = meta.isTruth
                        ? `vrai · ${meta.liveSource}`
                        : meta.liveSource === 'session'
                          ? 'édition session'
                          : 'catalogue';
                      return (
                        <li key={param.ref} className="fm-refonte-param-row">
                          <div className="fm-refonte-param-row__main">
                            <div className="fm-refonte-param-row__title">
                              <span className="fm-refonte-param-name">{param.name}</span>
                              <span
                                className={cn(
                                  'fm-refonte-badge',
                                  `fm-refonte-badge--${param.status}`,
                                )}
                              >
                                {STATUS_LABEL[param.status]}
                              </span>
                            </div>
                            <span className="fm-refonte-ref fm-refonte-param-row__ref">
                              {param.ref}
                            </span>
                            <p className="fm-refonte-param-row__meta">
                              {sourceLabel}
                              {param.condition ? ` · ${param.condition}` : ''}
                              {param.scope ? ` · ${param.scope}` : ''}
                            </p>
                            {param.rule ? (
                              <p className="fm-refonte-param-row__rule">{param.rule}</p>
                            ) : null}
                          </div>
                          <div className="fm-refonte-param-value">
                            {param.key && canEdit && meta.writable !== false ? (
                              <input
                                className="fm-refonte-cell-input"
                                value={param.value}
                                aria-label={`Valeur de ${param.name}`}
                                onChange={(e) => {
                                  const key = param.key!;
                                  const value = e.target.value;
                                  setOverrides((prev) => {
                                    const next = { ...prev, [key]: value };
                                    persist(engines, next);
                                    return next;
                                  });
                                }}
                                onBlur={() => {
                                  void handleSave();
                                }}
                              />
                            ) : (
                              <span className="fm-refonte-param-value__text">{param.value}</span>
                            )}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </article>
              ))
            )}
          </div>
          <div className="fm-refonte-table-foot">
            Les champs encadrés sont modifiables : la sync DB (TVA `tax`, facteurs format) part
            au blur. Les paliers volume se configurent par article dans le panneau avancé. La
            quantité reste le dernier champ du parcours commercial.
          </div>
        </section>
      ) : null}

      {view === 'rules' ? (
        <section className="fm-refonte-panel" aria-label="Règles métier">
          <div className="fm-refonte-panel__head">
            <div>
              <h2>Règles métier</h2>
              <p>
                Vue fusionnée (idées / templates communs). Le POS applique les champs config
                (forcePrice, filtres…) — la table DB est un miroir d’audit.
                {' '}
                {isAllFamiliesFilter(ruleFamilyFilter)
                  ? `${ruleCounts.visible} affichée(s) · ${ruleSections.length} zone(s)`
                  : `${ruleCounts.visible} · « ${ruleFamilyFilter} »`}
                {' · '}
                {rulesTruthOnly
                  ? `lignes DB ${ruleCounts.dbRaw} → ${ruleCounts.fusedTruth} fusionnées`
                  : `brutes ${mergedRules.length} → ${ruleCounts.fusedAll} fusionnées`}
                .
              </p>
              <p className="fm-refonte-rule-mirror-note">
                Lignes DB (templates article) — miroir d’audit. Import / export bulk :{' '}
                <Link href="/administration/import-export">Centre Import-Export</Link>
                {' · '}
                édition runtime = articles publiés / config POS.
              </p>
            </div>
            <div className="fm-refonte-toolbar">
              <select
                className="fm-refonte-select fm-refonte-select--wide"
                value={isAllFamiliesFilter(ruleFamilyFilter) ? '__all__' : ruleFamilyFilter}
                onChange={(e) => setRuleFamilyFilter(e.target.value || '__all__')}
                aria-label="Filtrer les règles par famille"
              >
                <option value="__all__">
                  Toutes les zones ({rulesTruthOnly ? ruleCounts.fusedTruth : ruleCounts.fusedAll})
                </option>
                {ruleFamilyOptions.map((family) => (
                  <option key={family} value={family}>
                    {family}
                  </option>
                ))}
              </select>
              <div className="fm-refonte-mode">
                <button
                  type="button"
                  className={cn(
                    'fm-refonte-btn fm-refonte-btn--sm',
                    rulesTruthOnly && 'fm-refonte-btn--primary',
                  )}
                  onClick={() => setRulesTruthOnly(true)}
                >
                  Règles vraies
                </button>
                <button
                  type="button"
                  className={cn(
                    'fm-refonte-btn fm-refonte-btn--sm',
                    !rulesTruthOnly && 'fm-refonte-btn--primary',
                  )}
                  onClick={() => setRulesTruthOnly(false)}
                >
                  Tout + catalogue
                </button>
              </div>
              <div className="fm-refonte-search">
                <Search className="fm-refonte-search__icon" aria-hidden />
                <input
                  type="search"
                  value={ruleQuery}
                  onChange={(e) => setRuleQuery(e.target.value)}
                  placeholder="Rechercher une règle…"
                  autoComplete="off"
                />
              </div>
              <select
                className="fm-refonte-select"
                value={ruleType}
                onChange={(e) => setRuleType(e.target.value as 'all' | FmRuleSeverity)}
                aria-label="Filtrer les règles par type"
              >
                <option value="all">Tous les types</option>
                <option value="block">Bloquantes</option>
                <option value="warn">Alertes</option>
                <option value="info">Informations</option>
              </select>
            </div>
          </div>
          <div className="fm-refonte-rule-grid" aria-label="Règles métier">
            {filteredRules.length === 0 ? (
              <div className="fm-refonte-empty fm-refonte-rule-grid__empty">
                Aucune règle ne correspond à ces filtres
                {ruleFamilyFilter && !isAllFamiliesFilter(ruleFamilyFilter)
                  ? ` (famille « ${ruleFamilyFilter} »)`
                  : ''}
                .
              </div>
            ) : (
              ruleSections.map(({ family, rules }) => (
                <article
                  key={family}
                  className={cn(
                    'fm-refonte-rule-card',
                    family === FM_STANDARD_RULES_FAMILY && 'fm-refonte-rule-card--standard',
                  )}
                >
                  <header className="fm-refonte-rule-card__head">
                    <div>
                      <h3>{family}</h3>
                      {family === FM_STANDARD_RULES_FAMILY ? (
                        <p className="fm-refonte-rule-card__hint">
                          Communes à tous les articles — idées identiques fusionnées
                        </p>
                      ) : null}
                    </div>
                    <span>{rules.length}</span>
                  </header>
                  <ul className="fm-refonte-rule-card__list">
                    {rules.map((rule) => (
                      <li
                        key={`${rule.canonicalKey}-${rule.code}`}
                        className="fm-refonte-rule-row"
                      >
                        <div className="fm-refonte-rule-row__top">
                          <span className="fm-refonte-ref">{rule.code}</span>
                          <span
                            className={cn(
                              'fm-refonte-badge',
                              `fm-refonte-badge--${rule.severity}`,
                            )}
                          >
                            {SEVERITY_LABEL[rule.severity]}
                          </span>
                          {rule.occurrenceCount > 1 ? (
                            <span className="fm-refonte-badge fm-refonte-badge--neutral">
                              ×{rule.occurrenceCount}
                            </span>
                          ) : null}
                        </div>
                        <p className="fm-refonte-rule-row__title">{rule.rule}</p>
                        <p className="fm-refonte-rule-row__effect">{rule.action}</p>
                      </li>
                    ))}
                  </ul>
                </article>
              ))
            )}
          </div>
          <div className="fm-refonte-table-foot">
            {ruleCounts.visible} règle(s) fusionnée(s) affichée(s)
            {ruleSections.length > 0 ? ` · ${ruleSections.length} zone(s)` : ''}
            {' · '}
            Lignes DB (templates) : {ruleCounts.dbRaw}
            {' → '}
            {rulesTruthOnly ? ruleCounts.fusedTruth : ruleCounts.fusedAll} après fusion
            {rulesTruthOnly
              ? ' (mode vrai — catalogue doc masqué)'
              : ' (vrai + documentation catalogue)'}
            .
          </div>
        </section>
      ) : null}

      {modalOpen ? (
        <div
          className="fm-refonte-modal-bg"
          role="presentation"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeModal();
          }}
        >
          <form
            className="fm-refonte-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="fm-modal-title"
            onSubmit={applyModal}
          >
            <div className="fm-refonte-modal__head">
              <h2 id="fm-modal-title">
                {form.id ? 'Configurer le moteur' : 'Nouveau moteur'}
              </h2>
              <button
                type="button"
                className="fm-refonte-modal__close"
                aria-label="Fermer"
                onClick={closeModal}
              >
                ×
              </button>
            </div>
            <div className="fm-refonte-modal__body">
              <div className="fm-refonte-form-grid">
                <div className="fm-refonte-field">
                  <label htmlFor="fm-m-name">Nom de la famille</label>
                  <input
                    id="fm-m-name"
                    required
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    disabled={!canEdit}
                  />
                </div>
                <div className="fm-refonte-field">
                  <label htmlFor="fm-m-unit">Unité facturable</label>
                  <select
                    id="fm-m-unit"
                    value={form.unit}
                    onChange={(e) => setForm((f) => ({ ...f, unit: e.target.value }))}
                    disabled={!canEdit}
                  >
                    <option>Pièce</option>
                    <option>Pièce / lot</option>
                    <option>Pièce / forfait</option>
                    <option>m²</option>
                    <option>Forfait</option>
                  </select>
                </div>
                <div className="fm-refonte-field">
                  <label htmlFor="fm-m-base">Base de calcul</label>
                  <input
                    id="fm-m-base"
                    required
                    value={form.base}
                    onChange={(e) => setForm((f) => ({ ...f, base: e.target.value }))}
                    disabled={!canEdit}
                  />
                </div>
                <div className="fm-refonte-field">
                  <label htmlFor="fm-m-profile">Profil de paliers</label>
                  <select
                    id="fm-m-profile"
                    value={form.profile}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        profile: e.target.value as FmEngineProfile,
                      }))
                    }
                    disabled={!canEdit}
                  >
                    <option value="universal">Universel</option>
                    <option value="pos">POS actif</option>
                    <option value="specific">Spécifique</option>
                  </select>
                </div>
                <div className="fm-refonte-field fm-refonte-field--full">
                  <label htmlFor="fm-m-construction">Construction du prix</label>
                  <input
                    id="fm-m-construction"
                    required
                    value={form.construction}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, construction: e.target.value }))
                    }
                    disabled={!canEdit}
                  />
                  <span className="hint">
                    Décrire les composants dans leur ordre réel, sans ajouter deux fois la
                    matière déjà comprise.
                  </span>
                </div>
                <div className="fm-refonte-field">
                  <label htmlFor="fm-m-margin">Majoration appliquée (%)</label>
                  <input
                    id="fm-m-margin"
                    type="number"
                    min={0}
                    step={1}
                    required
                    value={form.margin}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, margin: Number(e.target.value) }))
                    }
                    disabled={!canEdit}
                  />
                </div>
                <div className="fm-refonte-field">
                  <label htmlFor="fm-m-minimum">Minimum facturable (Ar)</label>
                  <input
                    id="fm-m-minimum"
                    type="number"
                    min={0}
                    step={50}
                    required
                    value={form.minimum}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, minimum: Number(e.target.value) }))
                    }
                    disabled={!canEdit}
                  />
                </div>
                <div className="fm-refonte-field">
                  <label htmlFor="fm-m-round">Pas d’arrondi supérieur (Ar)</label>
                  <input
                    id="fm-m-round"
                    type="number"
                    min={1}
                    step={50}
                    required
                    value={form.round}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, round: Number(e.target.value) }))
                    }
                    disabled={!canEdit}
                  />
                </div>
                <div className="fm-refonte-field">
                  <label htmlFor="fm-m-active">État du moteur</label>
                  <select
                    id="fm-m-active"
                    value={String(form.active)}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, active: e.target.value === 'true' }))
                    }
                    disabled={!canEdit}
                  >
                    <option value="true">Actif</option>
                    <option value="false">Inactif</option>
                  </select>
                </div>
                <div className="fm-refonte-field fm-refonte-field--full">
                  <label htmlFor="fm-m-items">Articles couverts</label>
                  <textarea
                    id="fm-m-items"
                    value={form.itemsText}
                    onChange={(e) => setForm((f) => ({ ...f, itemsText: e.target.value }))}
                    placeholder="Séparer les articles par une virgule"
                    disabled={!canEdit}
                  />
                </div>
              </div>
            </div>
            <div className="fm-refonte-modal__foot">
              <button
                type="button"
                className="fm-refonte-btn"
                onClick={() =>
                  openAdvanced({
                    preferArticleId: selectedId ?? articleFromUrl,
                    engineId: form.id || focusEngineId,
                  })
                }
              >
                Constructeur & paliers
              </button>
              <button type="button" className="fm-refonte-btn" onClick={closeModal}>
                Annuler
              </button>
              <button
                type="submit"
                className="fm-refonte-btn fm-refonte-btn--primary"
                disabled={!canEdit}
              >
                Appliquer
              </button>
            </div>
          </form>
        </div>
      ) : null}

      {advancedOpen ? (
        <div
          className="fm-refonte-advanced-bg"
          role="presentation"
          onClick={(e) => {
            if (e.target === e.currentTarget) setAdvancedOpen(false);
          }}
        >
          <aside
            className="fm-refonte-advanced"
            role="dialog"
            aria-modal="true"
            aria-label="Constructeur et paliers"
          >
            <div className="fm-refonte-advanced__head">
              <div>
                <h2>Constructeur & paliers</h2>
                <p>
                  Édition avancée d’un profil article — formules dynamiques et grille de
                  remises.
                </p>
              </div>
              <button
                type="button"
                className="fm-refonte-modal__close"
                aria-label="Fermer"
                onClick={() => setAdvancedOpen(false)}
              >
                ×
              </button>
            </div>
            <div className="fm-refonte-advanced__body">
              {profilesLoading ? (
                <LoadingState message="Chargement des profils…" size="sm" />
              ) : profilesError ? (
                <ErrorState
                  message={profilesError}
                  onRetry={() => void loadProfiles()}
                  className="py-8"
                />
              ) : (
                <>
                  <div className="fm-refonte-profile-pick">
                    <label htmlFor="fm-adv-profile">
                      <span className="sr-only">Profil article</span>
                    </label>
                    <select
                      id="fm-adv-profile"
                      value={selectedId ?? ''}
                      onChange={(e) => {
                        const nextId = e.target.value || null;
                        setSelectedId(nextId);
                        const next = filteredAdvancedProfiles.find(
                          (p) => p.articleId === nextId,
                        );
                        const matched = matchFmEngineByFamily(next?.family, engines);
                        if (matched) setFocusEngineId(matched.id);
                      }}
                    >
                      {filteredAdvancedProfiles.length === 0 ? (
                        <option value="">Aucun profil</option>
                      ) : (
                        filteredAdvancedProfiles.map((p) => (
                          <option key={p.articleId} value={p.articleId}>
                            {displayProfileLabel(p.articleLabel)}
                            {p.family ? ` · ${p.family}` : ''}
                          </option>
                        ))
                      )}
                    </select>
                    {canEdit && selectedId ? (
                      <>
                        <button
                          type="button"
                          className="fm-refonte-btn fm-refonte-btn--sm"
                          onClick={addTier}
                        >
                          Ajouter palier
                        </button>
                        <button
                          type="button"
                          className="fm-refonte-btn fm-refonte-btn--sm fm-refonte-btn--primary"
                          disabled={tiersSaving}
                          onClick={() => void saveTiers()}
                        >
                          {tiersSaving ? 'Enregistrement…' : 'Enregistrer paliers'}
                        </button>
                      </>
                    ) : null}
                  </div>

                  <div className="fm-refonte-advanced__card">
                    <h3>Paliers, remises & marges</h3>
                    {(articleTiers?.variants?.length ?? 0) > 1 ? (
                      <label className="fm-refonte-field" style={{ display: 'block', marginBottom: 12 }}>
                        <span>Variante (format / matière / support)</span>
                        <select
                          className="fm-refonte-select"
                          value={selectedVariantKey}
                          onChange={(e) => selectTierVariant(e.target.value)}
                        >
                          {articleTiers!.variants.map((v) => (
                            <option key={v.variantKey || 'default'} value={v.variantKey}>
                              {v.variantLabel} ({v.tierCount} paliers)
                              {v.variantKey === '' ? ' — défaut' : ''}
                            </option>
                          ))}
                        </select>
                      </label>
                    ) : null}
                    {tiersLoading && draftRows.length === 0 ? (
                      <LoadingState message="Chargement des paliers…" size="sm" />
                    ) : !selectedId ? (
                      <div className="fm-refonte-empty">Sélectionnez un profil article.</div>
                    ) : draftRows.length === 0 ? (
                      <div className="fm-refonte-empty">
                        Aucun palier configuré — ajoutez une ligne pour démarrer.
                      </div>
                    ) : (
                      <ArticleTierTable
                        rows={draftRows}
                        tierMode="percent"
                        saleUnit={saleUnit}
                        prixBase={prixBase}
                        simulations={simulations}
                        canEdit={canEdit}
                        onRowsChange={setDraftRows}
                      />
                    )}
                  </div>

                  <div className="fm-refonte-advanced__card">
                    <h3>Constructeur de formules</h3>
                    {!selectedId ? (
                      <div className="fm-refonte-empty">Sélectionnez un profil article.</div>
                    ) : detailLoading ? (
                      <LoadingState message="Chargement de la formule…" size="sm" />
                    ) : !detail ? (
                      <ErrorState
                        message="Profil introuvable."
                        onRetry={() => selectedId && void loadDetail(selectedId)}
                      />
                    ) : (
                      <FormulaEditorCore
                        articleId={selectedId}
                        articleLabel={
                          selectedProfile?.articleLabel ??
                          detail.articleLabel ??
                          selectedId
                        }
                        family={family}
                        calculationType={detail.calculationType}
                        profileStatus={detail.status}
                        updatedAt={detail.updatedAt ?? selectedProfile?.updatedAt}
                        formulaVersions={detail.formulaVersions}
                        canEdit={canEdit}
                        showCanvasHead={false}
                        onSaved={() => {
                          void loadDetail(selectedId);
                          void loadProfiles();
                        }}
                        onPublished={() => {
                          void loadDetail(selectedId);
                          void loadProfiles();
                        }}
                      />
                    )}
                  </div>
                </>
              )}
            </div>
          </aside>
        </div>
      ) : null}
    </div>
  );
}

function EngineRows({
  engine,
  open,
  canEdit,
  coverage,
  syncLoaded,
  activeFlowStep,
  onSelectFlowStep,
  onToggleExpand,
  onToggleActive,
  onPatch,
  onEditEngine,
}: {
  engine: FmEngine;
  open: boolean;
  canEdit: boolean;
  coverage: FmEngineCoverage;
  syncLoaded: boolean;
  activeFlowStep: string | null;
  onSelectFlowStep: (code: string | null) => void;
  onToggleExpand: () => void;
  onToggleActive: () => void;
  onPatch: (patch: Partial<FmEngine>) => void;
  onEditEngine: () => void;
}) {
  return (
    <>
      <tr
        className={cn('fm-refonte-engine-row', open && 'is-open')}
        style={{ ['--accent' as string]: engine.color }}
        tabIndex={0}
        aria-expanded={open}
        onClick={onToggleExpand}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onToggleExpand();
          }
        }}
      >
        <td>
          <div className="fm-refonte-engine-main">
            <button
              type="button"
              className="fm-refonte-chevron"
              tabIndex={-1}
              aria-hidden
              onClick={(e) => {
                e.stopPropagation();
                onToggleExpand();
              }}
            >
              ›
            </button>
            <span className="fm-refonte-engine-accent" />
            <div>
              <b>{engine.name}</b>
              <small>
                {engine.items.slice(0, 3).join(' · ')}
                {engine.items.length > 3 ? '…' : ''}
                {syncLoaded ? (
                  <>
                    {' · '}
                    {coverage.profiles > 0
                      ? `${coverage.published}/${coverage.profiles} profils`
                      : 'hors sync'}
                  </>
                ) : null}
              </small>
            </div>
          </div>
        </td>
        <td>
          <span className="fm-refonte-cell-title">{engine.base}</span>
          <span className="fm-refonte-cell-sub">{engine.unit}</span>
        </td>
        <td style={{ minWidth: 260 }}>{engine.construction}</td>
        <td className="fm-refonte-mono">
          <b>{engine.margin} %</b>
        </td>
        <td className="fm-refonte-mono">{money(engine.minimum)}</td>
        <td className="fm-refonte-mono">{money(engine.round)}</td>
        <td>
          <span className="fm-refonte-badge fm-refonte-badge--neutral fm-refonte-badge--violet">
            {fmProfileLabel(engine.profile)}
          </span>
        </td>
        <td>
          <button
            type="button"
            className={cn(
              'fm-refonte-badge',
              engine.active ? 'fm-refonte-badge--ok' : 'fm-refonte-badge--block',
            )}
            disabled={!canEdit}
            onClick={(e) => {
              e.stopPropagation();
              onToggleActive();
            }}
          >
            {engine.active ? 'Actif' : 'Inactif'}
          </button>
        </td>
      </tr>
      {open ? (
        <tr
          className="fm-refonte-details-row"
          style={{ ['--accent' as string]: engine.color }}
        >
          <td colSpan={8}>
            <div className="fm-refonte-engine-detail">
              <div className="fm-refonte-flow-block">
                <EditableFlowSteps
                  hints={{
                    '90': `${engine.margin} %`,
                    '100': money(engine.minimum),
                    '110': money(engine.round),
                  }}
                  activeStep={activeFlowStep}
                  onSelect={onSelectFlowStep}
                  engineActive={engine.active}
                />
                {!activeFlowStep ? (
                  <p className="fm-refonte-flow-hint">
                    Cliquez une étape pour la modifier ici (majoration, minimum, arrondi…).
                  </p>
                ) : null}
              </div>
              <div className="fm-refonte-detail-rail">
                <aside className="fm-refonte-detail-side">
                  <header className="fm-refonte-detail-side__head">
                    <p className="fm-refonte-detail-side__eyebrow">Famille sélectionnée</p>
                    <h3>{engine.name}</h3>
                  </header>
                  <div className="fm-refonte-tokens">
                    {engine.items.map((item) => (
                      <span key={item} className="fm-refonte-token">
                        {item}
                      </span>
                    ))}
                  </div>
                  <dl className="fm-refonte-detail-specs">
                    <div>
                      <dt>Base</dt>
                      <dd>{engine.base}</dd>
                    </div>
                    <div>
                      <dt>Paramètres</dt>
                      <dd>
                        Marge {engine.margin}% · min. {money(engine.minimum)} · arrondi{' '}
                        {money(engine.round)}
                      </dd>
                    </div>
                    <div className="fm-refonte-detail-specs__full">
                      <dt>Construction</dt>
                      <dd>{engine.construction}</dd>
                    </div>
                    <div className="fm-refonte-detail-specs__full">
                      <dt>Sync DB</dt>
                      <dd>
                        {!syncLoaded
                          ? '…'
                          : coverage.profiles > 0
                            ? `${coverage.published} publiés / ${coverage.profiles} profils · ${coverage.families.slice(0, 4).join(', ')}${coverage.families.length > 4 ? '…' : ''}`
                            : 'aucune famille ArticlePricingProfile liée — vérifier aliases'}
                      </dd>
                    </div>
                  </dl>
                  {activeFlowStep ? (
                    <div
                      className="fm-refonte-flow-editor"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <EngineFlowStepEditor
                        step={activeFlowStep}
                        engine={engine}
                        canEdit={canEdit}
                        onPatch={onPatch}
                        onEditEngine={onEditEngine}
                      />
                    </div>
                  ) : null}
                </aside>
              </div>
            </div>
          </td>
        </tr>
      ) : null}
    </>
  );
}

const FLOW_EDITABLE_CODES = new Set(['10', '20', '30', '50', '80', '90', '110']);
/** Cartes masquées du parcours — logique métier conservée ailleurs. */
const FLOW_HIDDEN_CODES = new Set(['60', '100']);

const FLOW_STEP_HELP: Record<string, string> = {
  '10': 'Prix de référence + formule — personnalisable ici, sync auto vers le POS.',
  '20': 'Support / matière : une seule fois — lié au module Matières.',
  '30': 'Impression recto / R/V — paramètres de calcul (faces, formats).',
  '40': 'Fabrication et façonnage selon le type d’article.',
  '50': 'Finitions optionnelles — règles métier + options POS.',
  '60': 'Services annexes facultatifs.',
  '70': 'Quantité : dernier champ du parcours commercial (POS).',
  '80': 'Paliers de remise volume du profil article.',
  '90': 'Majoration / marge du moteur famille.',
  '100': 'Minimum facturable (protection prix).',
  '110': 'Le prix est arrondi au multiple supérieur de 50 ou 100 ariary.',
};

/** Liens croisés Admin ↔ POS — mise à jour auto après publication formule. */
function FlowModuleLinks({
  articleId,
  family,
  onOpenParameters,
  onOpenRules,
}: {
  articleId: string;
  family?: string | null;
  onOpenParameters?: () => void;
  onOpenRules?: () => void;
}) {
  const q = encodeURIComponent(articleId);
  const familyQ = family ? encodeURIComponent(family) : '';
  return (
    <div className="fm-refonte-linkstrip" aria-label="Modules liés">
      <span className="fm-refonte-linkstrip__label">Liés · sync auto</span>
      <Link
        href={`/pos/${q}`}
        className="fm-refonte-linkstrip__chip"
        title="Ouvrir la fiche POS (configurateur)"
      >
        Catalogue POS <ExternalLink size={11} aria-hidden />
      </Link>
      <Link
        href={`/administration/prix-articles`}
        className="fm-refonte-linkstrip__chip"
        title="Articles finis — prix de base & dispo"
      >
        Articles finis
      </Link>
      <Link
        href="/administration/catalogue-prix-stock?studio=matieres"
        className="fm-refonte-linkstrip__chip"
        title="Supports bruts (papier, vinyle…)"
      >
        Matières
      </Link>
      {onOpenParameters ? (
        <button type="button" className="fm-refonte-linkstrip__chip" onClick={onOpenParameters}>
          02 Paramètres
        </button>
      ) : null}
      {onOpenRules ? (
        <button type="button" className="fm-refonte-linkstrip__chip" onClick={onOpenRules}>
          03 Règles{familyQ ? ` · ${family}` : ''}
        </button>
      ) : null}
    </div>
  );
}

function EditableFlowSteps({
  hints,
  activeStep,
  onSelect,
  engineActive = true,
}: {
  hints: Partial<Record<string, string>>;
  activeStep: string | null;
  onSelect: (code: string | null) => void;
  engineActive?: boolean;
}) {
  return (
    <div className="fm-refonte-flow-panel">
      <div className="fm-refonte-flow-panel__head">
        <div className="fm-refonte-flow-panel__titles">
          <h4>Ordre de construction du prix</h4>
          <p>
            Cliquez une étape pour personnaliser. Les étapes marquées se synchronisent avec le POS,
            les matières et les paramètres.
          </p>
        </div>
        <span
          className={cn(
            'fm-refonte-flow-panel__status',
            !engineActive && 'is-off',
          )}
        >
          <i aria-hidden />
          {engineActive ? 'Moteur actif' : 'Moteur inactif'}
        </span>
      </div>

      <div className="fm-refonte-flow">
        {FM_FLOW_STEPS.filter((step) => !FLOW_HIDDEN_CODES.has(step.code)).map((step) => {
          const editable = FLOW_EDITABLE_CODES.has(step.code);
          const active = activeStep === step.code;
          return (
            <button
              key={step.code}
              type="button"
              data-step={step.code}
              className={cn(
                'fm-refonte-flow-step',
                active && 'is-active',
                editable && 'is-editable',
              )}
              aria-pressed={active}
              aria-label={`Étape ${step.code} ${step.label}${active ? ' (sélectionnée)' : ''}`}
              onClick={(e) => {
                e.stopPropagation();
                onSelect(active ? null : step.code);
              }}
            >
              <span className="fm-refonte-flow-step__body">
                <b>{step.label}</b>
                <span>{step.hint}</span>
                {hints[step.code] ? (
                  <small className="fm-refonte-flow-step__meta">{hints[step.code]}</small>
                ) : null}
              </span>
              <em className="fm-refonte-flow-step__code" aria-hidden>
                {step.code}
              </em>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function EngineFlowStepEditor({
  step,
  engine,
  canEdit,
  onPatch,
  onEditEngine,
}: {
  step: string;
  engine: FmEngine;
  canEdit: boolean;
  onPatch: (patch: Partial<FmEngine>) => void;
  onEditEngine: () => void;
}) {
  if (step === '90') {
    return (
      <FlowNumberField
        label="Majoration (%)"
        value={engine.margin}
        disabled={!canEdit}
        onChange={(n) => onPatch({ margin: n })}
      />
    );
  }
  if (step === '100') {
    return (
      <FlowNumberField
        label="Minimum facturable (Ar)"
        value={engine.minimum}
        step={50}
        disabled={!canEdit}
        onChange={(n) => onPatch({ minimum: n })}
      />
    );
  }
  if (step === '110') {
    return (
      <FlowNumberField
        label="Pas d’arrondi (Ar)"
        value={engine.round}
        step={50}
        min={1}
        disabled={!canEdit}
        onChange={(n) => onPatch({ round: n })}
      />
    );
  }
  return (
    <div className="fm-refonte-flow-editor__doc">
      <h4>
        {step} — {FM_FLOW_STEPS.find((s) => s.code === step)?.label}
      </h4>
      <p>{FLOW_STEP_HELP[step] ?? 'Étape du parcours commercial.'}</p>
      <p>
        Base : <b>{engine.base}</b> · Construction : <b>{engine.construction}</b>
      </p>
      {canEdit ? (
        <button type="button" className="fm-refonte-btn fm-refonte-btn--sm" onClick={onEditEngine}>
          Modifier la fiche moteur
        </button>
      ) : null}
    </div>
  );
}

function ArticleFlowStepEditor({
  step,
  article,
  fmEngine,
  canEdit,
  detail,
  detailLoading,
  tiersLoading,
  draftRows,
  setDraftRows,
  tierMode,
  saleUnit,
  prixBase,
  prixBaseSource,
  simulations,
  tiersSaving,
  variants = [],
  selectedVariantKey = '',
  onSelectVariant,
  onAddTier,
  onSaveTiers,
  onReloadDetail,
  onReloadProfiles,
  onPatchEngine,
  onOpenParameters,
  onOpenRules,
}: {
  step: string;
  article: ProfileRow;
  fmEngine: FmEngine | null | undefined;
  canEdit: boolean;
  detail: ProfileDetail | null;
  detailLoading: boolean;
  tiersLoading: boolean;
  draftRows: TierDraftRow[];
  setDraftRows: (rows: TierDraftRow[]) => void;
  tierMode: TierMode;
  saleUnit: string;
  prixBase: number | null;
  prixBaseSource?: string | null;
  simulations: ReturnType<typeof simulateTierLines>;
  tiersSaving: boolean;
  variants?: Array<{ variantKey: string; variantLabel: string; tierCount: number; listPrixBase?: number | null }>;
  selectedVariantKey?: string;
  onSelectVariant?: (variantKey: string) => void;
  onAddTier: () => void;
  onSaveTiers: () => void;
  onReloadDetail: () => void;
  onReloadProfiles: () => void;
  onPatchEngine?: (patch: Partial<FmEngine>) => void;
  onOpenParameters?: () => void;
  onOpenRules?: () => void;
}) {
  const [prixDraft, setPrixDraft] = useState(
    String(prixBase ?? article.prixBase ?? ''),
  );
  const [prixSaving, setPrixSaving] = useState(false);

  useEffect(() => {
    setPrixDraft(String(prixBase ?? article.prixBase ?? ''));
  }, [prixBase, article.prixBase, article.articleId]);

  const savePrixBase = async () => {
    if (!canEdit) return;
    const raw = prixDraft.trim();
    const next = raw === '' ? null : Number(raw);
    if (raw !== '' && (!Number.isFinite(next) || (next as number) < 0)) {
      uxToast.error('Prix base invalide');
      return;
    }
    setPrixSaving(true);
    try {
      const r = await fetch(`/api/dynamic-pricing/${encodeURIComponent(article.articleId)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ section: 'profile', prixBase: next }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(getApiErrorMessage(d, 'Enregistrement prix impossible'));
      uxToast.success('Prix base enregistré — sync Articles finis / POS au prochain publish');
      onReloadDetail();
      onReloadProfiles();
    } catch (e) {
      uxToast.error(e instanceof Error ? e.message : 'Erreur réseau');
    } finally {
      setPrixSaving(false);
    }
  };

  if (step === '10') {
    if (detailLoading) {
      return <LoadingState message="Chargement de la formule…" size="sm" />;
    }
    const versions = detail?.formulaVersions ?? article.formulaVersions ?? [];
    const published = versions.find((v) => v.status === 'published');
    const latest = versions[0];
    const shown = published ?? latest;
    const versionLabel = shown
      ? `v${shown.version}${shown.status === 'published' ? ' publiée' : ` · ${shown.status}`}`
      : 'aucune version';

    return (
      <div className="fm-refonte-flow-editor__doc fm-refonte-flow-editor__summary">
        <h4>10 — Prix source (personnalisable)</h4>
        <FlowModuleLinks
          articleId={article.articleId}
          family={article.family}
          onOpenParameters={onOpenParameters}
          onOpenRules={onOpenRules}
        />

        <div className="fm-refonte-prix-quick">
          <label className="fm-refonte-prix-quick__field">
            <span>Prix base (Ar)</span>
            <input
              type="number"
              min={0}
              step={50}
              inputMode="numeric"
              disabled={!canEdit || prixSaving}
              value={prixDraft}
              onChange={(e) => setPrixDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') void savePrixBase();
              }}
              placeholder="Ex. 15000"
            />
          </label>
          {canEdit ? (
            <button
              type="button"
              className="fm-refonte-btn fm-refonte-btn--sm fm-refonte-btn--primary"
              disabled={prixSaving}
              onClick={() => void savePrixBase()}
            >
              {prixSaving ? '…' : 'Enregistrer prix'}
            </button>
          ) : null}
          <div className="fm-refonte-prix-quick__meta">
            <span>
              Calcul : <b>{calculationLabelFr(article.calculationType)}</b>
            </span>
            <span>
              Formule : <b>{versionLabel}</b>
            </span>
            {prixBaseSource ? (
              <span>
                Source : <b>{prixBaseSource}</b>
              </span>
            ) : null}
            {fmEngine ? (
              <span>
                Moteur : <b>{fmEngine.name}</b>
              </span>
            ) : null}
            <span>
              Unité : <b>{article.saleUnit || saleUnit || 'pièce'}</b>
            </span>
          </div>
        </div>

        <p className="fm-refonte-flow-editor__lead">
          Formule simple : variables + opérateurs (<b>+</b>, <b>×</b>). Ex.{' '}
          <code>prixBase + options + marge%25</code>. « Appliquer / Publier » synchronise le
          Catalogue POS, les Articles finis et les paramètres liés.
        </p>
        <FormulaEditorCore
          articleId={article.articleId}
          articleLabel={article.articleLabel}
          family={article.family}
          calculationType={detail?.calculationType ?? article.calculationType}
          profileStatus={detail?.status ?? article.status}
          updatedAt={detail?.updatedAt ?? article.updatedAt}
          formulaVersions={
            (detail?.formulaVersions as
              | Array<{
                  version: number;
                  status: string;
                  expression?: string | null;
                  variables?: unknown;
                  label?: string | null;
                }>
              | undefined) ??
            (versions as Array<{
              version: number;
              status: string;
              expression?: string | null;
              variables?: unknown;
              label?: string | null;
            }>)
          }
          canEdit={canEdit}
          showCanvasHead={false}
          autoSyncPosOnActivate
          expressionEditorOpen
          onSaved={() => {
            onReloadDetail();
            onReloadProfiles();
          }}
          onPublished={() => {
            onReloadDetail();
            onReloadProfiles();
          }}
        />
      </div>
    );
  }

  if (step === '20') {
    return (
      <div className="fm-refonte-flow-editor__doc">
        <h4>20 — Support / matière</h4>
        <FlowModuleLinks
          articleId={article.articleId}
          family={article.family}
          onOpenParameters={onOpenParameters}
          onOpenRules={onOpenRules}
        />
        <p>
          La matière (papier intérieur, couverture, vinyle…) est facturée <b>une seule fois</b>.
          Pour livres / flyers complexes : choisissez les supports dans{' '}
          <Link href="/administration/catalogue-prix-stock?studio=matieres" className="underline">
            Matières
          </Link>
          . Les coûts se propagent au POS automatiquement après sync.
        </p>
        <p className="fm-refonte-flow-editor__lead">
          Article : <b>{displayProfileLabel(article.articleLabel)}</b>
          {fmEngine ? (
            <>
              {' · '}
              Construction : <b>{fmEngine.construction}</b>
            </>
          ) : null}
        </p>
        <div className="fm-refonte-flow-editor__actions">
          <Link
            href="/administration/catalogue-prix-stock?studio=matieres"
            className="fm-refonte-btn fm-refonte-btn--sm fm-refonte-btn--primary"
          >
            Ouvrir Matières
          </Link>
          <Link href={`/pos/${encodeURIComponent(article.articleId)}`} className="fm-refonte-btn fm-refonte-btn--sm">
            Tester dans le POS
          </Link>
        </div>
      </div>
    );
  }

  if (step === '30') {
    return (
      <div className="fm-refonte-flow-editor__doc">
        <h4>30 — Impression (faces & formats)</h4>
        <FlowModuleLinks
          articleId={article.articleId}
          family={article.family}
          onOpenParameters={onOpenParameters}
          onOpenRules={onOpenRules}
        />
        <p>
          Recto / recto-verso, formats papier et coefficients viennent des{' '}
          <b>Paramètres de calcul</b> (onglet 02) — une seule source pour tous les articles.
        </p>
        <div className="fm-refonte-flow-editor__actions">
          {onOpenParameters ? (
            <button
              type="button"
              className="fm-refonte-btn fm-refonte-btn--sm fm-refonte-btn--primary"
              onClick={onOpenParameters}
            >
              Ouvrir paramètres de calcul
            </button>
          ) : null}
          <Link
            href="/administration/parametres-formats-papier"
            className="fm-refonte-btn fm-refonte-btn--sm"
          >
            Formats papier & faces
          </Link>
        </div>
      </div>
    );
  }

  if (step === '50') {
    return (
      <div className="fm-refonte-flow-editor__doc">
        <h4>50 — Finitions</h4>
        <FlowModuleLinks
          articleId={article.articleId}
          family={article.family}
          onOpenParameters={onOpenParameters}
          onOpenRules={onOpenRules}
        />
        <p>
          Les finitions (pelliculage, vernis…) s’ajoutent seulement si choisies au POS. Les
          compatibilités sont dans les <b>Règles métier</b> (onglet 03).
        </p>
        <div className="fm-refonte-flow-editor__actions">
          {onOpenRules ? (
            <button
              type="button"
              className="fm-refonte-btn fm-refonte-btn--sm fm-refonte-btn--primary"
              onClick={onOpenRules}
            >
              Voir règles de la famille
            </button>
          ) : null}
          <Link href={`/pos/${encodeURIComponent(article.articleId)}`} className="fm-refonte-btn fm-refonte-btn--sm">
            Configurer finitions POS
          </Link>
        </div>
      </div>
    );
  }

  if (step === '80') {
    return (
      <div className="fm-refonte-flow-editor__tiers">
        <div className="fm-refonte-flow-editor__tiers-head">
          <h4>80 — Paliers de remise</h4>
          {canEdit ? (
            <div className="fm-refonte-flow-editor__actions">
              <button
                type="button"
                className="fm-refonte-btn fm-refonte-btn--sm"
                onClick={onAddTier}
              >
                Ajouter palier
              </button>
              <button
                type="button"
                className="fm-refonte-btn fm-refonte-btn--sm fm-refonte-btn--primary"
                disabled={tiersSaving}
                onClick={onSaveTiers}
              >
                {tiersSaving ? 'Enregistrement…' : 'Enregistrer paliers'}
              </button>
            </div>
          ) : null}
        </div>
        <FlowModuleLinks
          articleId={article.articleId}
          family={article.family}
          onOpenParameters={onOpenParameters}
          onOpenRules={onOpenRules}
        />
        <p className="fm-refonte-flow-editor__lead">
          Remises % par quantité — appliquées après le prix source. Sync POS à l’enregistrement.
        </p>
        {variants.length > 1 && onSelectVariant ? (
          <label className="fm-refonte-field" style={{ display: 'block', marginBottom: 12 }}>
            <span>Variante (format / matière / support)</span>
            <select
              className="fm-refonte-select"
              value={selectedVariantKey}
              onChange={(e) => onSelectVariant(e.target.value)}
            >
              {variants.map((v) => (
                <option key={v.variantKey || 'default'} value={v.variantKey}>
                  {v.variantLabel} ({v.tierCount} paliers)
                  {v.variantKey === '' ? ' — défaut' : ''}
                </option>
              ))}
            </select>
          </label>
        ) : null}
        {tiersLoading && draftRows.length === 0 ? (
          <LoadingState message="Chargement des paliers…" size="sm" />
        ) : draftRows.length === 0 ? (
          <div className="fm-refonte-empty">
            Aucun palier — ajoutez une ligne pour démarrer.
          </div>
        ) : (
          <ArticleTierTable
            rows={draftRows}
            tierMode="percent"
            saleUnit={saleUnit}
            prixBase={prixBase}
            simulations={simulations}
            canEdit={canEdit}
            onRowsChange={setDraftRows}
          />
        )}
      </div>
    );
  }

  if (step === '90' || step === '100' || step === '110') {
    if (!fmEngine || !onPatchEngine) {
      return (
        <div className="fm-refonte-flow-editor__doc">
          <h4>
            {step} — {FM_FLOW_STEPS.find((s) => s.code === step)?.label}
          </h4>
          <p>
            Aucun moteur famille lié à cet article — majoration / minimum / arrondi
            indisponibles.
          </p>
        </div>
      );
    }
    if (step === '90') {
      return (
        <div className="fm-refonte-flow-editor__doc">
          <FlowModuleLinks
            articleId={article.articleId}
            family={article.family}
            onOpenParameters={onOpenParameters}
            onOpenRules={onOpenRules}
          />
          <FlowNumberField
            label="Majoration moteur (%)"
            value={fmEngine.margin}
            disabled={!canEdit}
            onChange={(n) => onPatchEngine({ margin: n })}
          />
        </div>
      );
    }
    if (step === '100') {
      return (
        <FlowNumberField
          label="Minimum facturable (Ar)"
          value={fmEngine.minimum}
          step={50}
          disabled={!canEdit}
          onChange={(n) => onPatchEngine({ minimum: n })}
        />
      );
    }
    return (
      <div className="fm-refonte-flow-editor__doc">
        <FlowModuleLinks
          articleId={article.articleId}
          family={article.family}
          onOpenParameters={onOpenParameters}
          onOpenRules={onOpenRules}
        />
        <FlowNumberField
          label="Pas d’arrondi (Ar)"
          value={fmEngine.round}
          step={50}
          min={1}
          disabled={!canEdit}
          onChange={(n) => onPatchEngine({ round: n })}
        />
      </div>
    );
  }

  return (
    <div className="fm-refonte-flow-editor__doc">
      <h4>
        {step} — {FM_FLOW_STEPS.find((s) => s.code === step)?.label}
      </h4>
      <FlowModuleLinks
        articleId={article.articleId}
        family={article.family}
        onOpenParameters={onOpenParameters}
        onOpenRules={onOpenRules}
      />
      <p>{FLOW_STEP_HELP[step] ?? 'Étape du parcours commercial.'}</p>
      <p>
        Article : <b>{displayProfileLabel(article.articleLabel)}</b>
        {fmEngine ? (
          <>
            {' · '}
            Moteur : <b>{fmEngine.name}</b>
          </>
        ) : null}
      </p>
    </div>
  );
}

function FlowNumberField({
  label,
  value,
  onChange,
  disabled,
  step = 1,
  min = 0,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
  disabled?: boolean;
  step?: number;
  min?: number;
}) {
  return (
    <div className="fm-refonte-flow-editor__field">
      <label>
        <span>{label}</span>
        <input
          type="number"
          min={min}
          step={step}
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(Number(e.target.value) || 0)}
        />
      </label>
      <p className="fm-refonte-flow-editor__lead">
        Modification enregistrée immédiatement sur le moteur (session + stockage local).
      </p>
    </div>
  );
}
