"use client";

/**
 * Module unique Administration — Catalogue, Prix & Stock.
 * Shell : 6 domaines visibles (Ultra-Prompt §3) ; studios alias masqués + deep-links.
 * Données / formules / APIs métier inchangées.
 */
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { uxToast } from "@/lib/ux/feedback";
import {
  AdminCatalogueShell,
  AdminHeader,
  AnomalyCenter,
  CockpitStudio,
  EntityDrawer,
  ExcelManager,
  MaterialStockStudio,
  PillTabs,
  PricingCalculsStudio,
  OptionsFinitionsHealthStrip,
  CpsStudioFrame,
  type KpiId,
  type SyncBadgeStatus,
} from "@/components/admin/catalogue-prix-stock";
import { AppButton } from "@/components/ui/app-ui";
import {
  canonicalizeStudio,
  studioToDefaultTab,
  tabToStudio,
  type CatalogStudioId,
} from "@/components/admin/catalogue-prix-stock/CatalogStudioNav";
import { AdminHistoriquePlaceholder } from "@/components/admin/AdminHistoriquePlaceholder";
import "@/components/backoffice-v2/admin-backoffice.css";

export type CataloguePrixStockTab =
  | "vue"
  | "articles"
  | "chips"
  | "catalogue"
  | "categories"
  | "matieres"
  | "prix-contexte"
  | "stock"
  | "isf"
  | "flyers"
  | "carterie"
  | "publications"
  | "grand-format"
  | "avd"
  | "finitions"
  | "dependencies"
  | "paliers"
  | "regles"
  | "overview"
  | "engines"
  | "formulas"
  | "simulation"
  | "versions"
  | "excel"
  | "anomalies"
  | "corbeille"
  | "historique";

const MATIERES_SUBTABS: { id: CataloguePrixStockTab; label: string }[] = [
  { id: "matieres", label: "Matières" },
  { id: "prix-contexte", label: "Prix contexte" },
  { id: "stock", label: "Stock & Achats" },
];

/** @deprecated Grille unifiée — plus de PillTabs matières (Ultra-Prompt T3). */
void MATIERES_SUBTABS;

/** Sous-onglets Options & finitions — absorbés par le Studio Prix (nav 5). */
const FINITIONS_SUBTABS: { id: CataloguePrixStockTab; label: string }[] = [
  { id: "chips", label: "Bibliothèque options" },
  { id: "finitions", label: "Finitions & façonnage" },
  { id: "dependencies", label: "Conditions & dépendances" },
];

/** Conservé pour docs / deep-links familles — navigation principale = PricingFamilyCards. */
const PRIX_SUBTABS: { id: CataloguePrixStockTab; label: string }[] = [
  { id: "articles", label: "Produits" },
  { id: "isf", label: "Petit format" },
  { id: "flyers", label: "Flyers" },
  { id: "carterie", label: "Carterie" },
  { id: "publications", label: "Publications" },
  { id: "grand-format", label: "Grand format" },
  { id: "avd", label: "Vente directe" },
  { id: "paliers", label: "Paliers" },
  { id: "regles", label: "Formules & règles" },
];

void PRIX_SUBTABS;

/** Sous-onglets Données & contrôle (domaine 6) — fusion import + diagnostics + audit. */
const DONNEES_SUBTABS: { id: CataloguePrixStockTab; label: string }[] = [
  { id: "excel", label: "Import / Export" },
  { id: "anomalies", label: "Diagnostics" },
  { id: "historique", label: "Historique" },
  { id: "corbeille", label: "Corbeille" },
];

const ARTICLE_TABS = new Set<CataloguePrixStockTab>([
  "articles",
  "catalogue",
  "categories",
]);

function resolveTab(raw: string | null): CataloguePrixStockTab {
  // Défaut CPS = matières (Vue d’ensemble = sidebar Macro)
  if (!raw) return "matieres";
  if (
    raw === "catalogue" ||
    raw === "categories" ||
    raw === "pos" ||
    raw === "options"
  ) {
    return "articles";
  }
  if (raw === "formulas" || raw === "formule") return "regles";
  /* Simulation / Versions : plus d’UI métier → Tarifs par article */
  if (raw === "sim" || raw === "simulateur" || raw === "simulation") return "articles";
  if (raw === "versions" || raw === "version") return "articles";
  if (raw === "bibliotheque" || raw === "options-lib") return "chips";
  if (raw === "prix-base") return "matieres";
  const known: CataloguePrixStockTab[] = [
    "vue",
    "overview",
    "engines",
    "formulas",
    "simulation",
    "versions",
    "articles",
    "chips",
    "matieres",
    "prix-contexte",
    "stock",
    "isf",
    "flyers",
    "carterie",
    "publications",
    "grand-format",
    "avd",
    "finitions",
    "dependencies",
    "paliers",
    "regles",
    "excel",
    "anomalies",
    "corbeille",
    "historique",
  ];
  if (known.includes(raw as CataloguePrixStockTab))
    return raw as CataloguePrixStockTab;
  // Défaut CPS = matières (Vue d’ensemble vit dans la sidebar Admin)
  return "matieres";
}

