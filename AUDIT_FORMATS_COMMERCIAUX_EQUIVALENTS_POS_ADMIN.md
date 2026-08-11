# AUDIT — Formats commerciaux équivalents POS / Admin

**Date :** 2026-07-12  
**Objectif :** Afficher dimensions exactes + équivalence commerciale arrondie, sans doublon, avec le même tarif que le format ISO.

---

## Résumé

Les formats standards affichent désormais :

`A4 — 210×297 mm (≈ 20×30 cm — tarif A4)`

- Un seul chip (pas de `A4` / `20×30 cm` / `A4 — 210×297 mm` séparés)
- Portrait / paysage équivalents pour le tarif (`30×20 cm` = `20×30 cm` = A4)
- Format personnalisé proche d’un arrondi commercial → tarif ISO correspondant
- Au-delà de la tolérance → règle existante du format supérieur

---

## Formats corrigés / alias commerciaux

| Standard | Exact | Alias commercial | Tarif |
|----------|-------|------------------|-------|
| A5 | 148×210 mm | ≈ 15×20 cm | A5 |
| A4 | 210×297 mm | ≈ 20×30 cm | A4 |
| A3 | 297×420 mm | ≈ 30×40 cm | A3 |
| A2 | 420×594 mm | ≈ 40×60 cm | A2 |
| A1 | 594×841 mm | ≈ 60×80 cm | A1 |
| A0 | 841×1189 mm | ≈ 80×120 cm | A0 |

Constante centrale : `FORMAT_COMMERCIAL_ALIASES` dans `lib/pos/format-commercial-aliases.ts`.

A6 / DL / B5 / A3+ : libellé exact mm sans alias commercial (pas dans la table métier demandée).

---

## Doublons fusionnés

Identité unique `iso:A4` pour :

- `A4`
- `A4 — 210×297 mm`
- `A4 — 210×297 mm (≈ 20×30 cm — tarif A4)`
- `20×30 cm` / `30×20 cm`
- `200×300 mm` / `300×200 mm`

Idem pour A5 / A3 / A2 / A1 / A0.  
Admin : `mergeDuplicateFormatOptions` archive les doublons + enrichit metadata (`commercialAlias`, `priceEquivalent`, …).

---

## Règles de prix appliquées

1. `resolvePriceEquivalentFromDims(w, h)` — match ±10 mm sur dims commerciales arrondies  
2. Branché dans `resolvePaperFormatForCustomSize` **avant** le format supérieur  
3. Exemples :
   - 200×300 / 20×30 / 30×20 → **A4**
   - 300×400 / 30×40 → **A3**
   - 400×600 / 60×40 → **A2**
   - 220×310 → **pas** A4 commercial → format supérieur (ex. A3)

Calcul technique : toujours via code ISO / dims exactes — pas de mix cm/mm dans le moteur.

---

## Articles testés

| Article | ID | Résultat |
|---------|-----|----------|
| Impression SF | `imp-impression` | OK — A4 unique + alias |
| Flyer | `fly-std` | OK |
| Livres | `bk-livres` | OK |
| Tirage photo | `ph-tirage` | OK |
| Photobook | `ph-photobook` | OK |
| Cadre | `ph-cadre` | OK |
| CV | `cv-std` | OK |
| Calendrier | `cal-mural` | OK |
| Doypack / GF | `pkg-doypack` / `gf-bache` | OK (dédup / cm libres GF) |

---

## Impact Admin

- Fusion chips format : libellé canonique + metadata alias / équivalence prix  
- API existante : `POST /api/admin-backoffice/options/chips/dedupe-formats`  
- Sync Admin → POS : dédup formats au sync options  
- Anomalies : doublons format encore détectés si présents en DB

Colonnes metadata utiles :

`formatStandard` · `exactDimensions` · `commercialAlias` · `priceEquivalent` · `unit` · `comment`

---

## Impact POS Commercial

- Chips : `A4 — 210×297 mm (≈ 20×30 cm — tarif A4)`  
- Sous-texte optionnel : `getCommercialFormatSubtitle` / `displayFormatChipSubtitle`  
- Sélection compatible anciens paniers (`A5` court ≡ chip long) via `formatIdentityKey`  
- Photo chips source mises à jour avec alias  
- Pas de chip `20×30 cm` séparé

---

## Fichiers clés

| Fichier | Rôle |
|---------|------|
| `lib/pos/format-commercial-aliases.ts` | Table + normalizeFormatAlias / prix |
| `lib/pos/normalize-format-options.ts` | Dédup + libellés commerciaux |
| `lib/pos/format-display.ts` | Affichage chips |
| `lib/pricing/paper-format-rules.ts` | Prix custom → alias commercial d’abord |
| `lib/pricing/photo-format-equivalences.ts` | Chips photo avec alias |
| `lib/services/merge-duplicate-format-options.service.ts` | Metadata Admin |
| `tests/format-commercial-aliases.test.ts` | Tests dédiés |

---

## Tests

```text
npx vitest run tests/format-commercial-aliases.test.ts
                 tests/normalize-format-options.test.ts
                 tests/format-chip-sort.test.ts
                 tests/photo-format-equivalences.test.ts
→ 47 passed

npx next build → OK
```

| # | Critère | Statut |
|---|---------|--------|
| 1 | Une seule chip A4 | OK |
| 2 | Libellé A4 + ≈ 20×30 cm — tarif A4 | OK |
| 3–4 | 20×30 / 30×20 = prix A4 | OK |
| 5–6 | A3 + 30×40 = tarif A3 | OK |
| 7–8 | A2 + 60×40 = tarif A2 | OK |
| 9–10 | Pas de doublon POS / logique Admin | OK |
| 11 | Compat panier (identité format) | OK |
| 12 | Anciennes données (libellés courts) | OK |

---

## Critère final

**Validé** : formats standards = dimension exacte + équivalence commerciale, sans doublon, même tarif que l’ISO, POS + Admin + build.
