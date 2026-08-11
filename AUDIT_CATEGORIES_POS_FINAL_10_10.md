# AUDIT FINAL — Catégories POS Catalogue (score 10/10)

Date : 2026-07-11  
Commande de vérification : `npm run verify:pos-categories`

## Score

**10/10 IMPECCABLE** — 0 erreur, 0 warning

## Compteurs POS (builder, actifs publiés hors doublons)

| Catégorie | Count |
|-----------|------:|
| Grand Format & PVC | 13 |
| Finitions & Reliures | 29 |
| PLV & Chevalets | **8** |
| Textiles | 19 |
| Goodies | 15 |
| Événementiel | 13 |
| Carterie | 6 |
| Flyers | 4 |
| Impression sans finition | 4 |
| Photo | 4 |
| Autres | … |
| **Total visible** | **131** |

## Grand Format & PVC (13 — matières uniquement)

Vinyle blanc, Vinyle transparent, Dos bleu, **Bâche**, Tissu drapeau, One-Way Vision, Autocollant réfléchissant, Frosted Film, Papier Photo GF, PVC rigide, **Acrylic / Plexiglas**, PP Film, Toile canvas.

Absent (corrigé) : Roll-up, X-Banner, bâches A2/A3/A4, paliers, PVC opaque/translucide, doublons plexi.

## Finitions & Reliures

Uniquement finitions/façonnage. Couture Oriflammes reste en finitions (garde-fou anti-PLV).

## Optimisations finales (cette passe)

- Alias deep-link `GF001–GF005` → `gf-bache` (`bache-catalog.ts`)
- Alias `GF013/GF014` → `plv-rollup` / `plv-xbanner`
- Alias `gf-acrylic` / `GF010` → `gf-plexi` (`plexi-catalog.ts`)
- Garde-fou « Couture Oriflammes » ≠ Oriflamme PLV
- Masquage `GrandFormatPricing` GF011 (Photo) hors table GF
- Scripts npm : `verify:pos-categories`, `repair:pos-categories`
- Script audit : `scripts/verify-pos-categories-final.ts`

## Tests

| Suite | Résultat |
|-------|----------|
| `pos-category-taxonomy.test.ts` | 6/6 OK |
| `pos-grand-format-category.test.ts` | 9/9 OK |
| `catalogue-pos-builder.test.ts` | 4/4 OK |
| Vérif DB live | 10/10 |

## Critère métier

| Règle | Statut |
|-------|--------|
| Finitions = finitions seules | OK |
| GF = matières m²/ml/plaque | OK |
| 1 carte Bâche | OK |
| 1 carte Acrylic/Plexiglas | OK |
| Roll-up / X-Banner → PLV | OK |
| PVC petit → Impression | OK |
| Persistance F5 / restart | OK (DB + merge boot) |

## Passe 2 (optimisation anti-régression)

- `DIRECT_SALE_CATEGORIES` aligné taxonomie POS (plus de `grand_format_std` avec Roll-up)
- Alias `grand_format_std` / `cartes` / `petit_format` / `design` → ids officiels
- Sync DirectSale normalise la catégorie à chaque sync
- Sync-all lance merge GF + repair catégories après sync
- Import Excel DirectSale normalise les catégories
- Tests : `direct-sale-categories-taxonomy.test.ts`

## Passe 3 — consolidation PLV

- **1 carte Roll-up** (`plv-rollup`) + **1 carte X-Banner** (`plv-xbanner`)
- SKUs DirectSale AVD008 / AVD009 / AVD011 archivés comme cartes POS (conservés en Admin DirectSale)
- Deep-link `/pos/AVD008` → `plv-rollup` avec prefill `type: Roll-up standard`
- Admin Catalogue : select **Changer catégorie** sur l’article sélectionné
- PLV compteur : **8** (était 11 avec doublons)

## Passe 4 — sync prix AVD → PLV

- Prix DirectSale **AVD008** (150 000), **AVD009** (250 000), **AVD011** (85 000) → runtime + `prixBase` des canoniques `plv-rollup` / `plv-xbanner`
- `computePlvPrice` utilise le prix pièce flat si type (/format) matche un SKU AVD
- Boot catalogue + sync-all + repair GF déclenchent la sync
- Scripts locaux forcent `DATABASE_URL=file:./prisma/dev.db` si URL non-SQLite

Commandes :
- `npm run verify:pos-categories` *(affiche aussi le catalogue complet)*
- `npm run repair:pos-categories`
- `npm run normalize:direct-sale-categories`

## Passe 6 — Carterie / Flyers / utilitaires

- Masque `__volume_global__` (Remises volume globales) — pas une carte vendable
- Fusion POS : AVD012 → `cv-fidelite` ; AVD013/014 → `cv-std` ; AVD016–018 → `fly-std`
- Deep-links + prefill face/format ; Admin DirectSale conserve les SKUs
- Boot catalogue + sync-all + repair lancent `mergeRedundantDirectSalePosCards`
