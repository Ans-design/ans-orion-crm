'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { uxToast } from '@/lib/ux/feedback';
import { getApiErrorMessage } from '@/lib/api-client';
import Link from 'next/link';
import {
  Database, Rocket, Undo2, AlertTriangle, Wrench, Eye, Pencil, Layers, Timer,
} from 'lucide-react';
import { formatPriceAr, CATALOGUE } from '@/lib/data/catalogue';
import { AdminEmptyState } from '@/components/admin/AdminEmptyState';
import {
  InlineMaterialEditor,
  InlineProfileEditor,
  InlineTierEditor,
  InlineUrgencyEditor,
} from '@/components/admin/article-pricing-inline-sections';
import { AppButton } from '@/components/ui/app-ui';

// Bibliothèque options complète embarquée dans la fiche produit (nav 5)
const OptionsChipsWorkspace = dynamic(
  () =>
    import('@/components/backoffice-v2/options/OptionsChipsWorkspace').then(
      (m) => m.OptionsChipsWorkspace,
    ),
  {
    ssr: false,
    loading: () => (
      <div className="pta-skeleton" style={{ height: 160, borderRadius: 8 }} />
    ),
  },
);
import {
  ARTICLE_PRICING_SECTIONS,
  ARTICLE_CONFIG_TABS,
  SECTION_NUMBERS,
  resolveArticlePricingSection,
  type ArticlePricingSectionId,
} from '@/lib/pricing/pricing-admin-ui';
import type { PricingAnomaly } from '@/lib/pricing/pricing-types';
import { resolveFieldPriceImpact } from '@/lib/pricing/price-impact-rules';

type ProfileDetail = {
  articleId: string;
  articleLabel: string;
  family: string;
  calculationType: string;
  saleUnit: string;
  status: string;
  prixBase: number | null;
  prixM2: number | null;
  prixCm2: number | null;
  qtyMin: number | null;
  discountTiers: { id?: string; minQty: number; maxQty: number | null; unitPrice: number | null; discountPercent: number; active?: boolean }[];
  materialPrices: { id: string; label: string | null; prixM2: number | null; prixCm2: number | null; materialKey: string | null; grammage: string | null; active: boolean }[];
  urgencyRules: { id: string; label: string; surchargePercent: number; requiresValidation: boolean; active: boolean }[];
  stockRules: { ruleType: string; optionFieldKey: string | null; condition: unknown; action: unknown }[];
  formulaVersions: { version: number; status: string; expression: string; label: string | null }[];
  optionGroups: {
    id: string;
    fieldKey: string;
    label: string;
    fieldType: string;
    impactsPrice: boolean;
    impactsStock: boolean;
    impactsProduction: boolean;
    isInformational: boolean;
    visiblePos: boolean;
    active: boolean;
    required: boolean;
    values: { id: string; label: string; forcePrice: boolean; priceModifier: number; active: boolean }[];
  }[];
};

type RegleRow = {
  id: string;
  ruleName: string;
  ruleType: string;
  message?: string;
  active: boolean;
  articleId?: string | null;
};

type Props = {
  articleId: string;
  canEdit: boolean;
  onUpdated?: () => void;
  /** Onglets catalogue compacts (panneau détail) */
  catalogMode?: boolean;
  /** Section contrôlée depuis le shell unifié */
  activeSection?: ArticlePricingSectionId;
  /** Section initiale (deep-link) — non contrôlée ensuite */
  initialSection?: ArticlePricingSectionId;
  onActiveSectionChange?: (id: ArticlePricingSectionId) => void;
  /** Masquer la barre d’onglets interne (shell unifié) */
  hideSectionNav?: boolean;
  /** Remonte l’état dirty vers le parent catalogue */
  onDirtyChange?: (dirty: boolean) => void;
};