const STUDIO_TABS: Record<CatalogStudioId, CataloguePrixStockTab[]> = {
  cockpit: ["vue", "anomalies"],
  articles: ["articles", "catalogue", "categories"],
  matieres: ["matieres"],
  prix: [
    "articles",
    "catalogue",
    "categories",
    "paliers",
    "anomalies",
    "chips",
    "finitions",
    "dependencies",
  ],
  calculs: [
    "engines",
    "regles",
    "formulas",
    "overview",
    "paliers",
    "articles",
    "isf",
    "flyers",
    "carterie",
    "publications",
    "grand-format",
    "avd",
  ],
  finitions: ["chips", "finitions"],
  excel: ["excel", "anomalies", "historique", "corbeille"],
  anomalies: ["anomalies"],
  historique: ["historique", "corbeille"],
};

function resolveStudio(
  studioRaw: string | null,
  tab: CataloguePrixStockTab,
): CatalogStudioId {
  const valid: Array<CatalogStudioId | string> = [
    "cockpit",
    "articles",
    "matieres",
    "prix",
    "calculs",
    "engines",
    "formulas",
    "finitions",
    "excel",
    "anomalies",
    "historique",
  ];
  if (studioRaw && valid.includes(studioRaw)) {
    return canonicalizeStudio(studioRaw);
  }
  return canonicalizeStudio(tabToStudio(tab));
}

/** Si studio explicite + tab hors studio → tab coerced (évite PillTabs vide / mauvais panneau). */
function alignTabToStudio(
  tab: CataloguePrixStockTab,
  studio: CatalogStudioId,
): CataloguePrixStockTab {
  const allowed = STUDIO_TABS[studio];
  if (allowed.includes(tab)) return tab;
  return (studioToDefaultTab(studio) as CataloguePrixStockTab) || allowed[0];
}

const Loading = () => (
  <div
    className="space-y-3 p-6"
    role="status"
    aria-busy="true"
    aria-label="Chargement du studio"
  >
    <div className="cps-skeleton h-8 w-48" />
    <div className="cps-skeleton h-4 w-full max-w-xl" />
    <div className="cps-skeleton h-40 w-full" />
  </div>
);

const PrixMatieresStockWorkspace = dynamic(
  () =>
    import("@/components/administration/prix-matieres-stock/PrixMatieresStockWorkspace").then(
      (m) => m.PrixMatieresStockWorkspace,
    ),
  { loading: Loading, ssr: false },
);

const CataloguePosUnifiedWorkspace = dynamic(
  () =>
    import("@/components/administration/catalogue/CataloguePosUnifiedWorkspace").then(
      (m) => m.CataloguePosUnifiedWorkspace,
    ),
  { loading: Loading, ssr: false },
);

const PricingArticlesWorkspace = dynamic(
  () =>
    import("@/components/admin/pricing-v4/pricing-articles-workspace").then(
      (m) => m.PricingArticlesWorkspace,
    ),
  { loading: Loading, ssr: false },
);

const OptionsChipsWorkspace = dynamic(
  () =>
    import("@/components/backoffice-v2/options/OptionsChipsWorkspace").then(
      (m) => m.OptionsChipsWorkspace,
    ),
  { loading: Loading, ssr: false },
);

const MaterialsCorbeilleTable = dynamic(
  () =>
    import("@/components/administration/materials/MaterialsCorbeilleTable").then(
      (m) => m.MaterialsCorbeilleTable,
    ),
  { loading: Loading, ssr: false },
);

const TiersByArticleWorkspace = dynamic(
  () =>
    import("@/components/backoffice-v2/pricing-tiers/TiersByArticleWorkspace").then(
      (m) => m.TiersByArticleWorkspace,
    ),
  { loading: Loading, ssr: false },
);

/** Articles domaine : Tarifs | Paliers de remise (DiscountTiers). */
const ARTICLES_PILLS: { id: CataloguePrixStockTab; label: string }[] = [
  { id: "articles", label: "Tarifs" },
  { id: "paliers", label: "Paliers de remise" },
];

type Kpis = {
  articlesPos: number | string;
  optionsActives: number | string;
  matieres: number | string;
  prixManquants: number | string;
  anomalies: number | string;
  doublons: number | string;
  stockFaible?: number | string;
  finitions?: number | string;
};

type CockpitPriority = {
  id: string;
  label: string;
  count: number;
  href: string;
};

function useCanEdit() {
  const { data: session } = useSession();
  const role = (session?.user as { role?: string } | undefined)?.role;
  return role === "admin" || role === "manager" || role === "direction";
}

