# Audit — Fusion variantes POS (Impression SF / Photo / Finitions)

Date : 2026-07-11  
Score vérification : **10/10**  
Articles visibles : **95** (avant ~113)

## Problème corrigé

Cartes POS redondantes créées depuis des **références Admin** (diamètre, format, matière) au lieu d’options dans un article métier unique.

## Règle appliquée

**1 article métier = 1 carte POS.**  
Variantes = options / chips / lignes Excel Admin.

## Résultats

| Catégorie | Avant | Après |
|-----------|------:|------:|
| Impression sans finition | 3 (ISF + PVC opaque + PVC translucide) | **1** |
| Photo | 4 (+ Photo grand format) | **3** |
| Finitions & Reliures | ~29 (spirales 6–18 mm, collage A3/A4, plastif A5/A6…) | **14** |
| **Total POS** | ~113 | **95** |

### Impression sans finition
- Carte unique : `imp-impression`
- PVC opaque / translucide → matières configurateur (+ Papier photo, Offset, PCM, PCB, Glossy…)
- Prefill legacy : `GF008` → PVC translucide, `GF009` → PVC opaque

### Photo
- Conservés : Tirage photo, Cadre photo, Photobook
- `GF011` Photo grand format → archivé → matière `gf-photo` (Grand Format)

### Finitions fusionnées
| Variantes archivées | Carte principale |
|---------------------|------------------|
| Spirales 6–18 mm | `fin-reliure` Reliure spirale |
| Collage A3/A4, contre-collé | `fin-collage` Collage |
| Plastification A5/A6/… | `fin-plastification` |
| Pelliculage R/V formats | `fin-pelliculage` |
| Découpe m² / ml / petit format | `fin-decoupe` |
| Rainage « standard » | `fin-rainage` |

## Fichiers clés

- `lib/pos/finition-variant-redundant.ts` — détection + `mergeVariantCardsIntoMainArticle()`
- `lib/services/merge-variant-pos-cards.service.ts` — archive DB + chips prix
- `lib/services/direct-sale-pos-sync.service.ts` — `syncFinishingPriceToPos` → canonique + options
- `lib/data/catalogue-meta.ts` — `POS_HIDDEN_ARTICLE_IDS` + filtre variantes
- Excel Finitions : colonnes FAMILLE / TYPE / RÉFÉRENCE / FORMAT / DIAMÈTRE / PAGES MIN-MAX

## Persistance

Après F5 / redémarrage :
1. Boot `getPosCatalogue` relance `mergeVariantPosCards`
2. Sync FinishingPrice ne recrée plus de carte par référence
3. Filtres UI + builder excluent les variantes

## Commandes

```bash
npm run repair:pos-categories
npm run verify:pos-categories
npx vitest run tests/finition-variant-redundant.test.ts
```

## Tests manuels (checklist)

1. POS > Impression sans finition → 1 carte ; PVC en matières  
2. POS > Photo → pas de Photo grand format  
3. POS > Finitions → 1 Reliure spirale (pas 7 diamètres)  
4. Configurateur Reliure → diamètres + prix Admin  
5. Collage / Plastification / Pelliculage → formats en options  
6. Export Excel Finitions → lignes spirale Admin, pas cartes POS  
7. F5 → redondances absentes  
8. Admin Catalogue POS = mêmes compteurs
