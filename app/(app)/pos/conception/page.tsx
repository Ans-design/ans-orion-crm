"use client";

import { Suspense, useMemo, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { uxToast } from "@/lib/ux/feedback";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, ShoppingBag, Search, Sparkles } from "lucide-react";
import { formatPrice } from "@/lib/data/catalogue";
import { PosIcon } from "@/lib/pos/pos-icons";
import { addToCart, getCart, updateCartItem } from "@/lib/cart-store";
import { posCatalogHref } from "@/lib/pos/catalog-nav";
import {
  CG_CATEGORIES,
  CG_LEVELS,
  CG_DELAYS,
  CG_EXTRA_CATALOG,
  CG_FIELD_META,
  calculateConceptionPrice,
  flatCGServices,
  searchCGServices,
  getCGService,
  type ConceptionConfig,
} from "@/lib/data/conception";
import "@/styles/pos-conception.css";

const LEVEL_HINT: Record<string, string> = {
  Essentiel: "Base × 1",
  Standard: "Base × 1,35",
  Premium: "Base × 1,8",
};

export default function ConceptionPOSPageWrapper() {
  return (
    <Suspense
      fallback={
        <div className="p-8 text-center text-muted-foreground text-body">
          Chargement conception…
        </div>
      }
    >
      <ConceptionPOSPage />
    </Suspense>
  );
}

function ConceptionPOSPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editCartId = searchParams.get("editCart");
  const [filter, setFilter] = useState<"all" | "print" | "digital">("all");
  const [search, setSearch] = useState("");
  const [selectedCat, setSelectedCat] = useState("admin");
  const [serviceKey, setServiceKey] = useState("carte_visite");
  const [level, setLevel] = useState<keyof typeof CG_LEVELS>("Standard");
  const [proposals, setProposals] = useState(2);
  const [revisions, setRevisions] = useState(2);
  const [delay, setDelay] = useState<"Standard" | "Express">("Standard");
  const [extras, setExtras] = useState<string[]>([]);
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({
    pages: "12",
  });
  const [remarques, setRemarques] = useState("");
  const [batOk, setBatOk] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (hydrated) return;
    const service = searchParams.get("service");
    const levelParam = searchParams.get("level") as
      | keyof typeof CG_LEVELS
      | null;
    const proposalsParam = searchParams.get("proposals");
    const revisionsParam = searchParams.get("revisions");
    const delayParam = searchParams.get("delay") as
      | "Standard"
      | "Express"
      | null;
    const extrasParam = searchParams.get("extras");
    const remarquesParam = searchParams.get("remarques");
    const fieldsParam = searchParams.get("fields");

    if (editCartId) {
      const line = getCart().find((c) => c.id === editCartId);
      if (line?.config) {
        const cfg = line.config;
        if (cfg.serviceKey) setServiceKey(String(cfg.serviceKey));
        const lvl = String(cfg.level ?? "");
        if (lvl && lvl in CG_LEVELS) setLevel(lvl as keyof typeof CG_LEVELS);
        if (cfg.proposals != null) setProposals(Number(cfg.proposals) || 2);
        if (cfg.revisions != null) setRevisions(Number(cfg.revisions) || 2);
        if (cfg.delay === "Standard" || cfg.delay === "Express")
          setDelay(cfg.delay);
        if (Array.isArray(cfg.extras)) setExtras(cfg.extras.map(String));
        if (cfg.remarques) setRemarques(String(cfg.remarques));
        if (cfg.fieldValues && typeof cfg.fieldValues === "object") {
          setFieldValues(cfg.fieldValues as Record<string, string>);
        }
        setHydrated(true);
        return;
      }
    }

    if (service) setServiceKey(service);
    if (levelParam && levelParam in CG_LEVELS) setLevel(levelParam);
    if (proposalsParam)
      setProposals(Math.max(1, parseInt(proposalsParam, 10) || 2));
    if (revisionsParam)
      setRevisions(Math.max(0, parseInt(revisionsParam, 10) || 2));
    if (delayParam === "Standard" || delayParam === "Express")
      setDelay(delayParam);
    if (extrasParam)
      setExtras(
        extrasParam
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
      );
    if (remarquesParam) setRemarques(remarquesParam);
    if (fieldsParam) {
      try {
        const parsed = JSON.parse(fieldsParam) as Record<string, string>;
        if (parsed && typeof parsed === "object")
          setFieldValues((prev) => ({ ...prev, ...parsed }));
      } catch {
        /* ignore */
      }
    }
    setHydrated(true);
  }, [searchParams, editCartId, hydrated]);

  const allServices = useMemo(
    () => searchCGServices(search, filter),
    [search, filter],
  );

  const svc = getCGService(serviceKey) || allServices[0] || flatCGServices()[0];

  const visibleCategories = useMemo(
    () =>
      CG_CATEGORIES.map((cat) => {
        const catServices = cat.services.filter((s) => {
          if (search) return allServices.some((a) => a.key === s.key);
          if (filter === "print")
            return s.tags.includes("print") || s.tags.includes("branding");
          if (filter === "digital")
            return s.tags.includes("digital") || s.tags.includes("branding");
          return true;
        });
        return { ...cat, catServices };
      }).filter((c) => c.catServices.length > 0),
    [search, filter, allServices],
  );

  const activeCatKey = visibleCategories.some((c) => c.key === selectedCat)
    ? selectedCat
    : (visibleCategories[0]?.key ?? selectedCat);
  const activeCat =
    visibleCategories.find((c) => c.key === activeCatKey) ??
    visibleCategories[0];
  const activeServices = activeCat?.catServices ?? [];

  const config: ConceptionConfig = useMemo(
    () => ({
      serviceKey: svc?.key || serviceKey,
      level,
      proposals,
      revisions,
      delay,
      extras,
      fieldValues,
      remarques,
    }),
    [
      svc,
      serviceKey,
      level,
      proposals,
      revisions,
      delay,
      extras,
      fieldValues,
      remarques,
    ],
  );

  const total = calculateConceptionPrice(config);

  const selectService = (key: string, catKey: string) => {
    setServiceKey(key);
    setSelectedCat(catKey);
    setExtras([]);
    setBatOk(false);
  };

  const toggleExtra = (key: string) => {
    setExtras((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key],
    );
  };

  const handleAdd = () => {
    if (!svc) return;
    const payload = {
      articleId: `cg-${svc.key}`,
      name: `Conception — ${svc.label}`,
      category: "conception",
      config: {
        ...config,
        serviceLabel: svc.label,
        catLabel: svc.catLabel,
        suggestion: svc.suggestion,
        batAcknowledged: batOk,
      },
      quantity: 1,
      prixUnitaire: total,
      totalLigne: total,
    };
    if (editCartId && getCart().some((c) => c.id === editCartId)) {
      updateCartItem(editCartId, payload);
      uxToast.success(`${svc.label} mis à jour dans le panier`);
    } else {
      addToCart({ id: `cg-${svc.key}-${Date.now()}`, ...payload });
      uxToast.success(`${svc.label} ajouté au panier !`);
    }
    window.dispatchEvent(new Event("cartUpdated"));
  };

  const extraLabels = extras
    .map((k) => CG_EXTRA_CATALOG.find((e) => e.key === k)?.label)
    .filter(Boolean);

  return (
    <div className="pos-soft-shell cg-pos">
      <button
        type="button"
        onClick={() => router.push(posCatalogHref("conception"))}
        className="pos-back-link"
      >
        <span className="pos-back-link__ico" aria-hidden>
          <ArrowLeft size={12} strokeWidth={2.5} />
        </span>
        Retour au catalogue
      </button>

      <div className="pos-config-topbar">
        <div className="pos-product-hero min-w-0">
          <div className="pos-product-hero__icon" aria-hidden>
            <Sparkles className="text-[var(--pos-brand,#FF174D)]" size={22} />
          </div>
          <div className="min-w-0">
            <span className="pos-product-hero__badge">Studio créatif</span>
            <h1>Conception graphique</h1>
            <p>
              {flatCGServices().length} prestations · choisissez, configurez,
              ajoutez au panier
            </p>
          </div>
        </div>
        <div
          className="pos-summary-soft shrink-0 !overflow-visible hidden sm:block"
          style={{ minWidth: "11.5rem" }}
        >
          <div className="pos-summary-soft__hero !py-4 !pb-4">
            <p className="pos-summary-soft__label">Estimation</p>
            <div
              className="pos-summary-soft__price"
              style={{ fontSize: "var(--fs-panel-title)" }}
            >
              {formatPrice(total)}
              <span className="pos-summary-soft__currency">Ar</span>
            </div>
          </div>
        </div>
      </div>

      {/* 1. Filtres */}
      <div className="cg-pos__toolbar">
        <div className="cg-pos__seg" aria-label="Filtrer">
          {(["all", "print", "digital"] as const).map((f) => (
            <button
              key={f}
              type="button"
              aria-pressed={filter === f}
              onClick={() => setFilter(f)}
              className={`cg-pos__seg-btn${filter === f ? " is-active" : ""}`}
            >
              {f === "all" ? "Tous" : f === "print" ? "Print" : "Digital"}
            </button>
          ))}
        </div>
        <div className="cg-pos__search">
          <Search size={15} className="text-muted-foreground shrink-0" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher : flyer, carte, logo, magazine…"
            aria-label="Rechercher une prestation"
          />
        </div>
      </div>

      {/* 2. Catégories */}
      <div className="cg-pos__cats">
        {visibleCategories.map((cat) => {
          const active = activeCatKey === cat.key;
          return (
            <button
              key={cat.key}
              type="button"
              aria-pressed={active}
              onClick={() => {
                setSelectedCat(cat.key);
                if (!cat.catServices.some((s) => s.key === serviceKey)) {
                  setServiceKey(cat.catServices[0]?.key ?? serviceKey);
                }
              }}
              className={`cg-pos__cat${active ? " is-active" : ""}`}
            >
              <div className="cg-pos__cat-top">
                <span className="cg-pos__cat-ico" aria-hidden>
                  <PosIcon category={cat.key} size={14} />
                </span>
                <span className="cg-pos__cat-count">{cat.catServices.length}</span>
              </div>
              <span className="cg-pos__cat-label">{cat.label}</span>
            </button>
          );
        })}
      </div>

      {/* 3. Prestations */}
      <AnimatePresence mode="wait">
        {activeCat && (
          <motion.div
            key={activeCatKey}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.16 }}
            className="cg-pos__services-panel"
          >
            <div className="cg-pos__services-head">
              <p className="cg-pos__services-kicker">{activeCat.label}</p>
              <p className="cg-pos__services-hint">
                {activeServices.length} prestation
                {activeServices.length > 1 ? "s" : ""}
              </p>
            </div>
            <div className="cg-pos__services">
              {activeServices.map((s) => (
                <button
                  key={s.key}
                  type="button"
                  onClick={() => selectService(s.key, activeCat.key)}
                  className={`cg-pos__svc${serviceKey === s.key ? " is-active" : ""}`}
                >
                  <span className="cg-pos__svc-name">{s.label}</span>
                  <span className="cg-pos__svc-price">
                    dès {formatPrice(s.base)} Ar
                  </span>
                  {s.badge ? (
                    <span className="cg-pos__svc-badge">{s.badge}</span>
                  ) : null}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 4. Config + récap */}
      <div className="cg-pos__layout">
        <div className="cg-pos__main">
          <AnimatePresence mode="wait">
            {svc && (
              <motion.div
                key={serviceKey}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.16 }}
                className="cg-pos__card"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="cg-pos__card-kicker">{svc.catLabel}</p>
                    <h2 className="cg-pos__card-title">{svc.label}</h2>
                    {svc.desc ? (
                      <p className="cg-pos__card-desc">{svc.desc}</p>
                    ) : null}
                  </div>
                  {svc.badge ? (
                    <span className="cg-pos__svc-badge shrink-0">{svc.badge}</span>
                  ) : null}
                </div>
                {svc.deliverables?.length ? (
                  <div className="cg-pos__tags">
                    {svc.deliverables.map((d) => (
                      <span key={d} className="cg-pos__tag">
                        {d}
                      </span>
                    ))}
                  </div>
                ) : null}
                {svc.suggestion ? (
                  <p className="cg-pos__hint">{svc.suggestion}</p>
                ) : null}
              </motion.div>
            )}
          </AnimatePresence>

          <div className="cg-pos__card">
            <section className="cg-pos__section">
              <p className="cg-pos__label">Niveau de prestation</p>
              <div className="cg-pos__levels">
                {Object.keys(CG_LEVELS).map((l) => (
                  <button
                    key={l}
                    type="button"
                    onClick={() => setLevel(l as keyof typeof CG_LEVELS)}
                    className={`cg-pos__level${level === l ? " is-active" : ""}`}
                  >
                    <span className="cg-pos__level-name">{l}</span>
                    <span className="cg-pos__level-meta">
                      {LEVEL_HINT[l] ?? ""}
                    </span>
                  </button>
                ))}
              </div>
            </section>

            <section className="cg-pos__section">
              <p className="cg-pos__label">Volume & délai</p>
              <div className="cg-pos__metrics">
                <div>
                  <span className="cg-pos__metric-label">Propositions</span>
                  <div className="cg-pos__stepper">
                    <button
                      type="button"
                      className="cg-pos__stepper-btn"
                      aria-label="Moins de propositions"
                      onClick={() => setProposals(Math.max(1, proposals - 1))}
                    >
                      −
                    </button>
                    <span className="cg-pos__stepper-val">{proposals}</span>
                    <button
                      type="button"
                      className="cg-pos__stepper-btn"
                      aria-label="Plus de propositions"
                      onClick={() => setProposals(proposals + 1)}
                    >
                      +
                    </button>
                  </div>
                </div>
                <div>
                  <span className="cg-pos__metric-label">Révisions</span>
                  <div className="cg-pos__stepper">
                    <button
                      type="button"
                      className="cg-pos__stepper-btn"
                      aria-label="Moins de révisions"
                      onClick={() => setRevisions(Math.max(0, revisions - 1))}
                    >
                      −
                    </button>
                    <span className="cg-pos__stepper-val">{revisions}</span>
                    <button
                      type="button"
                      className="cg-pos__stepper-btn"
                      aria-label="Plus de révisions"
                      onClick={() => setRevisions(revisions + 1)}
                    >
                      +
                    </button>
                  </div>
                </div>
                <div>
                  <span className="cg-pos__metric-label">Délai</span>
                  <div className="cg-pos__delay">
                    {CG_DELAYS.map((d) => (
                      <button
                        key={d}
                        type="button"
                        onClick={() => setDelay(d)}
                        className={`cg-pos__delay-btn${delay === d ? " is-active" : ""}${d === "Express" ? " is-express" : ""}`}
                      >
                        {d}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </section>

            {(svc?.fields || []).length > 0 ? (
              <section className="cg-pos__section">
                <p className="cg-pos__label">Paramètres</p>
                <div className="space-y-3">
                  {(svc?.fields || []).map((f) => (
                    <div key={f} className="cg-pos__field">
                      <label className="cg-pos__field-label">
                        {CG_FIELD_META[f]?.label || f}
                      </label>
                      {f === "pages" ? (
                        <input
                          type="number"
                          min={4}
                          value={fieldValues.pages || "12"}
                          onChange={(e) =>
                            setFieldValues((v) => ({
                              ...v,
                              pages: e.target.value,
                            }))
                          }
                        />
                      ) : (
                        <input
                          value={fieldValues[f] || ""}
                          onChange={(e) =>
                            setFieldValues((v) => ({
                              ...v,
                              [f]: e.target.value,
                            }))
                          }
                          placeholder={CG_FIELD_META[f]?.placeholder}
                        />
                      )}
                    </div>
                  ))}
                </div>
              </section>
            ) : null}

            <section className="cg-pos__section">
              <p className="cg-pos__label">Options complémentaires</p>
              <div className="cg-pos__extras">
                {CG_EXTRA_CATALOG.map((e) => (
                  <button
                    key={e.key}
                    type="button"
                    onClick={() => toggleExtra(e.key)}
                    className={`cg-pos__extra${extras.includes(e.key) ? " is-active" : ""}`}
                  >
                    <span className="cg-pos__extra-label">{e.label}</span>
                    <span className="cg-pos__extra-price">
                      +{formatPrice(e.price)} Ar
                    </span>
                  </button>
                ))}
              </div>
            </section>

            <section className="cg-pos__section">
              <p className="cg-pos__label">Brief / remarques</p>
              <div className="cg-pos__field">
                <textarea
                  value={remarques}
                  onChange={(e) => setRemarques(e.target.value)}
                  rows={3}
                  placeholder="Style, références, cible, contraintes…"
                />
              </div>
            </section>

            <label className="cg-pos__bat">
              <input
                type="checkbox"
                checked={batOk}
                onChange={(e) => setBatOk(e.target.checked)}
              />
              <span>
                <span className="cg-pos__bat-title">BAT à prévoir</span>
                <span className="cg-pos__bat-desc">
                  Bon à tirer avant impression — le fichier final sera joint à
                  la commande.
                </span>
              </span>
            </label>
          </div>
        </div>

        <aside className="cg-pos__aside">
          <h3 className="cg-pos__aside-title">Récapitulatif</h3>
          <div className="cg-pos__aside-rows">
            <div className="cg-pos__aside-row">
              <span>Prestation</span>
              <span>{svc?.label ?? "—"}</span>
            </div>
            <div className="cg-pos__aside-row">
              <span>Catégorie</span>
              <span>{svc?.catLabel ?? "—"}</span>
            </div>
            <div className="cg-pos__aside-row">
              <span>Niveau</span>
              <span>{level}</span>
            </div>
            <div className="cg-pos__aside-row">
              <span>Délai</span>
              <span>{delay}</span>
            </div>
            <div className="cg-pos__aside-row">
              <span>Volume</span>
              <span>
                {proposals} prop. · {revisions} rév.
                {batOk ? " · BAT" : ""}
              </span>
            </div>
            {fieldValues.pages && svc?.fields?.includes("pages") ? (
              <div className="cg-pos__aside-row">
                <span>Pages</span>
                <span>{fieldValues.pages}</span>
              </div>
            ) : null}
            {extraLabels.length > 0 ? (
              <div className="cg-pos__aside-row">
                <span>Options</span>
                <span>{extraLabels.join(", ")}</span>
              </div>
            ) : null}
          </div>
          <div className="cg-pos__aside-total">
            <p className="cg-pos__aside-total-label">Total estimé</p>
            <p className="cg-pos__aside-total-value">
              {formatPrice(total)} Ar
            </p>
            <p className="cg-pos__aside-total-meta">
              Base {formatPrice(svc?.base || 0)} · {level}
            </p>
          </div>
          <button
            type="button"
            onClick={handleAdd}
            disabled={!svc}
            className="cg-pos__cta"
          >
            <ShoppingBag size={16} />
            {editCartId ? "Mettre à jour" : "Ajouter au panier"}
          </button>
        </aside>
      </div>

      <div className="cg-pos__mobile-bar">
        <div className="cg-pos__mobile-price">
          <small>Total estimé</small>
          <strong>{formatPrice(total)} Ar</strong>
        </div>
        <button
          type="button"
          onClick={handleAdd}
          disabled={!svc}
          className="cg-pos__cta"
        >
          <ShoppingBag size={15} />
          Panier
        </button>
      </div>
    </div>
  );
}
