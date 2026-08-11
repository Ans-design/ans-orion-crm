# AUDIT — Dédoublonnage formats POS Commercial

**Date :** 2026-07-12  
**Objectif :** Une seule option format par standard (libellé canonique mm), ordre logique, sync Admin → POS sans casser prix / panier / devis.

---

## Résumé

Correction globale des doublons du type `A5` + `A5 — 148×210 mm` dans le Catalogue Commercial POS et l’Admin Options / Chips.

- Normalisation centrale : `normalizeFormatOption` / `dedupeFormatOptions`
- Application POS : filtre config + rendu chips (`format`, `dim`, champs format-like)
- Fusion Admin intelligente (archive, pas de suppression) + sync Commercial
- Anomalies scanner + tests vitest + build Next OK

---

## Articles audités (tests automatiques)

| Article | ID | Résultat |
|---------|-----|----------|
| Livres & publications | `bk-livres` | OK — formats uniques, mm |
| Flyer | `fly-std` | OK |
| Tirage photo | `ph-tirage` | OK |
| Doypack | `pkg-doypack` | OK |
| Calendrier mural | `cal-mural` | OK |
| Carte de visite | `cv-std` | OK |
| Impression sans finition | `imp-impression` | OK |
| Grand format bâche | `gf-bache` | OK — ISO canonisés ; cm libres conservés |
| Photobook | `ph-photobook` | OK |
| Cadre photo | `ph-cadre` | OK |

Également normalisés en source config : finitions (`dim`), PLV, bloc-notes, événementiel, shared `_evtFormats*`, `IMPRESSION_SF_FORMATS`.

---

## Formats doublons trouvés (pattern)

Équivalents reconnus comme une seule identité :

| Variantes | Canonique gardé |
|-----------|-----------------|
| `A6` / `A6 — 105×148 mm` | `A6 — 105×148 mm` |
| `A5` / `A5 148x210` / `148×210 mm` / `A5 — 148×210 mm` | `A5 — 148×210 mm` |
| `A4` / `A4 — 210×297 mm` | `A4 — 210×297 mm` |
| `A3` / `A3 — 297×420 mm` | `A3 — 297×420 mm` |
| `A3+` / `SRA3` / `A3+ — 320×450 mm` | `A3+ — 320×450 mm` |
| `A2` … `A0` idem | libellés complets mm |
| `DL`, `B5`, `B6` | libellés complets mm |

---

## Formats fusionnés / options archivées

### Runtime POS (toujours)

`filterProductConfigForPos` + page POS appliquent `dedupeFormatOptions` → aucun doublon affiché même si Admin/source contient encore des alias.

### Admin DB (à la demande / sync)

Service `mergeDuplicateFormatOptions` :

1. Garde l’option canonique (préférence libellé long + `priceModifier` max)
2. Transfère `forcePrice` / montant
3. **Archive** le doublon (`active: false`, metadata `archivedReason: format-duplicate-merge`)
4. Audit log `format_options_dedupe`
5. Invalide caches via `notifyAdminModuleMutation`
6. Branché aussi dans `adminToCommercialSync` (sync options)

**API :** `POST /api/admin-backoffice/options/chips/dedupe-formats`  
Body : `{ articleId?, dryRun?, syncPos? }`

Les compteurs `archived` / `merges` dépendent de l’état DB local au moment de l’appel (dryRun recommandé avant prod).

---

## Fichiers modifiés / créés

| Fichier | Rôle |
|---------|------|
| `lib/pos/normalize-format-options.ts` | **Nouveau** — normalisation + dédup + fusion records |
| `lib/pos/format-display.ts` | Délègue à `normalizeFormatOption` |
| `lib/pos/filter-pos-config.ts` | Dédup formats (dont `dim`) |
| `lib/pos/apply-product-option-overrides.ts` | Dédup après merge Admin |
| `lib/pos/sort-pos-options.ts` | Réexports |
| `lib/dimensions/petit-format-units.ts` | B5/B6 + `A5 148x210` |
| `lib/pricing/paper-format-rules.ts` | `findPaperFormatRule` accepte libellés longs |
| `lib/pricing/pricing-anomalies.ts` | Anomalies doublons format |
| `lib/services/merge-duplicate-format-options.service.ts` | **Nouveau** — fusion Admin |
| `lib/services/admin-to-commercial-sync.service.ts` | Appel dédup au sync |
| `app/api/admin-backoffice/options/chips/dedupe-formats/route.ts` | **Nouveau** API |
| `app/(app)/pos/[id]/page.tsx` | Chips format/dim dédupliqués |
| Configs produits (impressions, finitions, PLV, bloc-notes, événementiel, GF, shared, catalog ISF) | Libellés source canoniques |
| `tests/normalize-format-options.test.ts` | **Nouveau** |

---

## Impact Admin

- Options / Chips : fusion non destructive (archive)
- Visibilité / impact prix / ordre : conservés sur le chip canonique
- Sync Admin → POS Commercial déclenchable après fusion
- Anomalies : warning si doublons actifs encore en DB ; critical si POS filtre laisse encore un doublon

---

## Impact POS Commercial

- Une seule puce par format
- Libellés complets `A4 — 210×297 mm` (petits formats en **mm**)
- Tri surface croissante (existant `sortFormatChipOptions`)
- Grand format : ISO → mm canonique ; tailles libres `30×60 cm` etc. conservées (`keepCm`)
- Anciens paniers / devis avec `A5` court : matching via `displayFormatChipLabel` (même identité)
- Prix : `findPaperFormatRule('A4 — 210×297 mm')` résout bien `A4`

---

## Tests effectués

```text
npx vitest run tests/normalize-format-options.test.ts
→ 18 passed

Aussi OK : petit-format-units, format-chip-sort, photo-format-equivalences, sync-binding-format-display

npx next build → succès
```

Critères :

1. Pas de doublon A5/A5 dim — OK  
2. Idem A4 / A3 — OK  
3. Tri logique — OK (via sort existant)  
4. mm petits formats — OK  
5. Prix format long — OK (`findPaperFormatRule`)  
6. Build — OK  

---

## Anomalies restantes possibles

| Anomalie | Traitement |
|----------|------------|
| Doublons encore en DB Admin avant premier sync | Warning scanner + API dedupe-formats |
| Alias encore en fichier source (rares) | Info `format-alias-src-*` si filter masque déjà |
| Formats spéciaux non-ISO (90×90, presentoir noms…) | Conservés ; tri par surface |
| Mix cm/mm dans un même bloc GF | ISO en mm + libres en cm (accepté métier GF) |

---

## Critère final

**Validé** côté code runtime + configs critiques + tests + build : chaque format apparaît une seule fois dans le POS filtré, avec libellé clair, unité cohérente, ordre logique, sans casser la résolution tarifaire des formats papier.
