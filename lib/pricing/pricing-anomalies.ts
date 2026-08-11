/**
 * Détection d'anomalies tarification V4 — scan catalogue + DB.
 */
import { CATALOGUE } from '@/lib/data/catalogue';
import { prisma } from '@/lib/prisma';
import { isArticleSellable } from '@/lib/pos/pos-price-policy';
import type { PricingAnomaly, PricingAnomalySeverity } from '@/lib/pricing/pricing-types';

function anomaly(
  id: string,
  severity: PricingAnomalySeverity,
  message: string,
  recommendedAction: string,
  articleId: string | null = null,
  source = 'scanner',
): PricingAnomaly {
  return { id, severity, articleId, source, message, recommendedAction };
}

function tierOverlap(
  tiers: { minQty: number; maxQty: number | null }[],
): boolean {
  const sorted = [...tiers].sort((a, b) => a.minQty - b.minQty);
  for (let i = 0; i < sorted.length - 1; i++) {
    const cur = sorted[i];
    const next = sorted[i + 1];
    const curMax = cur.maxQty ?? Number.MAX_SAFE_INTEGER;
    if (curMax >= next.minQty) return true;
  }
  return false;
}

export async function scanPricingAnomalies(limit = 500): Promise<PricingAnomaly[]> {
  const items: PricingAnomaly[] = [];
  const catalogueIds = new Set(CATALOGUE.map((a) => a.id));

  const [profiles, publishedIds, salePriceCount, fusionAnomalyCount, materialsMissingPrice] = await Promise.all([
    prisma.articlePricingProfile.findMany({
      take: limit,
      include: {
        discountTiers: { where: { active: true } },
        formulaVersions: { orderBy: { version: 'desc' }, take: 1 },
        materialPrices: { where: { active: true } },
        optionGroups: {
          include: { values: { where: { active: true } } },
        },
      },
    }),
    prisma.articlePricingProfile.findMany({
      where: { status: 'published' },
      select: { articleId: true },
    }),
    prisma.salePrice2026.count({ where: { actif: true } }),
    prisma.importAnomaly.count({ where: { resolved: false } }).catch(() => 0),
    prisma.baseMaterial.findMany({
      where: {
        active: true,
        archived: false,
        impactsPrice: true,
        visiblePos: true,
        AND: [
          { OR: [{ basePrintPrice: null }, { basePrintPrice: { lte: 0 } }] },
          { OR: [{ maxPrice: null }, { maxPrice: { lte: 0 } }] },
        ],
      },
      select: { id: true, label: true, materialKey: true, family: true },
      take: 80,
    }).catch(() => []),
  ]);

  const publishedSet = new Set(publishedIds.map((p) => p.articleId));
  const profileMap = new Map(profiles.map((p) => [p.articleId, p]));

  for (const art of CATALOGUE) {
    const profile = profileMap.get(art.id);
    const visiblePos = profile?.active ?? true;

    if (!profileMap.has(art.id)) {
      items.push(
        anomaly(
          `no-profile-${art.id}`,
          visiblePos ? 'critical' : 'warning',
          visiblePos
            ? `Article ${art.name} visible POS sans profil tarifaire publié`
            : `Article ${art.name} sans profil moteur dynamique`,
          'Créer et publier le profil dans Administration → Catalogue POS',
          art.id,
        ),
      );
    } else if (!publishedSet.has(art.id) && visiblePos) {
      items.push(
        anomaly(
          `unpublished-${art.id}`,
          'critical',
          `Article ${art.name} visible POS — profil publié absent ou tarification incomplète`,
          'Publier le profil tarifaire et vérifier le prix base',
          art.id,
        ),
      );
    } else if (profile && visiblePos && !isArticleSellable({
      articleId: profile.articleId,
      status: profile.status,
      prixBase: profile.prixBase,
      active: profile.active ?? true,
      prixM2: profile.prixM2,
      prixCm2: profile.prixCm2,
      calculationType: profile.calculationType,
      hasPublishedFormula: profile.formulaVersions.some((f) => f.status === 'published'),
      hasDiscountTiers: profile.discountTiers.length > 0,
      hasMaterialPrices: profile.materialPrices.length > 0,
    })) {
      items.push(
        anomaly(
          `not-sellable-${art.id}`,
          'critical',
          `Article ${art.name} visible POS — tarification non vendable (prix/formule/paliers manquants)`,
          'Compléter le profil dans Administration → Catalogue POS puis publier',
          art.id,
        ),
      );
    }
  }

  for (const p of profiles) {
    if (!catalogueIds.has(p.articleId)) continue;

    const formula = p.formulaVersions[0];
    if (!formula) {
      items.push(
        anomaly(
          `no-formula-${p.articleId}`,
          'critical',
          `${p.articleLabel} : aucune formule`,
          'Sync catalogue ou migration PRIX 2026',
          p.articleId,
        ),
      );
    } else if (p.status === 'published' && formula.status !== 'published') {
      items.push(
        anomaly(
          `formula-mismatch-${p.articleId}`,
          'critical',
          `${p.articleLabel} : profil publié sans formule publiée`,
          'Republier la formule',
          p.articleId,
        ),
      );
    }

    if (p.discountTiers.length && tierOverlap(p.discountTiers)) {
      items.push(
        anomaly(
          `tier-overlap-${p.articleId}`,
          'warning',
          `${p.articleLabel} : paliers qui se chevauchent`,
          'Corriger les quantités min/max dans la carte article',
          p.articleId,
        ),
      );
    }

    for (const g of p.optionGroups) {
      for (const v of g.values) {
        if (g.impactsPrice && v.priceModifier === 0 && !v.forcePrice) {
          items.push(
            anomaly(
              `option-no-price-${p.articleId}-${v.id}`,
              'warning',
              `${p.articleLabel} — option « ${v.label} » impact prix sans montant`,
              'Définir priceModifier ou désactiver impact prix',
              p.articleId,
              'ProductOptionValue',
            ),
          );
        }
        if (g.isInformational && g.impactsPrice) {
          items.push(
            anomaly(
              `info-impact-${p.articleId}-${g.fieldKey}`,
              'critical',
              `${p.articleLabel} — groupe « ${g.label} » indicatif ET impact prix`,
              'Indicatif et impact prix sont exclusifs',
              p.articleId,
              'ProductOptionGroup',
            ),
          );
        }
      }
    }

    if ((p.prixBase == null || p.prixBase <= 0) && p.status === 'published' && !p.discountTiers.length
      && !isArticleSellable({
        articleId: p.articleId,
        status: p.status,
        prixBase: p.prixBase,
        active: p.active,
        prixM2: p.prixM2,
        prixCm2: p.prixCm2,
        calculationType: p.calculationType,
        hasPublishedFormula: p.formulaVersions.some((f) => f.status === 'published'),
        hasDiscountTiers: p.discountTiers.length > 0,
        hasMaterialPrices: p.materialPrices.length > 0,
      })) {
      items.push(
        anomaly(
          `zero-base-${p.articleId}`,
          'warning',
          `${p.articleLabel} : publié sans prix base ni paliers`,
          'Importer PRIX 2026 ou définir prix base',
          p.articleId,
        ),
      );
    }
  }

  if (salePriceCount > 0 && publishedSet.size < catalogueIds.size * 0.5) {
    items.push(
      anomaly(
        'migration-incomplete',
        'info',
        `${salePriceCount} lignes PRIX 2026 actives — seulement ${publishedSet.size}/${catalogueIds.size} articles publiés sur le moteur`,
        'Utiliser l\'onglet PRIX 2026 → comparateur migration',
        null,
        'SalePrice2026',
      ),
    );
  }

  if (fusionAnomalyCount > 0) {
    items.push(
      anomaly(
        'fusion-anomalies',
        'warning',
        `${fusionAnomalyCount} anomalie(s) fusion Excel ouvertes`,
        'Résoudre dans Admin Control → Anomalies',
        null,
        'FusionAnomaly',
      ),
    );
  }

  for (const m of materialsMissingPrice) {
    items.push(
      anomaly(
        `material-no-price-${m.id}`,
        'critical',
        `Matière « ${m.label} » (${m.family}) active POS sans prix base ni plafond`,
        'Renseigner le prix base dans Administration → Stock & Matières',
        null,
        'BaseMaterial',
      ),
    );
  }

  try {
    const { scanTextileAnomalies } = await import('@/lib/pricing/textile-anomalies');
    const textileAnoms = await scanTextileAnomalies();
    for (const t of textileAnoms) {
      items.push(
        anomaly(
          `textile-${t.id}`,
          t.level === 'error' ? 'critical' : t.level === 'warn' ? 'warning' : 'info',
          t.message,
          t.action,
          t.articleId === '*' ? null : t.articleId,
          'TextileAdmin',
        ),
      );
    }
  } catch {
    /* tables textile absentes / non migrées */
  }

  try {
    const gfRows = await prisma.grandFormatPricing.findMany({
      where: { active: true, visiblePOS: true },
      take: 80,
      include: { widths: { where: { active: true } } },
    });
    for (const g of gfRows) {
      if (!(g.pricePerM2 != null && g.pricePerM2 > 0) && !(g.basePrice != null && g.basePrice > 0)) {
        items.push(
          anomaly(
            `gf-no-prix-m2-${g.id}`,
            'critical',
            `Grand Format « ${g.name} » sans prix m² / A0`,
            'Renseigner PRIX M2 dans Administration → Grand format',
            null,
            'GrandFormatPricing',
          ),
        );
      }
      const hasLaize = (g.laize != null && g.laize > 0) || (g.widths?.length ?? 0) > 0 || Boolean(g.laizesJson);
      if (!hasLaize) {
        items.push(
          anomaly(
            `gf-no-laize-${g.id}`,
            'warning',
            `Grand Format « ${g.name} » sans laize configurée`,
            'Ajouter des laizes (table Laizes GF ou champ LAIZE)',
            null,
            'GrandFormatPricing',
          ),
        );
      }
    }
    const cutCount = await prisma.grandFormatCuttingMargin.count({ where: { active: true } }).catch(() => 0);
    if (cutCount < 6) {
      items.push(
        anomaly(
          'gf-cutting-margins-incomplete',
          'warning',
          `Marges découpe GF incomplètes (${cutCount}/6 formats A0–A5)`,
          'GET /api/admin-backoffice/direct-sale/grand-format/cutting-margins pour seed',
          null,
          'GrandFormatCuttingMargin',
        ),
      );
    }
  } catch {
    /* tables GF absentes */
  }

  try {
    const { scanFormatOptionDuplicates } = await import(
      '@/lib/services/merge-duplicate-format-options.service'
    );
    const { findFormatDuplicateGroups } = await import('@/lib/pos/normalize-format-options');
    const { getProductConfig } = await import('@/lib/data/config-types');
    const { filterProductConfigForPos } = await import('@/lib/pos/filter-pos-config');

    const dbDupes = await scanFormatOptionDuplicates(80);
    for (const d of dbDupes) {
      items.push(
        anomaly(
          `format-dupe-db-${d.articleId}-${d.fieldKey}`,
          'warning',
          `Formats équivalents en Admin (${d.fieldKey}) : ${d.labels.join(' · ')}`,
          'POST /api/admin-backoffice/options/chips/dedupe-formats pour fusionner',
          d.articleId,
          'ProductOptionValue',
        ),
      );
    }

    // Échantillon articles critiques POS commercial
    const sampleIds = [
      'imp-impression',
      'fly-std',
      'bk-livres',
      'ph-tirage',
      'ph-photobook',
      'ph-cadre',
      'pkg-doypack',
      'cal-mural',
      'cv-std',
      'gf-bache',
    ];
    for (const articleId of sampleIds) {
      const cfg = filterProductConfigForPos(getProductConfig(articleId), { articleId });
      if (!cfg) continue;
      for (const section of cfg.sections) {
        for (const field of section.fields) {
          if (!/format|^dim$/i.test(field.key) || !field.options?.length) continue;
          // Après filter, pas de doublons attendus — si bruts config ont encore des alias distincts non fusionnés
          const raw = getProductConfig(articleId);
          const rawField = raw?.sections
            .flatMap((s) => s.fields)
            .find((f) => f.key === field.key);
          if (!rawField?.options) continue;
          const groups = findFormatDuplicateGroups(rawField.options);
          // Si filter a bien dédoublonné, on ne remonte que si options filtrées ont encore des clés doubles
          const filteredGroups = findFormatDuplicateGroups(field.options);
          if (filteredGroups.length) {
            items.push(
              anomaly(
                `format-dupe-pos-${articleId}-${field.key}`,
                'critical',
                `POS ${articleId} affiche encore des formats doublons (${field.key})`,
                'Vérifier dedupeFormatOptions / filterProductConfigForPos',
                articleId,
                'POS',
              ),
            );
          } else if (groups.length) {
            items.push(
              anomaly(
                `format-alias-src-${articleId}-${field.key}`,
                'info',
                `Source config ${articleId} contient des alias format fusionnés côté POS (${groups.map((g) => g.join('/')).join(', ')})`,
                'Normaliser les libellés source vers le canonique mm',
                articleId,
                'config-types',
              ),
            );
          }
          // Format sans dimensions (code ISO court seul dans POS après filter = OK si canonisé)
          for (const opt of field.options) {
            if (/personnalis/i.test(opt)) continue;
            if (/^A[0-7]\+?$|^DL$|^B[56]$/i.test(opt.trim())) {
              items.push(
                anomaly(
                  `format-no-dims-${articleId}-${opt}`,
                  'warning',
                  `Format « ${opt} » sans dimensions affichées (${articleId})`,
                  'Utiliser le libellé canonique A4 — 210×297 mm',
                  articleId,
                  'POS',
                ),
              );
            }
          }
        }
      }
    }
  } catch (e) {
    console.warn('[scanPricingAnomalies] format dedupe', e);
  }

  // Flyer : moteur ISF + pliage — anomalies structurelles
  try {
    const { FLYER_CANONICAL_ID } = await import('@/lib/pos/flyer-catalog');
    const { getFlyerRuntimeParams, buildCanonicalFlyerPricingRules } = await import(
      '@/lib/pricing/flyer-pricing-rules'
    );
    const { FINITION_BASE_PRICES } = await import('@/lib/finition/finition-price-catalog');
    const flyerArt = CATALOGUE.find((a) => a.id === FLYER_CANONICAL_ID || a.category === 'flyers');
    const articleId = flyerArt?.id ?? FLYER_CANONICAL_ID;

    if (!flyerArt) {
      items.push(
        anomaly(
          'flyer-missing-catalog',
          'critical',
          'Article Flyer absent du catalogue POS',
          'Vérifier fly-std dans CATALOGUE / sync catalogue',
          FLYER_CANONICAL_ID,
          'Flyer',
        ),
      );
    }

    const params = getFlyerRuntimeParams();
    if (!params.sourcePrixBase || !/impression/i.test(params.sourcePrixBase)) {
      items.push(
        anomaly(
          'flyer-no-isf-source',
          'critical',
          'Flyer sans source Impression sans finition',
          'Administration → Flyers : SOURCE PRIX BASE = Impression sans finition',
          articleId,
          'Flyer',
        ),
      );
    }
    if (!params.prixPliA4 || params.prixPliA4 <= 0) {
      items.push(
        anomaly(
          'flyer-no-pli-price',
          'critical',
          'Flyer : pliage sans prix A4',
          'Définir PRIX PLI A4 (défaut 100 Ar) ou Finitions rainage FIN-RAINAGE-PLI',
          articleId,
          'Flyer',
        ),
      );
    } else if (params.prixPliA4 !== FINITION_BASE_PRICES.rainagePerPliA4) {
      items.push(
        anomaly(
          'flyer-pli-price-custom',
          'info',
          `Flyer : prix pli A4 = ${params.prixPliA4} Ar (catalogue rainage ${FINITION_BASE_PRICES.rainagePerPliA4})`,
          'Vérifier alignement Finitions & Reliures',
          articleId,
          'Flyer',
        ),
      );
    }

    const rules = buildCanonicalFlyerPricingRules(params);
    for (const rule of rules) {
      if (rule.nombrePlis < 0) continue;
      const expected = (() => {
        const m = rule.nombreVolets.match(/(\d+)\s*volets?/i);
        if (!m) return rule.nombrePlis;
        const v = parseInt(m[1]!, 10);
        return v <= 1 ? 0 : v - 1;
      })();
      if (rule.nombrePlis !== expected) {
        items.push(
          anomaly(
            `flyer-volets-plis-${rule.id}`,
            'warning',
            `Flyer « ${rule.nombreVolets} » : plis=${rule.nombrePlis} attendu ${expected}`,
            'Corriger FLYER_VOLET_OPTIONS / flyerVoletsToPlis',
            articleId,
            'Flyer',
          ),
        );
      }
    }

    if (flyerArt && !publishedSet.has(articleId) && (profileMap.get(articleId)?.active ?? true)) {
      items.push(
        anomaly(
          `flyer-pos-unsynced-${articleId}`,
          'warning',
          'Flyer visible POS — profil tarifaire non publié / sync à vérifier',
          'Publier le profil fly-std et Sync POS',
          articleId,
          'Flyer',
        ),
      );
    }
  } catch (e) {
    console.warn('[scanPricingAnomalies] flyer', e);
  }

  // Carterie : ISF feuille ÷ pièces + finitions + découpe
  try {
    const { buildCanonicalCarterieImpositionRules, getCarterieRuntimeParams } = await import(
      '@/lib/pricing/carterie-pricing-rules'
    );
    const params = getCarterieRuntimeParams();
    if (!params.utiliseImpressionSf || !/impression/i.test(params.sourcePrixBase)) {
      items.push(
        anomaly(
          'carterie-no-isf-source',
          'critical',
          'Carterie sans source Impression sans finition',
          'Administration → Carterie : SOURCE PRIX BASE = Impression sans finition',
          'cv-std',
          'Carterie',
        ),
      );
    }
    if (params.utiliseDecoupe && (!params.prixDecoupeParPiece || params.prixDecoupeParPiece <= 0)) {
      items.push(
        anomaly(
          'carterie-no-decoupe',
          'critical',
          'Carterie : découpe absente / prix 0',
          'Définir prix découpe pièce (50 Ar) ou Finitions FIN-DECOUPE-DROITE',
          'cv-std',
          'Carterie',
        ),
      );
    }
    const rules = buildCanonicalCarterieImpositionRules(params);
    for (const rule of rules) {
      if (/personnalis/i.test(rule.formatFini)) {
        if (rule.piecesParFeuille <= 0) {
          items.push(
            anomaly(
              `carterie-custom-capacity-${rule.id}`,
              'warning',
              'Format personnalisé carterie sans pièces / feuille',
              'Saisir capacité manuelle Admin',
              'cv-std',
              'Carterie',
            ),
          );
        }
        continue;
      }
      if (!rule.largeurMm || !rule.hauteurMm) {
        items.push(
          anomaly(
            `carterie-no-dims-${rule.id}`,
            'warning',
            `Format carterie « ${rule.formatFini} » sans dimensions mm`,
            'Corriger CARTERIE_DEFAULT_IMPOSITION_SEED',
            'cv-std',
            'Carterie',
          ),
        );
      }
      if (rule.piecesParFeuille <= 0) {
        items.push(
          anomaly(
            `carterie-zero-pieces-${rule.id}`,
            'critical',
            `Format « ${rule.formatFini} » : pièces / feuille = 0`,
            'Définir capacité Admin ou vérifier imposition auto',
            'cv-std',
            'Carterie',
          ),
        );
      }
    }
    for (const id of ['cv-std', 'cv-fidelite', 'cv-jeux']) {
      const art = CATALOGUE.find((a) => a.id === id);
      if (!art) continue;
      if (!publishedSet.has(id) && (profileMap.get(id)?.active ?? true)) {
        items.push(
          anomaly(
            `carterie-pos-unsynced-${id}`,
            'warning',
            `${art.name} visible POS — sync / profil à vérifier`,
            'Publier profil + Sync POS Carterie',
            id,
            'Carterie',
          ),
        );
      }
    }
  } catch (e) {
    console.warn('[scanPricingAnomalies] carterie', e);
  }

  try {
    const { getPublicationRuntimeParams } = await import('@/lib/pricing/publication-pricing-rules');
    const params = getPublicationRuntimeParams();
    if (!/impression/i.test(params.sourcePrixImpression)) {
      items.push(
        anomaly(
          'pub-no-isf-source',
          'critical',
          'Publications sans source Impression sans finition',
          'Administration → Publications',
          'bk-livres',
          'Publications',
        ),
      );
    }
    if (params.allowFallbackPrint && params.fallbackPuNoirA4 <= 0) {
      items.push(
        anomaly(
          'pub-fallback-noir-zero',
          'warning',
          'Fallback PU noir A4 = 0',
          'Saisir fallback Admin Publications',
          'bk-livres',
          'Publications',
        ),
      );
    }
  } catch (e) {
    console.warn('[scanPricingAnomalies] publications', e);
  }

  // Drift SystemConfig : règles Flyer / Carterie / Publications
  try {
    const { prisma } = await import('@/lib/prisma');
    const keys = [
      { key: 'flyer_pricing_rules', label: 'Flyer', href: 'Administration → Flyers → Sync POS' },
      { key: 'carterie_pricing_rules', label: 'Carterie', href: 'Administration → Carterie → Sync POS' },
      { key: 'publication_pricing_rules', label: 'Publications', href: 'Administration → Publications → Sync POS' },
    ] as const;
    const rows = await prisma.systemConfig
      .findMany({ where: { configKey: { in: keys.map((k) => k.key) } } })
      .catch(() => []);
    const present = new Set(rows.map((r) => r.configKey));
    for (const k of keys) {
      if (!present.has(k.key)) {
        items.push(
          anomaly(
            `sysconfig-missing-${k.key}`,
            'warning',
            `${k.label} : règles Admin absentes en SystemConfig`,
            k.href,
            k.key,
            k.label,
          ),
        );
      }
    }
  } catch (e) {
    console.warn('[scanPricingAnomalies] systemConfig rules', e);
  }

  const severityOrder: Record<PricingAnomalySeverity, number> = { critical: 0, warning: 1, info: 2 };
  return items.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);
}

export function countAnomaliesBySeverity(anomalies: PricingAnomaly[]) {
  return {
    critical: anomalies.filter((a) => a.severity === 'critical').length,
    warning: anomalies.filter((a) => a.severity === 'warning').length,
    info: anomalies.filter((a) => a.severity === 'info').length,
  };
}
