# Audit complet — Prix articles personnalisés ANS ORION

Date : juillet 2026 · Backoffice v2 `/administration/backoffice`

## 1. Synthèse exécutive

Les **95 articles POS** sont majoritairement des produits **personnalisés** (imprimerie, grand format, textile, packaging). Le prix n’est pas un montant fixe unique : il dépend du profil article, des **Options/Chips**, des **formules dynamiques**, des **matières**, des **paliers**, des **règles métier** et de la **version publiée** consommée par le POS.

**Sources de vérité actuelles :**

| Domaine | Source réelle | Consommation |
|---------|---------------|--------------|
| Catalogue articles | `lib/data/catalogue-meta.ts` (`POS_CATALOGUE`, 95 articles) | POS, listes backoffice |
| Profils tarifaires | Prisma `ArticlePricingProfile` | Backoffice + moteur dynamique |
| Variables / chips | `ProductOptionGroup` + `ProductOptionValue` + seed `config-types` | Backoffice, POS (via overrides) |
| Formules | Prisma `FormulaVersion` (draft / published) | `dynamic-engine`, simulateur |
| Paliers | Prisma `DiscountTier` | POS (publiés uniquement) |
| Prix legacy | `SalePrice2026`, `PriceFormula` | Migration / fallback |
| Config globale | `SystemConfig` (admin-config) | Publication shell, variables globales |
| Calcul POS | `lib/pricing/ans-price-store.ts` → `resolvePrice()` | Panier, devis, simulateur |

## 2. Articles POS (95)

- **Liste canonique :** `POS_CATALOGUE` dans `catalogue-meta.ts`
- **Types de calcul :** `calculationType` sur profil (`piece`, `m2`, `cm2`, `forfait`, etc.) — inféré via `config-to-dynamic-pricing`
- **Publication :** `ArticlePricingProfile.status` = `draft` | `published` | `archived`
- **Risque identifié :** articles sans profil DB n’apparaissaient pas dans l’ancien tableau prix seul → **corrigé** par fusion catalogue + DB dans `listPricingArticles()`

## 3. Options / Chips

- Service : `admin-backoffice-chips.service.ts`
- Flags métier : `impactsPrice`, `isInformational`, `impactsStock`, `impactsProduction`, `visiblePos`, `active`
- Règle : **impact prix XOR indicatif** (mutuellement exclusifs côté UI)
- POS : `loadPosDynamicContext()` + `apply-product-option-overrides.ts`
- Sources : `database`, `config-types-seed`, `PRIX 2026`, legacy

## 4. Formules existantes

- Modèle : `FormulaVersion` (expression, pipeline, variables JSON, version, status)
- Chargement publié : `loadPublishedDynamicContext()`
- Chargement brouillon : `loadDraftDynamicContext()`
- Moteur : `lib/pricing/dynamic-engine.ts` + `calculate.ts`
- **Conservation :** aucune suppression — couche de compatibilité via `resolvePrice()` (legacy + dynamique)

## 5. Règles métier

- `StockRule`, `UrgencyRule` sur profil article
- Règles globales : `lib/pricing/price-impact-rules.ts`, anomalies `pricing-anomalies.ts`
- API règles : `/api/regles/*` (hors scope UI backoffice v2 — à lier dans phase 2)

## 6. Paliers / remises

- Module : `admin-backoffice-tiers.service.ts` + onglet **Paliers / Remises**
- Brouillon ≠ POS : POS lit `discountTiers` **publiés** uniquement
- Validation : `price-tier.validation.ts`

## 7. POS — synchronisation

```
Backoffice (brouillon) → publication → version publiée → POS / panier / nouveau devis
```

- Sync catalogue : `POST /api/admin-backoffice/sync-pos` → `syncCatalogueProfilesToDb()`
- Publication globale config : `POST /api/admin-backoffice/publish`
- Publication par article : `POST /api/dynamic-pricing/[id]` action `publish`
- Diff brouillon/publié : `getPricingArticleDiffPos()` (nouveau module pricing-custom)

## 8. Panier / Devis / Commandes — snapshots

- `resolvePrice()` retourne un snapshot dans le résultat
- Anciens devis/commandes : snapshots stockés en ligne — **non recalculés** à la publication
- Nouveaux devis : moteur + version publiée au moment de la création

## 9. APIs auditées

| Route | Statut |
|-------|--------|
| `GET /api/admin-backoffice/pricing/articles` | **Nouveau** — liste 95 articles fusionnée |
| `GET /api/admin-backoffice/pricing/articles/:id` | **Nouveau** — détail + variables + diff |
| `GET /api/admin-backoffice/pricing/articles/:id/diff-pos` | **Nouveau** |
| `POST /api/admin-backoffice/pricing/articles/:id/simulate` | **Nouveau** — moteur réel |
| `GET /api/admin-backoffice/pricing/variables` | **Nouveau** — vue globale variables |
| `POST /api/admin-backoffice/pricing/publish` | Alias publish global |
| `POST /api/admin-backoffice/pricing/sync-pos` | Alias sync POS |
| `GET /api/dynamic-pricing/[id]` | Existant — CRUD profil |
| `POST /api/admin-backoffice/pricing/simulate` | Existant — simulateur |

## 10. Anomalies détectées (scanner)

Via `scanPricingAnomalies()` :

- Article sans formule publiée
- Paliers chevauchants
- Profil publié sans prix base ni paliers
- Variables impact prix incohérentes
- Drift config ↔ DB (`sync-drift-service`)

## 11. Corrections prioritaires (backlog)

| Priorité | Action |
|----------|--------|
| P0 | Onglet **Prix & Calculs** opérationnel (fait) |
| P1 | Matrice prix par variable (édition inline tableau 3) |
| P1 | Règles métier par article dans panneau dédié |
| P2 | Snapshots enrichis devis (formule version, palier appliqué) |
| P2 | POS — badge « Palier appliqué » dans récap configurateur |
| P3 | Bulk publish multi-articles |

## 12. Fichiers clés

- UI : `components/backoffice-v2/pricing-custom/CustomPricingWorkspace.tsx`
- Service : `lib/server/modules/backoffice-v2/admin-backoffice-pricing.service.ts`
- Moteur : `lib/pricing/dynamic-engine.ts`, `ans-price-store.ts`
- Contexte : `lib/pricing/dynamic-pricing-context.ts`
