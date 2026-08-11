# Phase 3 — Snapshots, POS, bulk publish & audit sync

## Livré (phase 3)

### 1. Snapshots devis / panier enrichis

- Nouvelle enveloppe `_pricingSnapshot` (v1) dans `configSnapshot` de chaque ligne panier/devis
- Contenu : `formulaVersion`, `formulaExpression`, `appliedTier`, `priceSource`, `prixUnitaire`, `totalHT`, `dynamicEngine`
- Service : `lib/pricing/pricing-snapshot-meta.ts`
- Helpers paliers : `pickAppliedConfigTier`, `pickAppliedDbTier` dans `lib/pricing/tier-price.ts`
- Intégration panier : `lib/services/cart-service.ts` via `mergeConfigWithPricingSnapshot`
- POS ajout panier : snapshot serveur depuis `/api/pricing/simulate`
- Affichage devis : badge formule + palier sur `/devis` (détail lignes)

### 2. POS — badge « Palier appliqué »

- `PosPriceCalc.appliedTier` + `formulaVersion`
- Affichage dans `ProductPricingPanel` (récap configurateur)
- Source : snapshot serveur ou fallback client `productConfig.priceTiers`

### 3. Bulk publish multi-articles

- API : `POST /api/admin-backoffice/pricing/publish-bulk`
  - `{ mode: "all_draft" }` ou `{ articleIds: [...] }`
- Service : `publishBulkArticleDynamicPricing` dans `lib/pricing/publish-dynamic-pricing.ts`
- UI : bouton **Publier brouillons (N)** dans `CustomPricingWorkspace`

---

## Audit post-phase 3

### API

`GET /api/admin-backoffice/pricing/audit`

Retourne un rapport agrégé :

| Section | Source |
|---------|--------|
| Anomalies tarifaires | `scanPricingAnomalies` |
| Drift sync global | `runFullSyncDriftAnalysis` |
| Profils brouillon | `listPricingArticles` |
| Diff brouillon vs publié (échantillon) | `getPricingArticleDiffPos` |
| Articles sans formule | catalogue + profils DB |

### UI

Bouton **Audit sync** dans l’onglet Prix & Calculs → panneau inline avec compteurs et top 30 issues.

### Service

`lib/server/modules/backoffice-v2/pricing-sync-audit.service.ts` — `runPricingSyncAudit()`

---

## Catégories d’anomalies détectées

| Catégorie | Exemples |
|-----------|----------|
| **anomaly** | Sans profil, sans formule, paliers qui se chevauchent, option impact prix sans montant |
| **sync** | Catalogue code ↔ DB, config admin ↔ catalogue, paiements commande |
| **publish** | Profils brouillon non publiés |
| **pos_drift** | Variables / formule / paliers différents brouillon vs publié |

---

## Actions recommandées (workflow)

1. **Audit sync** → identifier critical / warning
2. Corriger en backoffice (formules, paliers, chips)
3. **Publier prix** (article) ou **Publier brouillons** (batch)
4. Vérifier POS : badge palier + prix cohérent
5. Créer devis test → vérifier `_pricingSnapshot` sur lignes

---

## URLs test local (port 3020)

| Écran | URL |
|-------|-----|
| Prix & Calculs + audit | `/administration/backoffice?tab=pricing-custom` |
| POS palier | `/pos/evt-affiche` |
| Devis snapshots | `/devis` (après panier → devis) |

---

## Fichiers clés

- `lib/pricing/pricing-snapshot-meta.ts`
- `lib/pricing/tier-price.ts`
- `lib/pricing/dynamic-engine.ts`
- `lib/services/cart-service.ts`
- `components/pos/product-pricing-panel.tsx`
- `app/api/admin-backoffice/pricing/publish-bulk/route.ts`
- `app/api/admin-backoffice/pricing/audit/route.ts`
- `lib/server/modules/backoffice-v2/pricing-sync-audit.service.ts`
