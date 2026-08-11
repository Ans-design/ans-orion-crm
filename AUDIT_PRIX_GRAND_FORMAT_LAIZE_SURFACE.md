# AUDIT — Prix Grand Format / Laize / Surface m² / Marge découpe

**Date :** 2026-07-12  
**Objectif :** Base prix m² Admin, règle laize seuil 30 cm, marges découpe A0–A5, Lambahoany surface, sync POS.

---

## Résumé

L’existant (`computeGrandFormatBillable`, Admin Grand Format, Excel) a été **perfectionné** :

1. **Seuil 30 cm corrigé** : `diff ≥ 30 cm` → pas de conversion ; `diff < 30 cm` → force laize  
2. **`calculateGrandFormatPrice`** — API centrale (surface + laize + marges + finitions)  
3. **Marges découpe A0–A5** — table Prisma + API Admin + seed  
4. **Laizes multi** — modèle `GrandFormatMaterialWidth` + `laizesJson`  
5. **Lambahoany** — reste surface m² ; marge découpe si format ISO  
6. **POS** — libellés conversion + prix m² + marge découpe  
7. **Tests métier** (exemples prompt) OK · anomalies GF

---

## Tables créées / corrigées

| Table | Statut |
|-------|--------|
| `GrandFormatPricing` | Enrichi (`laizesJson`, relation `widths`) |
| `GrandFormatMaterialWidth` | **Nouveau** — laizes par matière |
| `GrandFormatCuttingMargin` | **Nouveau** — A0→A5 % marge |

Prix de base = **HT / m²** (A0 ≈ 1 m² commercial).

---

## Règles appliquées

### Laize (seuil 30 cm)

```
diffLaize = laizeCompatible − petiteDimension
si diffLaize < 0,30 m  → largeur facturée = laize
si diffLaize ≥ 0,30 m  → largeur facturée = petiteDimension
```

Laize compatible = première laize ≥ petite dimension (orientations testées).

### Marges découpe (défaut Admin)

| Format | Ratio A0 | Marge |
|--------|----------|-------|
| A0 | 1 | 0 % |
| A1 | 1/2 | 5 % |
| A2 | 1/4 | 10 % |
| A3 | 1/8 | 15 % |
| A4 | 1/16 | 20 % |
| A5 | 1/32 | 25 % |

Exemple PVC 120 000 Ar/m² : A1 → 63 000 · A2 → 33 000 · A3 → 17 250 · A4 → 9 000 · A5 → 4 688 Ar

### Formule centrale

`calculateGrandFormatPrice` (`lib/grand-format/calculate-grand-format-price.ts`)

---

## Tests calculs

| Test | Résultat |
|------|----------|
| PVC 0,9×1,5 / laize 1,2 → 1,35 m² × 120k = **162 000** | OK |
| PVC 0,95×1,8 / laize 1,2 → 2,16 m² × 120k = **259 200** | OK |
| A1 / A2 / A3 / A4 / A5 marges | OK |
| Lambahoany 1,5 m² × 20k = 30 000 | OK (formule) |
| Régression 125→conversion / 115→non | OK |

`npx vitest run tests/grand-format-laize-surface-30cm.test.ts` + suites GF → **42 passed**

---

## Impact POS Commercial

- Surface réelle / facturée (existant)
- Message : `Conversion laize : oui/non, écart … 30 cm`
- Prix m² + marge découpe si format standard
- Moteur dynamique utilise `calculateGrandFormatPrice`

---

## Impact Administration

- `/administration/grand-format-prix` — prix m² / laizes (existant)
- API marges : `GET/POST /api/admin-backoffice/direct-sale/grand-format/cutting-margins` (seed auto)
- Excel : colonnes GF + `GF_CUTTING_MARGIN_EXCEL_COLUMNS`
- Anomalies : matière sans prix m², sans laize, marges incomplètes

---

## Fichiers clés

| Fichier | Rôle |
|---------|------|
| `lib/grand-format/pricing.ts` | Seuil 30 cm strict |
| `lib/grand-format/cutting-margins.ts` | Marges A0–A5 |
| `lib/grand-format/calculate-grand-format-price.ts` | API centrale |
| `lib/services/gf-cutting-margins.service.ts` | Admin seed/CRUD |
| `lib/pricing/dynamic-engine.ts` | Branchement POS |
| `lib/pricing/textile-pricing.ts` | Lambahoany + marge ISO |
| `prisma/schema.prisma` | Modèles Width + CuttingMargin |
| `tests/grand-format-laize-surface-30cm.test.ts` | Tests prompt |

---

## Anomalies restantes / suites

- Remplir laizes multi via Admin (`GrandFormatMaterialWidth`) pour chaque matière  
- Export Excel multi-feuilles 01–05 : colonnes GF + marges prêtes ; feuilles Finitions/Règles à compléter progressivement  
- Relancer `npx prisma generate` si le DLL client est verrouillé (serveur local)

---

## Critères d’acceptation

| # | Critère | Statut |
|---|---------|--------|
| 1 | Prix m² / A0 | OK |
| 2 | Laizes modifiables Admin | OK (table + champ existant) |
| 3–6 | Seuil 30 cm + laize supérieure | OK |
| 7–8 | Marges découpe A0–A5 modifiables | OK |
| 9 | Lambahoany surface m² | OK |
| 10 | POS surface réelle/facturée | OK |
| 11–12 | Panier / sync | OK (moteur dynamique) |
| 13 | Excel | Partiel (GF + colonnes marges) |
| 14 | Build | À valider après `prisma generate` (EPERM local possible) |

**Validé côté calculs métier et tests.**
