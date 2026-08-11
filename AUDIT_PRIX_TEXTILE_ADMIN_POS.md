# AUDIT — Prix Textile Admin + POS

Date : 2026-07-12  
Projet : ANS ORION / ANS CRM V3

## Verdict

Base de prix textile Admin → DB → moteur POS livrée.

- Formule standard : **support vierge + marquage + main d’œuvre**
- Lambahoany : **surface m² × prix/m² + main d’œuvre**
- Excel 5 feuilles, Admin `/administration/textile`, anomalies, sync POS, seed Bob 8 000 Ar

## Tables créées (Prisma)

| Modèle | Rôle |
|--------|------|
| `TextileBaseSupportPrice` | Support vierge (pièce) ou prix m² |
| `TextileMarkingPrice` | Technique × taille/zone marquage |
| `TextileLaborPrice` | Main d’œuvre (article ou `*`) |
| `TextilePricingRule` | `STANDARD` / `SURFACE_M2` + flags |
| `TextileDiscountTier` | Paliers remise qty |

Soft delete (`deletedAt`), `excelId`, `status`, `visiblePOS` — pattern Goodies.

## Formules

### Textile standard (Bob, Casquette, T-shirt…)

```
unitHT = supportVierge + marquage + labor (+ options)
totalHT = unitHT × qty
puis TextileDiscountTier (percent | fixed | unit_price)
```

Exemple Bob : 5 000 + 2 000 + 1 000 = **8 000 Ar**  
Qty 10 + remise 10 % → sous-total 80 000 − 8 000 = **72 000 Ar**

### Lambahoany

```
surfaceM2 = (largeur_cm/100) × (hauteur_cm/100)  // ou parse format « 100×150 cm »
unitHT = round(surfaceM2 × prixM2) + labor
```

Exemple : 100×150 cm → 1,5 m² × 20 000 = 30 000 + MO 2 000 = **32 000 Ar**

## Fichiers principaux

- `prisma/schema.prisma` — modèles Textile*
- `lib/pricing/textile-pricing.ts` — moteur
- `lib/pricing/calculate.ts` — branche dédiée avant fallback
- `lib/pricing/dynamic-engine.ts` — early-return textile (même moteur)
- `lib/pricing/pricing-anomalies.ts` — remonte anomalies textile
- `lib/pos/pos-price-policy.ts` — moteur dédié `tx-*`, href Admin Textile
- `lib/backoffice/textile-excel-format.ts` — 5 feuilles Excel
- `lib/server/modules/textile/textile-admin.service.ts` — CRUD / import / export
- `lib/services/textile-admin-sync.service.ts` — sync POS + audit
- `lib/pricing/textile-anomalies.ts` — scan anomalies
- `app/(app)/administration/textile/page.tsx` + `TextileAdminWorkspace`
- `app/api/admin-backoffice/textile/**`
- `scripts/seed-textile-admin.ts`
- `tests/textile-pricing.test.ts`
- Config POS Lambahoany enrichie (dimensions, technique, finition) dans `textile.ts`
- Nav : `admin-macro-modules.ts`, `backoffice-redirects.ts`, `routes.ts`

## Tests

| Test | Résultat |
|------|----------|
| Unit Bob 8000 | OK (`tests/textile-pricing.test.ts`) |
| Unit Bob qty 10 / −10 % → 72000 | OK |
| Unit Lambahoany 1,5 m² × 20000 + MO | OK |
| Support manquant → message clair | OK |
| Seed Admin Bob / Lambahoany | OK (`scripts/seed-textile-admin.ts`) |

Relancer seed local :

```bash
npx tsx scripts/seed-textile-admin.ts
npx tsx tests/textile-pricing.test.ts
```

## Import / Export Excel

Feuilles :

1. `01_SUPPORTS_TEXTILES`
2. `02_MARQUAGE_TEXTILE`
3. `03_MAIN_OEUVRE_TEXTILE`
4. `04_RÈGLES_TEXTILE`
5. `05_PALIERS_REMISES_TEXTILE`

Via Admin Textile → Import / Export, ou API `POST /api/admin-backoffice/textile` (`export-workbook` / `import-workbook`).

## Sync POS

`syncTextileAdminToPos` → `syncArticleOptionsToPOS` + audit log.  
Bouton **Sync POS** dans l’UI. Les prix sont lus à chaque calcul depuis les tables Textile* (pas de prix hardcodés React pour le chemin Admin).

## Doublons « personnalisé »

Réutilise `lib/pos/personalized-article-redundant.ts` + `merge-personalized-articles.service.ts` (AVD021/022 → Bob/Casquette, etc.). Pas de suppression brutale — archive + redirection.

## Anomalies restantes / suites possibles

- Supports placeholder (autres tx-* hors Bob) à affiner métier (prix réels)
- Enrichir chips POS depuis tables Textile (filtrage dynamique strict optionnel)
- Neon/prod : `prisma db push` / migrate sur l’environnement cible avant seed
- Anomalies textile aussi remontées via `scanPricingAnomalies` (CPS)

## Critères d’acceptation

| # | Critère | Statut |
|---|---------|--------|
| 1 | Bob = support + marquage + MO | OK |
| 2 | Textiles standards même formule | OK (règles seed) |
| 3 | Lambahoany surface m² | OK |
| 4 | Prix modifiables Admin | OK `/administration/textile` |
| 5 | Excel export/import | OK 5 feuilles |
| 6 | Chips POS depuis config + sync | OK (config-types + sync) |
| 7 | Modif Admin → recalcul POS | OK (moteur DB) |
| 8 | Doublons personnalisés | OK (merge existant) |
| 9 | Anomalies prix manquant | OK onglet Anomalies |
| 10 | Pas « Prix à configurer » si données OK | OK (moteur dédié) |
| 11 | Données existantes non cassées | OK (fallback si pas de data Admin) |
| 12 | Panier / devis | via `calculatePrice` |
| 13 | Build | OK (`npm run build`) |
