# AUDIT — Articles vente directe & synchronisation POS

**Date :** 2026-07-10  
**Objectif :** Base de données prix simple pour articles standards + sync Administration → POS Commercial.

---

## Tables créées (Prisma)

| Table | Rôle |
|-------|------|
| `DirectSaleArticle` | Articles à prix unitaire direct |
| `DirectSalePriceTier` | Paliers remise quantité |
| `DirectSaleAddon` | Suppléments optionnels |
| `FinishingPrice` | Finitions / reliures (séparé) |
| `GrandFormatPricing` | Tarifs GF m²/ml (séparé) |
| `GraphicDesignService` | Prestations design (séparé) |

**Fichier :** `prisma/schema.prisma`

---

## Modules Administration

| Route | Statut |
|-------|--------|
| `/administration/articles-vente-directe` | ✅ Tableau + import/export Excel + sync POS |
| `/administration/paliers-vente-directe` | ✅ Import Excel paliers |
| `/administration/finitions-reliures` | 🟡 Structure DB + page hub (UI tableau à compléter) |
| `/administration/grand-format-prix` | 🟡 Structure DB + page hub |
| `/administration/design-graphique` | 🟡 Structure DB + page hub |

Navigation : **Catalogue & POS** → Articles vente directe · **Prix & Calculs** → Paliers / Finitions / GF / Design

---

## Modèles Excel

| Fichier | Colonnes |
|---------|----------|
| `lib/backoffice/direct-sale-excel-format.ts` | ID, ARTICLE, CATÉGORIE, PRIX UNITAIRE, RÉFÉRENCE, VISIBLE POS, STATUT… |
| Paliers | ID, ARTICLE, RÉFÉRENCE ARTICLE, QTÉ MIN/MAX, TYPE REMISE, VALEUR, PRIX FINAL |

---

## Synchronisation POS

**Service :** `lib/services/direct-sale-pos-sync.service.ts`

Workflow :
1. Sauvegarde `DirectSaleArticle` (published + visiblePOS)
2. Upsert `ArticlePricingProfile` (`calculationType: piece`, `prixBase: unitPrice`)
3. Sync `DiscountTier` depuis `DirectSalePriceTier` (source `direct-sale-sync`)
4. `notifyAdminModuleMutation` + invalidation cache
5. POS lit via `GET /api/pos/catalogue` (profils publiés)

**Résolution ID POS :** `reference` si article catalogue connu (ex. `cv-std`), sinon `ds-{slug}`.

**API sync :** `POST /api/admin-backoffice/direct-sale/articles` `{ action: "sync-all" }`

---

## API

| Méthode | Route |
|---------|-------|
| GET/POST | `/api/admin-backoffice/direct-sale/articles` |
| PATCH/DELETE | `/api/admin-backoffice/direct-sale/articles/[id]` |
| POST | `.../articles/import-excel` |
| GET | `.../articles/export-excel` |
| POST | `.../tiers/import-excel` |

---

## Tests

| Test | Fichier | Statut |
|------|---------|--------|
| Parse Excel article | `tests/direct-sale.test.ts` | ✅ |
| Parse paliers | `tests/direct-sale.test.ts` | ✅ |
| resolvePosArticleId | `tests/direct-sale.test.ts` | ✅ |

### Tests manuels (checklist)

| # | Scénario | Commande / action |
|---|----------|-------------------|
| 1 | Créer carte de visite 1000 Ar, visible POS | Admin → Articles vente directe → Publier → `/pos/cv-std` |
| 2 | Modifier prix 1200 Ar | Édition inline → sync auto |
| 3 | Palier 101-500 -10% | Import paliers Excel |
| 4 | Import Excel articles | Import → vérifier tableau + POS |
| 5 | Export / réimport | Export → modifier → réimport |
| 6 | Prix matière base | Stock & Matières → publish → GF liés |
| 7 | Hors standard | POS → « Devis personnalisé » si `requiresQuoteIfCustom` |

---

## Non régressions

- Stock & Matières : inchangé
- Catalogue POS / chips : inchangé
- `ArticlePricingProfile` existants : upsert par `articleId`, pas de suppression
- Pas de seed automatique de données prix

---

## Bugs restants / P2

- UI tableau complet Finitions / Grand format / Design (import Excel dédié)
- `DirectSaleAddon` : UI suppléments POS
- Lien matière → recalcul auto `unitPrice` vente directe (règle métier à valider)
- Badge « Prix standard / Devis si hors standard » dans configurateur POS

---

## Fichiers clés

```
prisma/schema.prisma
lib/services/direct-sale-pos-sync.service.ts
lib/server/modules/direct-sale/direct-sale.service.ts
lib/backoffice/direct-sale-excel-format.ts
components/administration/direct-sale/DirectSaleWorkspace.tsx
app/api/admin-backoffice/direct-sale/**
app/(app)/administration/articles-vente-directe/page.tsx
```