export function CataloguePrixStockWorkspace() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const canEdit = useCanEdit();
  const studio = resolveStudio(
    searchParams.get("studio"),
    resolveTab(searchParams.get("tab")),
  );
  const tab = alignTabToStudio(resolveTab(searchParams.get("tab")), studio);
  const [syncing, setSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<SyncBadgeStatus>("pending");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [materialCreateToken, setMaterialCreateToken] = useState(0);
  const [articleCreateToken, setArticleCreateToken] = useState(0);
  const [activeKpi, setActiveKpi] = useState<KpiId | null>(null);
  const [kpis, setKpis] = useState<Kpis>({
    articlesPos: "—",
    optionsActives: "—",
    matieres: "—",
    prixManquants: "—",
    anomalies: "—",
    doublons: "—",
  });
  const [priorities, setPriorities] = useState<CockpitPriority[]>([]);
  const [kpisLoaded, setKpisLoaded] = useState(false);

  // Normalise aliases + aligne studio/tab dans l’URL (évite états incohérents)
  useEffect(() => {
    const rawTab = searchParams.get("tab");
    const rawStudio = searchParams.get("studio");
    const params = new URLSearchParams(searchParams.toString());
    let dirty = false;

    // Vue d’ensemble CPS → sidebar Administration (fusion DOMAINES → Macro)
    const isCockpitOverview =
      rawTab === "vue"
      || (rawStudio === "cockpit" && rawTab !== "anomalies")
      || ((rawStudio === "prix" || !rawStudio) && rawTab === "overview");
    if (isCockpitOverview) {
      router.replace("/administration/vue-ensemble");
      return;
    }

    // Formules / moteurs → domaine calculs (fusion)
    // Articles & tarifs masqué → calculs ; ISF / Impression sans finition → engines (table masquée)
    if (rawTab === "isf" || (rawStudio === "prix" && rawTab === "isf")) {
      params.set("studio", "calculs");
      params.set("tab", "engines");
      dirty = true;
      router.replace(`/administration/catalogue-prix-stock?${params.toString()}`, {
        scroll: false,
      });
      return;
    }

    const isArticlesLegacy =
      rawStudio === "prix"
      || rawStudio === "articles"
      || rawTab === "paliers"
      || rawTab === "articles";
    const isCalculsDeepLink =
      rawStudio === "engines"
      || rawStudio === "formulas"
      || rawStudio === "calculs"
      || rawTab === "engines"
      || rawTab === "formulas"
      || rawTab === "regles"
      || (rawStudio === "prix"
        && (rawTab === "engines"
          || rawTab === "regles"
          || rawTab === "formulas"
          || rawTab === "flyers"
          || rawTab === "carterie"
          || rawTab === "publications"
          || rawTab === "grand-format"
          || rawTab === "avd"));

    if (isArticlesLegacy && !isCalculsDeepLink) {
      params.set("studio", "calculs");
      params.set("tab", "engines");
      dirty = true;
      router.replace(`/administration/catalogue-prix-stock?${params.toString()}`, {
        scroll: false,
      });
      return;
    }

    if (isCalculsDeepLink && rawStudio !== "calculs") {
      const calcTab =
        rawTab === "regles" || rawTab === "formulas"
          ? "regles"
          : rawTab === "engines" || !rawTab
            ? "engines"
            : rawTab;
      params.set("studio", "calculs");
      params.set("tab", calcTab);
      dirty = true;
      router.replace(`/administration/catalogue-prix-stock?${params.toString()}`, {
        scroll: false,
      });
      return;
    }

    /** Données & contrôle masqué — alias → Matières (Import/Export reste dans l’en-tête). */
    const isDonneesControle =
      rawStudio === "excel"
      || rawStudio === "historique"
      || rawStudio === "anomalies"
      || rawTab === "excel"
      || rawTab === "historique"
      || rawTab === "corbeille"
      || (rawTab === "anomalies" && (rawStudio === "excel" || rawStudio === "prix" || !rawStudio));

    if (isDonneesControle) {
      params.set("studio", "matieres");
      params.set("tab", "matieres");
      dirty = true;
      router.replace(`/administration/catalogue-prix-stock?${params.toString()}`, {
        scroll: false,
      });
      return;
    }

    if (
      rawTab === "catalogue" ||
      rawTab === "categories" ||
      rawTab === "pos"
    ) {
      params.set("tab", "articles");
      params.set("studio", "articles");
      dirty = true;
    } else if (rawTab === "options") {
      // Alias « options » → Options & dépendances du Studio Prix (pas bibliothèque)
      params.set("tab", "dependencies");
      params.set("studio", "prix");
      dirty = true;
    } else if (
      rawTab === "chips"
      || rawTab === "bibliotheque"
      || rawTab === "options-lib"
    ) {
      params.set("tab", "finitions");
      params.set("studio", "finitions");
      dirty = true;
    } else if (
      rawTab === "simulation"
      || rawTab === "sim"
      || rawTab === "simulateur"
      || rawTab === "versions"
      || rawTab === "version"
    ) {
      params.set("tab", "articles");
      params.set("studio", "prix");
      dirty = true;
    } else if (rawTab === "finitions" && (rawStudio === "prix" || !rawStudio)) {
      params.set("tab", "finitions");
      params.set("studio", "finitions");
      dirty = true;
    } else if (rawTab === "dependencies" && !rawStudio) {
      // Options & dépendances = vue du Studio Prix (refonte premium)
      params.set("tab", "dependencies");
      params.set("studio", "prix");
      dirty = true;
    } else if (rawTab === "prix-contexte" || rawTab === "stock") {
      // Anciennes sous-vues → table maîtresse unique (sans param view legacy)
      params.set("tab", "matieres");
      params.set("studio", "matieres");
      params.delete("view");
      dirty = true;
    } else if (rawStudio === "anomalies" || rawStudio === "historique" || rawStudio === "excel") {
      // Alias masqués → Matières (zéro suppression route)
      params.set("studio", "matieres");
      params.set("tab", "matieres");
      dirty = true;
    } else {
      const resolvedTab = resolveTab(rawTab);
      const resolvedStudio = resolveStudio(rawStudio, resolvedTab);
      const aligned = alignTabToStudio(resolvedTab, resolvedStudio);
      if (!rawStudio || rawStudio !== resolvedStudio) {
        params.set("studio", resolvedStudio);
        dirty = true;
      }
      if (
        rawStudio &&
        STUDIO_TABS[resolvedStudio] &&
        !STUDIO_TABS[resolvedStudio].includes(resolvedTab)
      ) {
        params.set("tab", aligned);
        params.set("studio", resolvedStudio);
        dirty = true;
      }
      if (!rawTab && resolvedStudio === "cockpit") {
        router.replace("/administration/vue-ensemble");
        return;
      }
    }

    if (dirty) {
      const next = params.toString();
      if (next !== searchParams.toString()) {
        router.replace(`/administration/catalogue-prix-stock?${next}`, {
          scroll: false,
        });
      }
    }
  }, [searchParams, router]);

  const navigate = useCallback(
    (
      nextTab: CataloguePrixStockTab,
      nextStudio?: CatalogStudioId,
      nextView?: string | null,
    ) => {
      const s = canonicalizeStudio(
        nextStudio ?? tabToStudio(resolveTab(nextTab)),
      );
      const resolved = alignTabToStudio(resolveTab(nextTab), s);
      const params = new URLSearchParams(searchParams.toString());
      params.set("tab", resolved);
      params.set("studio", s);

      if (
        !ARTICLE_TABS.has(resolved) &&
        resolved !== "chips" &&
        resolved !== "anomalies"
      ) {
        params.delete("article");
        params.delete("nav");
        params.delete("action");
        if (
          resolved !== "matieres" &&
          resolved !== "stock" &&
          resolved !== "corbeille"
        ) {
          params.delete("view");
        }
      }
      if (resolved === "articles") {
        params.set("view", "catalogue");
        params.delete("action");
      }
      if (resolved === "anomalies") {
        params.set("view", "anomalies");
        params.set("action", "detect-duplicates");
      }
      if (resolved === "corbeille") params.set("view", "corbeille");
      if (resolved === "historique") params.set("view", "historique");
      if (resolved === "matieres") {
        params.delete("view");
      }

      router.push(
        `/administration/catalogue-prix-stock?${params.toString()}`,
        { scroll: false },
      );
    },
    [router, searchParams],
  );

  const setTab = (id: CataloguePrixStockTab) => navigate(id, studio);
  const setStudio = (id: CatalogStudioId) => {
    const canonical = canonicalizeStudio(id);
    const defaultTab =
      id === "historique"
        ? ("historique" as CataloguePrixStockTab)
        : (studioToDefaultTab(canonical) as CataloguePrixStockTab);
    navigate(defaultTab, canonical);
  };

  const loadKpis = useCallback(async (opts?: { withDuplicates?: boolean }) => {
    try {
      const withDup = Boolean(opts?.withDuplicates);
      const cockpitRes = await fetch("/api/admin/catalogue/cockpit", {
        cache: "no-store",
      });
      if (cockpitRes.ok) {
        const body = await cockpitRes.json();
        const d = body?.data ?? {};
        setKpis((prev) => ({
          articlesPos: d.articlesPos ?? 0,
          optionsActives: d.optionsActives ?? prev.optionsActives,
          matieres: d.matieres ?? 0,
          prixManquants: d.prixManquants ?? d.matieresSansPrix ?? 0,
          anomalies: d.anomalies ?? 0,
          doublons: prev.doublons === "—" ? 0 : prev.doublons,
          stockFaible: d.stockFaible ?? 0,
          finitions: d.finitions ?? 0,
        }));
        if (Array.isArray(d.priorities)) {
          setPriorities(
            d.priorities.filter(
              (p: CockpitPriority) =>
                p && typeof p.count === "number" && p.count > 0,
            ),
          );
        }
      }

      const chipsPromise = fetch(
        "/api/admin-backoffice/options/chips?limit=1",
        { cache: "no-store" },
      ).catch(() => null);
      const dupPromise = withDup
        ? fetch("/api/admin-backoffice/catalogue-pos/import-excel", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "detect-duplicates" }),
          }).catch(() => null)
        : Promise.resolve(null);

      const [dupRes, chipsRes] = await Promise.all([dupPromise, chipsPromise]);
      const dup = dupRes?.ok ? await dupRes.json() : null;
      const chips = chipsRes?.ok ? await chipsRes.json() : null;
      setKpis((prev) => ({
        ...prev,
        optionsActives:
          chips?.data?.counts?.active ??
          chips?.data?.total ??
          prev.optionsActives ??
          0,
        doublons: withDup ? (dup?.data?.critical ?? 0) : prev.doublons,
      }));
      setKpisLoaded(true);
    } catch {
      setKpisLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (kpisLoaded) return;
    void loadKpis({ withDuplicates: true });
  }, [loadKpis, kpisLoaded]);

  /** Statut sync honnête au chargement — jamais « synced » par défaut. */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch("/api/admin-backoffice/sync-diagnostics", {
          cache: "no-store",
        });
        if (!r.ok || cancelled) return;
        const d = await r.json();
        const summary = d.summary ?? {};
        const driftVerified = summary.driftVerified !== false && summary.driftScore != null;
        const driftScore = driftVerified ? Number(summary.driftScore) : null;
        const hasError = Array.isArray(d.diagnostics)
          ? d.diagnostics.some(
              (x: { status?: string }) => x.status === "error",
            )
          : false;
        const hasUnknown = Array.isArray(d.diagnostics)
          ? d.diagnostics.some(
              (x: { status?: string }) => x.status === "unknown",
            )
          : false;
        if (cancelled) return;
        if (hasError || (driftScore != null && driftScore >= 40)) setSyncStatus("error");
        else if (!driftVerified || hasUnknown || summary.posSyncRecommended || (driftScore != null && driftScore > 0))
          setSyncStatus("pending");
        else setSyncStatus("synced");
      } catch {
        if (!cancelled) setSyncStatus("pending");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function syncPos() {
    if (!canEdit) return;
    setSyncing(true);
    setSyncStatus("pending");
    try {
      // Sync complète catalogue + matières (pas le stub backoffice/sync uniquement)
      const r = await fetch("/api/admin-backoffice/pricing/sync-pos", {
        method: "POST",
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok || !d.ok) {
        setSyncStatus("error");
        throw new Error(
          d?.error?.message ?? d?.error ?? `Sync POS échouée (${r.status})`,
        );
      }
      const catalogOk = d.data?.catalog?.ok !== false;
      const materialsOk = d.data?.materials?.ok !== false;
      if (!catalogOk || !materialsOk) {
        setSyncStatus("error");
        const parts = [
          !catalogOk ? "catalogue" : null,
          !materialsOk ? "matières" : null,
        ].filter(Boolean);
        throw new Error(
          `Sync partielle échouée (${parts.join(", ")}) — le POS n’est pas marqué synchronisé.`,
        );
      }
      uxToast.success(
        d.data?.message ?? "Catalogue + matières synchronisés vers le POS",
      );
      setSyncStatus("synced");
      await loadKpis();
    } catch (e) {
      setSyncStatus("error");
      uxToast.error(e instanceof Error ? e.message : "Sync POS impossible");
    } finally {
      setSyncing(false);
    }
  }

  function goExcel(mode: "export" | "import" | "template") {
    if (mode === "template") {
      void fetch(
        "/api/admin-backoffice/pricing/prix-matieres-stock/export-excel?template=1",
      )
        .then(async (r) => {
          if (!r.ok) throw new Error("Modèle indisponible");
          const blob = await r.blob();
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = `modele-catalogue-prix-stock.xlsx`;
          a.click();
          URL.revokeObjectURL(url);
          uxToast.success("Modèle Excel téléchargé");
        })
        .catch(() => uxToast.error("Modèle Excel indisponible"));
      return;
    }
    if (mode === "export") {
      /* Export multi-feuilles legacy (audit complet) — pas le format tableau matières. */
      void fetch(
        "/api/admin-backoffice/pricing/prix-matieres-stock/export-excel",
      )
        .then(async (r) => {
          if (!r.ok) throw new Error("Export indisponible");
          const blob = await r.blob();
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = `catalogue-prix-stock-${new Date().toISOString().slice(0, 10)}.xlsx`;
          a.click();
          URL.revokeObjectURL(url);
          uxToast.success("Export Excel lancé");
        })
        .catch(() => uxToast.error("Export Excel indisponible"));
      return;
    }
    uxToast.info(
      "Utilisez Importer dans le studio Matières, Options/Chips ou Catalogue pour le bon format Excel.",
    );
  }

  /** Export Excel Matières — via pont ExcelTableActions (prépare IDs + colonnes tableau). */
  const exportMatieresTable = useCallback(() => {
    window.dispatchEvent(new CustomEvent("orion-matieres-excel-export"));
  }, []);

  const importMatieresTable = useCallback(() => {
    window.dispatchEvent(new CustomEvent("orion-matieres-excel-import"));
  }, []);

  const importChipsTable = useCallback(() => {
    window.dispatchEvent(new CustomEvent("orion-chips-excel-import"));
  }, []);

  const exportChipsTable = useCallback(() => {
    window.dispatchEvent(new CustomEvent("orion-chips-excel-export"));
  }, []);

  const importCatalogueTable = useCallback(() => {
    window.dispatchEvent(new CustomEvent("orion-catalogue-excel-import"));
  }, []);

  const exportCatalogueTable = useCallback(() => {
    window.dispatchEvent(new CustomEvent("orion-catalogue-excel-export"));
  }, []);

  const onKpiSelect = (id: KpiId) => {
    setActiveKpi(id);
    if (id === "articles") navigate("articles", "articles");
    else if (id === "options") navigate("finitions", "finitions");
    else if (id === "matieres" || id === "missing-prices")
      navigate("matieres", "matieres");
    else if (id === "anomalies" || id === "doublons")
      navigate("matieres", "matieres");
  };

  const kpiItems = useMemo(
    () => [
      {
        id: "articles" as const,
        label: "Articles POS",
        value: kpis.articlesPos,
      },
      {
        id: "options" as const,
        label: "Options / Chips",
        value: kpis.optionsActives,
      },
      {
        id: "matieres" as const,
        label: "Matières actives",
        value: kpis.matieres,
      },
      {
        id: "missing-prices" as const,
        label: "Prix manquants",
        value: kpis.prixManquants,
        tone:
          Number(kpis.prixManquants) > 0
            ? ("warn" as const)
            : ("default" as const),
        hint: Number(kpis.prixManquants) > 0 ? "À configurer" : undefined,
      },
      {
        id: "anomalies" as const,
        label: "Anomalies",
        value: kpis.anomalies,
        tone:
          Number(kpis.anomalies) > 0
            ? ("danger" as const)
            : ("default" as const),
      },
      {
        id: "doublons" as const,
        label: "Doublons",
        value: kpis.doublons,
        tone:
          Number(kpis.doublons) > 0 ? ("warn" as const) : ("default" as const),
      },
    ],
    [kpis],
  );

  const prixForced =
    tab === "flyers" ||
    tab === "carterie" ||
    tab === "publications" ||
    tab === "grand-format" ||
    tab === "avd"
      ? tab
      : null;

  const finitionsTab =
    tab === "chips" || tab === "finitions" || tab === "dependencies";

  const subTabs =
    studio === "excel"
      ? DONNEES_SUBTABS
      : studio === "finitions" || (studio === "prix" && finitionsTab)
        ? FINITIONS_SUBTABS
        : null;

  const studioHeader =
    studio === "cockpit"
      ? {
          title: "Catalogue, Prix & Stock",
          subtitle:
            "Pilotez la santé du catalogue, les priorités et la parité commerciale depuis un seul cockpit.",
          domainLabel: "Vue d’ensemble",
        }
      : studio === "prix"
      ? {
          title: "Formules & moteurs",
          subtitle: "Redirection — Articles & tarifs fusionné dans Formules & moteurs.",
          domainLabel: "Formules & moteurs",
        }
      : studio === "calculs"
        ? {
            title: "Formules & moteurs",
            subtitle:
              "Moteurs, paliers de remise et constructeur de formules — un seul écran.",
            domainLabel: "Formules & moteurs",
          }
      : studio === "articles"
        ? {
            title: "Produits & disponibilité",
            subtitle:
              "Fiche produit unifiée, catégories et disponibilité commerciale POS.",
            domainLabel: "Articles & tarifs",
          }
        : studio === "finitions"
          ? {
              title: "Finitions & règles",
              subtitle:
                "Façonnage et conditions SI/ALORS — sans bibliothèque options générale.",
              domainLabel: "Articles & tarifs",
            }
          : studio === "excel"
            ? {
                title: "Données & contrôle",
                subtitle:
                  "Import / export, diagnostics, historique et restauration.",
                domainLabel: "Données & contrôle",
              }
            : studio === "historique"
              ? {
                  title: "Historique",
                  subtitle: "Journal des modifications et audit.",
                  domainLabel: "Historique",
                }
            : studio === "matieres"
              ? {
                  title: "Matières",
                  subtitle: undefined,
                  domainLabel: "Catalogue de production",
                }
              : { title: undefined, subtitle: undefined, domainLabel: undefined };

  const pillValue =
    subTabs && !subTabs.some((t) => t.id === tab) ? subTabs[0].id : tab;

  return (
    <AdminCatalogueShell>
      <div className="cps-hub flex w-full max-w-none flex-col gap-3 md:gap-4">
        <AdminHeader
          title={studioHeader.title}
          subtitle={studioHeader.subtitle}
          domainLabel={studioHeader.domainLabel}
          hideTitleBlock={studio === "calculs"}
          syncStatus={syncStatus}
          canEdit={canEdit}
          syncing={syncing}
          actionsVariant={
            studio === "prix" || studio === "calculs"
              ? "studio-prix"
              : studio === "matieres"
                ? "matieres-tarifs"
                : "default"
          }
          onNew={
            studio === "calculs"
              ? undefined
              : studio === "prix"
                ? () => {
                    if (!ARTICLE_TABS.has(tab)) {
                      navigate("articles", "prix");
                    }
                    setArticleCreateToken((token) => token + 1);
                  }
                : studio === "matieres"
                  ? () => setMaterialCreateToken((token) => token + 1)
                  : () => setDrawerOpen(true)
          }
          newLabel={
            studio === "prix"
              ? "Nouvel article"
              : studio === "matieres"
                ? "Nouvelle matière"
                : undefined
          }
          onImport={
            studio === "calculs"
              ? undefined
              : studio === "matieres"
                ? importMatieresTable
                : studio === "finitions"
                  ? importChipsTable
                  : studio === "articles"
                    ? importCatalogueTable
                    : studio === "prix"
                      ? undefined
                      : () => goExcel("import")
          }
          onExport={
            studio === "calculs" || studio === "prix"
              ? undefined
              : studio === "matieres"
                ? exportMatieresTable
                : studio === "finitions"
                  ? exportChipsTable
                  : studio === "articles"
                    ? exportCatalogueTable
                    : () => goExcel("export")
          }
          onTemplate={
            studio === "prix" || studio === "calculs" || studio === "matieres"
              ? undefined
              : () => goExcel("template")
          }
          onSync={
            studio === "prix" || studio === "calculs"
              ? undefined
              : () => void syncPos()
          }
          onActions={
            studio === "prix" || studio === "calculs" || studio === "matieres"
              ? undefined
              : undefined
          }
        />

        <div
          className={
            studio === "prix" || studio === "calculs"
              ? "cps-hub__layout cps-hub__layout--studio-prix cps-hub__layout--sidebar-domains"
              : studio === "matieres"
                ? "cps-hub__layout cps-hub__layout--sidebar-domains cps-hub__layout--matieres-tarifs"
                : "cps-hub__layout cps-hub__layout--sidebar-domains"
          }
        >
          {/* Domaines Matières / Formules & moteurs → sidebar Administration (AdministrationMacroNav).
              CatalogStudioNav conservé pour deep-links / tests — non affiché ici. */}

          <div className="cps-hub__main min-w-0 flex-1 space-y-3">
            {subTabs ? (
              <PillTabs
                tabs={subTabs}
                value={
                  studio === "prix" && tab === "paliers"
                    ? "paliers"
                    : pillValue
                }
                onChange={(id) => {
                  if (studio === "prix" && (id === "articles" || id === "paliers")) {
                    navigate(id, "prix");
                    return;
                  }
                  setTab(id);
                }}
                ariaLabel={`Sous-sections ${studio}`}
              />
            ) : null}

            <div className="cps-content-flat cps-panel-body min-h-[320px] w-full">
              <Suspense fallback={<Loading />}>
                {studio === "calculs" && !prixForced ? (
                  <PricingCalculsStudio canEdit={canEdit} />
                ) : studio === "prix" && tab === "paliers" ? (
                  <CpsStudioFrame
                    title="Paliers de remise"
                    subtitle="Remises par quantité pour chaque article POS (~95)."
                    flush
                  >
                    <TiersByArticleWorkspace
                      canEdit={canEdit}
                      initialArticleId={searchParams.get("article")}
                    />
                  </CpsStudioFrame>
                ) : studio === "prix" && tab === "dependencies" ? (
                  <CpsStudioFrame
                    title="Options & dépendances"
                    subtitle="Articles complets — règles SI / ALORS et options dans la fiche produit."
                    flush
                  >
                    {searchParams.get("legacyConfig") === "1" ? (
                      <CataloguePosUnifiedWorkspace canEdit={canEdit} embedded />
                    ) : (
                      <PricingArticlesWorkspace
                        canEdit={canEdit}
                        initialArticleId={searchParams.get("article")}
                        createToken={articleCreateToken}
                        hidePrimaryActions
                      />
                    )}
                  </CpsStudioFrame>
                ) : tab === "anomalies" ? (
                  <CpsStudioFrame
                    title="Centre d’anomalies"
                    subtitle="Écarts Admin↔POS, formules cassées — actions correctives."
                  >
                    <AnomalyCenter
                      canEdit={canEdit}
                      onMerged={() => void loadKpis({ withDuplicates: true })}
                      onSyncPos={() => void syncPos()}
                      onOpenFormula={(id) => {
                        const params = new URLSearchParams(searchParams.toString());
                        params.set("studio", "calculs");
                        params.set("tab", "regles");
                        params.set("article", id);
                        router.replace(
                          `/administration/catalogue-prix-stock?${params.toString()}`,
                          { scroll: false },
                        );
                      }}
                      onOpenProduct={(id) => {
                        const params = new URLSearchParams(searchParams.toString());
                        params.set("studio", "prix");
                        params.set("tab", "articles");
                        params.set("article", id);
                        params.set("view", "catalogue");
                        router.replace(
                          `/administration/catalogue-prix-stock?${params.toString()}`,
                          { scroll: false },
                        );
                      }}
                    />
                  </CpsStudioFrame>
                ) : studio === "cockpit" ? (
                  <CockpitStudio
                    canEdit={canEdit}
                    kpiItems={kpiItems}
                    activeKpi={activeKpi}
                    onKpiSelect={onKpiSelect}
                    syncStatus={syncStatus}
                    onOpenStudio={(s, t, view) =>
                      navigate(
                        t as CataloguePrixStockTab,
                        s as CatalogStudioId,
                        view,
                      )
                    }
                    priorities={priorities}
                  />
                ) : studio === "matieres" ? (
                  <MaterialStockStudio
                    canEdit={canEdit}
                    createToken={materialCreateToken}
                    costsBadge={
                      Number.isFinite(Number(kpis.prixManquants))
                        ? Number(kpis.prixManquants)
                        : null
                    }
                  />
                ) : tab === "chips" ? (
                  <CpsStudioFrame
                    title="Bibliothèque options"
                    subtitle="Options réutilisables (chips) — reliées aux fiches produit du Studio Prix."
                  >
                    <OptionsChipsWorkspace embedded canEdit={canEdit} />
                  </CpsStudioFrame>
                ) : tab === "finitions" ? (
                  <CpsStudioFrame
                    title="Finitions & façonnage"
                    subtitle="Opérations de production et tarifs de façonnage — sans bibliothèque options générale."
                  >
                    <div className="space-y-3">
                      <OptionsFinitionsHealthStrip
                        onOpenProducts={() => navigate("articles", "articles")}
                        onOpenParity={() => navigate("matieres", "matieres")}
                      />
                      <PrixMatieresStockWorkspace
                        embedded
                        forcedTab="finitions"
                      />
                    </div>
                  </CpsStudioFrame>
                ) : tab === "excel" ? (
                  <CpsStudioFrame
                    title="Import / Export"
                    subtitle="Redirection — utilisez Importer / Exporter dans Matières & tarifs."
                  >
                    <ExcelManager
                      canEdit={canEdit}
                      onOpenParity={() => navigate("matieres", "matieres")}
                      onOpenDiagnostics={() => navigate("matieres", "matieres")}
                      onOpenHistory={() => navigate("matieres", "matieres")}
                    />
                  </CpsStudioFrame>
                ) : ARTICLE_TABS.has(tab) ? (
                  <CpsStudioFrame
                    title={studio === "prix" ? undefined : "Produits"}
                    subtitle={
                      studio === "prix"
                        ? undefined
                        : "Fiche produit unifiée. Pas de catalogue parallèle."
                    }
                    flush
                  >
                    {searchParams.get("legacyConfig") === "1" ? (
                      <CataloguePosUnifiedWorkspace canEdit={canEdit} embedded />
                    ) : (
                      <PricingArticlesWorkspace
                        canEdit={canEdit}
                        initialArticleId={searchParams.get("article")}
                        createToken={
                          studio === "prix" ? articleCreateToken : undefined
                        }
                        hidePrimaryActions={studio === "prix"}
                      />
                    )}
                  </CpsStudioFrame>
                ) : tab === "corbeille" ? (
                  <CpsStudioFrame
                    title="Corbeille matières"
                    subtitle="Archivage matières uniquement — restauration soft-delete."
                  >
                    <MaterialsCorbeilleTable
                      canEdit={canEdit}
                      onDataChanged={() =>
                        void loadKpis({ withDuplicates: false })
                      }
                    />
                  </CpsStudioFrame>
                ) : tab === "historique" ? (
                  <CpsStudioFrame
                    title="Historique & corbeille"
                    subtitle="Journal d’audit, restauration soft-delete — rien n’est perdu."
                  >
                    <AdminHistoriquePlaceholder
                      entityLabel="catalogue, prix & stock"
                      entityCode="AdminCatalogAudit"
                    />
                  </CpsStudioFrame>
                ) : prixForced ? (
                  <CpsStudioFrame flush>
                    <PrixMatieresStockWorkspace
                      embedded
                      forcedTab={prixForced}
                    />
                  </CpsStudioFrame>
                ) : (
                  <div className="p-6 text-sm text-[var(--cps-muted)]">
                    Section indisponible — utilisez la sous-navigation Studio Prix.
                  </div>
                )}
              </Suspense>
            </div>
          </div>
        </div>
      </div>

      <EntityDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title="Créer une donnée"
        subtitle="Choisissez où créer — les formulaires métier restent dans chaque studio."
        canEdit={canEdit}
      >
        <div className="flex flex-col gap-2">
          <AppButton
            type="button"
            variant="default"
            className="justify-start"
            onClick={() => {
              setDrawerOpen(false);
              navigate("articles", "articles");
            }}
          >
            Aller aux produits / articles
          </AppButton>
          <AppButton
            type="button"
            variant="outline"
            className="justify-start"
            onClick={() => {
              setDrawerOpen(false);
              navigate("matieres", "matieres");
            }}
          >
            Aller aux matières
          </AppButton>
          <AppButton
            type="button"
            variant="outline"
            className="justify-start"
            onClick={() => {
              setDrawerOpen(false);
              navigate("finitions", "finitions");
            }}
          >
            Aller aux finitions & façonnage
          </AppButton>
          <p className="m-0 mt-2 text-xs text-[var(--cps-muted)]">
            Utilisez ensuite « Nouvelle matière », « Nouvelle option » ou la fiche article du studio ciblé.
          </p>
        </div>
      </EntityDrawer>
    </AdminCatalogueShell>
  );
}
