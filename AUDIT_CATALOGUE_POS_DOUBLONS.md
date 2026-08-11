# AUDIT — Doublons Catalogue POS (fusion « personnalisé »)

Date : 2026-07-11  
Objectif : un article métier = une carte POS ; personnalisation = options/chips.

## Compteurs

| Métrique | Avant | Après |
|----------|------:|------:|
| Articles visibles POS | **124** | **113** |
| Textile | 19 | **12** |
| Goodies | 15 | **11** |
| Doublons critiques visibles | 11+ | **0** |
| Archivés (cette passe) | — | **11** (AVD019–029) |
| DirectSale `visiblePOS=false` | — | **12** |

Écart vs objectif ~95 : **+18** — articles métier réels restants (calendriers, finitions 29, événementiel 13, packaging, PLV structures, etc.). Pas de doublon « personnalisé » / format / palier dans le total.

## Doublons fusionnés

| Doublon | → Article principal | Options transférées |
|---------|---------------------|---------------------|
| AVD022 Bob personnalisé | `tx-bob` | technique Broderie/Impression |
| AVD021 Casquette personnalisée | `tx-casquette` | idem |
| AVD020 Polo personnalisé 220g | `tx-polo` | grammage **220g** |
| AVD019 T-shirt personnalisé 170g | `tx-tshirt` | grammage **170g** |
| AVD029 Sweat personnalisé | `tx-sweat` | technique Impression |
| AVD023 Trousse personnalisée | `tx-trousse` | technique |
| AVD025 Tote bag personnalisé A3 | `tx-totebag` | format A3 |
| AVD024 Mug personnalisé | `gd-mug` | sublimation |
| AVD026 Stylo personnalisé | `gd-stylo` | technique |
| AVD027 Pins personnalisé | `gd-pins` | technique |
| AVD028 Gourde personnalisée | `gd-gourde` | technique |
| AVD002 Gobelet (DS) | `pkg-gobelet` | (nom officiel conservé) |

Conservés (nom officiel catalogue avec « personnalisé ») :
- Gobelet personnalisé (`pkg-gobelet`)
- Boîte personnalisée (`pkg-boite`)
- Housse personnalisée (`gd-housse`)
- Enveloppe personnalisée (`evt-enveloppe`)
- Personnalisation libre (`fin-autres`)

## Source corrigée

| Couche | Fichier |
|--------|---------|
| Map doublons | `lib/pos/personalized-article-redundant.ts` |
| Merge / archive / options | `lib/services/merge-personalized-articles.service.ts` |
| Détection | `lib/services/detect-catalog-duplicates.service.ts` |
| Masquage IDs | `lib/data/catalogue-meta.ts` (`AVD019–029`) |
| Deep-link | `lib/pos/catalog-resolver.ts` |
| Builder + filtre UI | `catalogue-pos-builder.ts`, `use-pos-catalog-filters.ts` |
| Sync DirectSale | archive + `visiblePOS=false` |
| Boot POS | `getPosCatalogue` → `mergePersonalizedDuplicateArticles` |
| Admin | Actions → **Fusionner doublons personnalisés** |
| API | `action: merge-personalized-duplicates` / `detect-duplicates` / `merge-duplicates` |
| Repair | `npm run repair:pos-categories` |

## Règle métier appliquée

- Personnalisation ≠ nouvel article  
- Format / grammage / recto-verso / palier / laize = variables  
- Zéro suppression : archivage `[archivé→canonique]`  

## Tests

| # | Scénario | Résultat |
|---|----------|----------|
| 1 | Textiles : un seul Bob | OK |
| 2 | Une seule Casquette | OK |
| 3 | Un seul Polo (+ chip 220g) | OK |
| 4 | Compteur 124 → 113 | OK |
| 5–6 | F5 / boot merge | OK (DB + boot) |
| 7 | Admin sync → POS | OK |
| 8–9 | Excel / import | code prêt |
| 10 | Doublons critiques = 0 | OK |

Vitest : `tests/personalized-article-merge.test.ts`

## Commandes

```bash
npm run repair:pos-categories
npm run verify:pos-categories
npm run show:pos-catalogue
```

Admin Catalogue POS → Actions → **Fusionner doublons personnalisés**

## Critère final

**Validé** pour les doublons « personnalisé » textile/goodies. Total 113 > 95 justifié par le catalogue métier réel (finitions, événementiel, etc.), sans variantes parasitaires.