export function ArticlePricingCard({
  articleId,
  canEdit,
  onUpdated,
  catalogMode,
  activeSection,
  initialSection,
  onActiveSectionChange,
  hideSectionNav,
  onDirtyChange,
}: Props) {
  const [data, setData] = useState<{ profile: ProfileDetail; isPublished: boolean } | null>(null);
  const [loading, setLoading] = useState(true);
  const [internalSection, setInternalSection] = useState<ArticlePricingSectionId>(
    resolveArticlePricingSection(initialSection ?? 'infos'),
  );
  const section = resolveArticlePricingSection(activeSection ?? internalSection);
  const setSection = useCallback(
    (id: ArticlePricingSectionId | string) => {
      const next = resolveArticlePricingSection(id);
      if (onActiveSectionChange) onActiveSectionChange(next);
      else setInternalSection(next);
    },
    [onActiveSectionChange],
  );
  const [simQty] = useState(100);
  const [migrating, setMigrating] = useState(false);
  const [regles, setRegles] = useState<RegleRow[]>([]);
  const [anomalies, setAnomalies] = useState<PricingAnomaly[]>([]);
  const [dirty, setDirty] = useState(false);
  const sectionsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!activeSection) setInternalSection(resolveArticlePricingSection(initialSection ?? 'infos'));
  }, [articleId, activeSection, initialSection]);

  const handleDirtyChange = useCallback(
    (d: boolean) => {
      setDirty(d);
      onDirtyChange?.(d);
    },
    [onDirtyChange],
  );

  useEffect(() => {
    setDirty(false);
    onDirtyChange?.(false);
  }, [articleId, onDirtyChange]);

  // Garde-fou : modifications non enregistrées → confirmation avant fermeture onglet
  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [dirty]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch(`/api/dynamic-pricing/${articleId}`);
      const d = await r.json();
      if (r.ok) setData(d);
      else setData(null);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [articleId]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (section !== 'regles') return;
    (async () => {
      try {
        const r = await fetch(`/api/regles?search=${encodeURIComponent(articleId)}`);
        const d = await r.json();
        if (r.ok) setRegles((d.rules || []).filter((x: RegleRow) =>
          !x.articleId || x.articleId === articleId,
        ));
      } catch { /* ignore */ }
    })();
  }, [section, articleId]);

  useEffect(() => {
    if (section !== 'anomalies') return;
    (async () => {
      try {
        const r = await fetch('/api/pricing/anomalies');
        const d = await r.json();
        if (r.ok) {
          setAnomalies((d.anomalies || []).filter((a: PricingAnomaly) =>
            a.articleId === articleId || a.message?.includes(articleId),
          ));
        }
      } catch { /* ignore */ }
    })();
  }, [section, articleId]);

  const publish = async (action: 'publish' | 'unpublish') => {
    if (!canEdit) return;
    const r = await fetch(`/api/dynamic-pricing/${articleId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }),
    });
    const d = await r.json();
    if (r.ok) {
      uxToast.success(action === 'publish' ? 'Article publié' : 'Repasse en brouillon');
      load();
      onUpdated?.();
    } else uxToast.error(getApiErrorMessage(d, 'Erreur'), 'Erreur');
  };

  const migrateFrom2026 = async () => {
    if (!canEdit) return;
    setMigrating(true);
    try {
      const r = await fetch(`/api/dynamic-pricing/${articleId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'migrate-from-2026', config: { qty: simQty } }),
      });
      const d = await r.json();
      if (r.ok && !d.skipped) {
        uxToast.success(`PRIX 2026 importé — ${d.tiersWritten} palier(s)`);
        load();
        onUpdated?.();
      } else if (d.skipped) {
        uxToast.error(d.reason, 'Migration ignorée');
      } else {
        uxToast.error(getApiErrorMessage(d, 'Migration échouée'), 'Migration échouée');
      }
    } catch {
      uxToast.error('Erreur réseau');
    }
    setMigrating(false);
  };

  if (loading) {
    return (
      <div className="pta-pricing-card">
        <div className="pta-pricing-card-header">
          <div className="pta-skeleton" style={{ width: 40, height: 40, borderRadius: 8 }} />
          <div style={{ flex: 1 }}>
            <div className="pta-skeleton" style={{ height: 18, width: '60%', marginBottom: 8 }} />
            <div className="pta-skeleton" style={{ height: 12, width: '40%' }} />
          </div>
        </div>
        <div style={{ padding: 24 }}>
          <div className="pta-skeleton" style={{ height: 200, borderRadius: 8 }} />
        </div>
      </div>
    );
  }

  if (!data?.profile) {
    return (
      <AdminEmptyState
        title="Profil introuvable"
        description="Lancez Sync catalogue pour créer le profil tarifaire de cet article."
        icon={<AlertTriangle className="h-5 w-5" strokeWidth={1.5} aria-hidden />}
      />
    );
  }

  const p = data.profile;
  const formula = p.formulaVersions[0];
  const artEmoji = CATALOGUE.find((a) => a.id === articleId)?.icon ?? null;

  const tabConfig = catalogMode
    ? ARTICLE_CONFIG_TABS.map((t) => ({ id: t.sectionId, label: t.label }))
    : ARTICLE_PRICING_SECTIONS.map((s, i) => ({
        id: s.id,
        label: `${SECTION_NUMBERS[i]} ${s.label}`,
      }));

  return (
    <div className="pta-pricing-card">
      <div className="pta-pricing-card-header">
        {artEmoji ? <span className="pta-art-emoji">{artEmoji}</span> : null}
        <div className="pta-art-info">
          <h2>{p.articleLabel}</h2>
          <p>
            <span style={{ fontFamily: 'monospace' }}>{p.articleId}</span>
            {' · '}Catégorie : {p.family}
            {' · '}{p.calculationType}
          </p>
        </div>
        <div className="pta-header-actions">
          {canEdit && (
            <>
              {!data.isPublished && (
                <AppButton
                  type="button"
                  onClick={migrateFrom2026}
                  disabled={migrating}
                  variant="ghost"
                  size="sm"
                >
                  <Database size={11} /> {migrating ? '…' : 'Import 2026'}
                </AppButton>
              )}
              {data.isPublished ? (
                <AppButton type="button" onClick={() => publish('unpublish')} variant="ghost" size="sm">
                  <Undo2 size={11} /> Archiver
                </AppButton>
              ) : (
                <AppButton type="button" onClick={() => publish('publish')} variant="default" size="sm">
                  <Rocket size={11} /> Activer
                </AppButton>
              )}
            </>
          )}
        </div>
        <div className="pta-sticky-actions" role="toolbar" aria-label="Actions rapides prix">
          <AppButton
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setSection('infos')}
            title="Modifier le prix de base et l’unité de vente"
          >
            <Pencil size={11} /> Modifier le prix
          </AppButton>
          <AppButton
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setSection('paliers')}
            title="Paliers et remises quantité"
          >
            <Layers size={11} /> Paliers
          </AppButton>
          <AppButton
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setSection('urgence')}
            title="Délais et suppléments urgence"
          >
            <Timer size={11} /> Urgence
          </AppButton>
          <AppButton asChild variant="ghost" size="sm" title="Simuler et valider la formule dans le Studio Prix">
            <Link
              href={`/administration/catalogue-prix-stock?studio=prix&tab=regles&article=${articleId}`}
            >
              <Eye size={11} /> Tester dans Studio Prix
            </Link>
          </AppButton>
        </div>
      </div>

      {!hideSectionNav && (
      <div className="pta-card-sections" ref={sectionsRef}>
        {tabConfig.map((t) => (
          <button
            key={`${t.id}-${t.label}`}
            type="button"
            onClick={() => {
              setSection(resolveArticlePricingSection(t.id));
              requestAnimationFrame(() => {
                sectionsRef.current
                  ?.querySelector('.pta-card-section-btn.active')
                  ?.scrollIntoView({ inline: 'nearest', block: 'nearest' });
              });
            }}
            className={`pta-card-section-btn${section === t.id ? ' active' : ''}`}
            aria-current={section === t.id ? 'true' : undefined}
          >
            {t.label}
          </button>
        ))}
      </div>
      )}

      <div className="pta-card-section-body">
        {section === 'infos' && (
          <div style={{ maxWidth: 560 }}>
            <div className="pta-info-box">
              Informations générales — base tarifaire et unité de vente POS.
            </div>
            <InlineProfileEditor
              articleId={articleId}
              profile={{
                prixBase: p.prixBase,
                prixM2: p.prixM2,
                prixCm2: p.prixCm2,
                qtyMin: p.qtyMin,
                saleUnit: p.saleUnit,
              }}
              canEdit={canEdit}
              onSaved={load}
            />
          </div>
        )}

        {section === 'statut' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 14, maxWidth: 720 }}>
            <div className="pta-subpanel">
              <div className="pta-subpanel-title">Validation tarifaire</div>
              {[
                { id: 'published', label: 'Actif', desc: 'Visible POS — moteur dynamique publié', active: data.isPublished },
                { id: 'draft', label: 'Brouillon', desc: 'POS = legacy PRIX 2026 jusqu\'à publication', active: !data.isPublished },
              ].map((opt) => (
                <div
                  key={opt.id}
                  className={`pta-status-option ${opt.active ? 'is-active' : 'is-inactive'}`}
                >
                  <div className="title">{opt.label}</div>
                  <div className="desc">{opt.desc}</div>
                </div>
              ))}
            </div>
            <div className="pta-subpanel">
              <div className="pta-subpanel-title">Métadonnées</div>
              <p style={{ fontSize: 11, color: 'var(--pta-text2)', lineHeight: 1.7 }}>
                Unité : <strong>{p.saleUnit}</strong><br />
                Qté min : <strong>{p.qtyMin ?? 1}</strong><br />
                {p.stockRules.length} règle(s) stock · {p.urgencyRules.length} urgence(s)
              </p>
            </div>
          </div>
        )}

        {section === 'options' && (
          <div>
            <div className="pta-info-box">
              Options & finitions de {p.articleLabel} — chips reliées au POS et aux moteurs de prix.
            </div>
            <div className="pta-tag-row">
              <span className="pta-tag pta-tag-blue">Impact prix</span>
              <span className="pta-tag pta-tag-purple">Indicatif</span>
              <span className="pta-tag pta-tag-green">Stock</span>
            </div>
            <OptionsChipsWorkspace
              embedded
              canEdit={canEdit}
              lockedArticleId={articleId}
              onDataChanged={load}
            />
            <Link
              href="/administration/catalogue-prix-stock?studio=prix&tab=chips"
              className="pta-link"
              style={{ display: 'inline-block', marginTop: 12 }}
            >
              Gérer dans Options & finitions →
            </Link>
          </div>
        )}

        {section === 'matieres' && (
          <div>
            <div className="pta-info-box">
              Matières, formats & stock compatibles avec {p.articleLabel} — lecture seule ici,
              gestion dans le studio Matières.
            </div>
            <InlineMaterialEditor articleId={articleId} materials={p.materialPrices ?? []} canEdit={false} onSaved={load} />
            <Link
              href="/administration/catalogue-prix-stock?studio=matieres&tab=matieres"
              className="pta-link"
              style={{ display: 'inline-block', marginTop: 12 }}
            >
              Ouvrir la matière dans le studio Matières →
            </Link>
          </div>
        )}

        {section === 'variables' && (
          <div style={{ maxWidth: 640 }}>
            <div className="pta-info-box">
              Variables globales (TVA, marges, gâche) — onglet <strong>Variables</strong> en haut.
              Ci-dessous : modificateurs options article.
            </div>
            <div className="pta-subpanel" style={{ padding: 0, overflow: 'hidden' }}>
              <table>
                <thead>
                  <tr>
                    <th>Option</th>
                    <th style={{ textAlign: 'right' }}>Modificateur</th>
                    <th style={{ textAlign: 'center' }}>Impacte le prix</th>
                  </tr>
                </thead>
                <tbody>
                  {p.optionGroups.flatMap((g) => {
                    const impact = resolveFieldPriceImpact({
                      articleId: p.articleId,
                      fieldKey: g.fieldKey,
                      defaultImpactsPrice: g.impactsPrice,
                      defaultIsInformational: g.isInformational,
                    });
                    return g.values.map((v) => (
                      <tr key={v.id}>
                        <td>{g.label} → {v.label}</td>
                        <td style={{ textAlign: 'right', fontFamily: 'monospace' }}>{formatPriceAr(v.priceModifier)}</td>
                        <td style={{ textAlign: 'center' }}>{impact.badge}</td>
                      </tr>
                    ));
                  })}
                  {!p.optionGroups.length && (
                    <tr><td colSpan={3} style={{ textAlign: 'center', color: 'var(--pta-text2)', padding: 16 }}>Aucune variable option</td></tr>
                  )}
                </tbody>
              </table>
            </div>
            <Link href="/admin/pricing?tab=variables" className="pta-link" style={{ display: 'inline-block', marginTop: 12 }}>
              Ouvrir variables globales →
            </Link>
          </div>
        )}

        {section === 'formule' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 14 }}>
            <div>
              <div className="pta-info-box">
                Formule utilisée par POS, simulateur, devis et panier.
              </div>
              {formula ? (
                <pre className="pta-formula-box">{`// v${formula.version} [${formula.status}]\n${formula.expression}`}</pre>
              ) : (
                <p style={{ color: 'var(--pta-text2)', padding: 16, border: '1px dashed var(--pta-border)', borderRadius: 8 }}>
                  Aucune formule — Sync catalogue
                </p>
              )}
            </div>
            <div className="pta-panel">
              <div className="pta-section-sep">Ordre d&apos;application</div>
              <ol style={{ color: 'var(--pta-text2)', paddingLeft: 18, lineHeight: 1.8 }}>
                <li>Lire dimensions → surface réelle</li>
                <li>Appliquer paliers quantité</li>
                <li>Modificateurs options / matières</li>
                <li>Supplément urgence</li>
                <li>Arrondi commercial</li>
                <li>TVA (variables globales)</li>
              </ol>
            </div>
          </div>
        )}

        {section === 'paliers' && (
          <div>
            <div className="pta-section-sep">Paliers · remise quantité</div>
            <InlineTierEditor
              articleId={articleId}
              tiers={p.discountTiers}
              canEdit={canEdit}
              onSaved={load}
              onDirtyChange={handleDirtyChange}
            />
            {p.discountTiers.length > 0 && (
              <p className="pta-success-hint">✓ {p.discountTiers.length} palier(s) configuré(s)</p>
            )}
          </div>
        )}

        {section === 'urgence' && (
          <div>
            <div className="pta-section-sep">Délais &amp; suppléments urgence</div>
            <InlineUrgencyEditor articleId={articleId} rules={p.urgencyRules} canEdit={canEdit} onSaved={load} />
          </div>
        )}

        {section === 'regles' && (
          <div>
            <div className="pta-info-box">{regles.length} règle(s) métier liée(s) à cet article</div>
            {regles.map((r) => (
              <div key={r.id} className="pta-list-row">
                <div>
                  <div className="title">{r.ruleName}</div>
                  <div className="meta">{r.ruleType}{r.message ? ` · ${r.message}` : ''}</div>
                </div>
                <span className={`pta-badge ${r.active ? 'pta-badge-active' : 'pta-badge-danger'}`}>
                  {r.active ? 'Active' : 'Inactive'}
                </span>
              </div>
            ))}
            {!regles.length && (
              <AdminEmptyState title="Aucune règle métier pour cet article" />
            )}
          </div>
        )}

        {section === 'anomalies' && (
          <div>
            {anomalies.map((a) => (
              <div
                key={a.id}
                className={`pta-anomaly-row ${
                  a.severity === 'critical' ? 'critique' :
                  a.severity === 'warning' ? 'warning' : 'info'
                }`}
              >
                <AlertTriangle size={16} style={{
                  color: a.severity === 'critical' ? 'var(--pta-danger)' :
                    a.severity === 'warning' ? 'var(--pta-warn)' : '#06b6d4',
                }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontWeight: 600 }}>{a.message}</p>
                  <p style={{ fontSize: 10, color: 'var(--pta-text2)', marginTop: 2 }}>{a.recommendedAction}</p>
                </div>
                <AppButton type="button" variant="ghost" size="sm">
                  <Wrench size={10} /> Corriger
                </AppButton>
              </div>
            ))}
            {!anomalies.length && (
              <p style={{ textAlign: 'center', color: 'var(--pta-green)', padding: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                <Eye size={14} /> Aucune anomalie pour cet article
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
