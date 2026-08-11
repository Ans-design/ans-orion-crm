# Catalogue 2026 — Méthode tarifaire

Référentiel : `docs/references/catalogue-2026-prix-exacts.xlsx`  
Audit : Centre sync → section **Catalogue 2026** ou `GET /api/admin-backoffice/pricing/catalogue-2026/audit`

## Règles (feuille « Méthode »)

| N° | Règle | Application | Contrôle |
|----|-------|-------------|----------|
| 1 | **Recto uniquement** | Tous les prix « imprimé » sont au recto, sans verso inclus | Devis / POS : ne pas doubler pour verso sans ligne dédiée |
| 2 | **A4 = 1ʳᵉ tranche** | Petit format : prix de la première tranche quantité (souvent 1 ex.) | Palier POS aligné sur tranche minimale Excel |
| 3 | **A0 ≈ 1 m²** | Grand format : tarif surface basé sur 1 m² (format A0 comme référence) | Unités en **cm** et **m²** ; pas de conversion implicite |
| 4 | **Pas d’extrapolation** | Aucun prix estimé ou dérivé si absent du référentiel | Matières « Sans prix exact » → anomalie `REF_2026_SANS_TARIF` |
| 5 | **Source auditable** | Excel versionné = vérité 2026 ; DB synchronisée par action admin explicite | Journal audit à chaque « Appliquer prix exacts 2026 » |
| 6 | **Services séparés** | Finitions (pelliculage, reliure, pose…) dans `FinishingPrice`, pas dans `basePrintPrice` | Import feuille « Services exacts » (S001…) |

## Contenu du classeur

- **Matières** (160) : `excelRowId` → `BaseMaterial.basePrintPrice` (95 avec prix imprimé recto).
- **Services exacts** (45) : `S00x` → `FinishingPrice`.
- **Sans prix exact** (65) : backlog qualité — **ne pas inventer** de prix.
- **Articles prix imprimés exacts** (280) : fichier séparé `catalogue-articles-prix-imprimes-exacts-2026.xlsx` → **variantes de prix** rattachées aux **~95 parents POS** (`cv-std`, `fly-std`…). **Pas** 280 cartes catalogue.

## Articles vs matières vs variantes

| Rôle | Exemples | Module |
|------|----------|--------|
| Matière de base (calcul) | Offset, PCB, Bâche, Vinyle, PVC plaque brute | Matières |
| Carte commerciale (~95) | Flyer, CV, Roll-up, Stylo, T-shirt | Prix articles / Catalogue POS / POS caisse |
| Variante prix (ART-xxx) | Flyer A6, CV PCB 85×55, T-shirt taille M | Lookup / chips / grilles — `visiblePOS=false` |

Un roll-up / stylo / flyer fini n’est **jamais** une `BaseMaterial` (archivage `REF_2026_ARTICLE_NOT_MATERIAL`).  
Une ligne ART n’est **jamais** une carte POS (préfixe `[prix→parent]`, merge `merge-art-variants-to-parents`).

API articles : `POST /api/admin-backoffice/pricing/catalogue-articles-2026`  
Actions : `apply` (variantes + parents), `merge-parents`, `audit`.  
UI : Prix articles → « Appliquer Catalogue Articles 2026 ».

Mapping : `lib/pos/article-2026-canonical-map.ts` (`resolveArticle2026CanonicalPosId`).

## Application en base

1. **Audit** : comparer Excel ↔ DB (`match_ok`, `prix_divergent`, `prix_manquant_db`, `absent_db`, `sans_tarif_2026`).
2. **Appliquer** : upsert contrôlé (pas de `replaceAll`) — matières avec prix + services.
3. **Propagation** : publication matières + invalidation caches admin.

## Unités imprimerie (alignement ORION)

- Grand format : centimètres, surfaces en m².
- Petit format / standard : millimètres.
- Jamais de dimension sans unité affichée.

## Anomalies

| Code | Signification |
|------|----------------|
| `REF_2026_SANS_TARIF` | ID listé « Sans prix exact » — informatif, pas de prix généré |
| `BASE_PRICE_MISSING` | Prix base absent en DB (message adapté si aussi sans tarif 2026) |
| `prix_divergent` (audit) | DB ≠ Excel pour une matière référencée |

## Scripts

```bash
npx tsx scripts/analyse-catalogue-2026.ts
# Génère aussi data/references/catalogue-2026-sans-prix-ids.json
```
