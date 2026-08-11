# AUDIT — Prix & règles métier ANS ORION

Date : 2026-07-11 (mise à jour post-P0/P1)  
Référence : ultra-prompt `ultraprompt_prix_regles_metier_ans_orion.txt`

## 1. Cartographie des bases prix (A–G)

| Base | Rôle | État | Emplacement principal |
|------|------|------|------------------------|
| A. Stock & Matières | Prix matière / stock | OK | `/administration/matieres`, `BaseMaterial` |
| B. Matières vierges | Prix achat sans impression | OK | `/administration/matieres-vierges`, `BlankMaterialPrice` + Excel |
| C. Impression sans finition | Prix A4 matière/format/face | OK | `/administration/impression-sf`, `BasePrintingPrice` + Excel ; fallback TS seulement si DB vide |
| D. Finitions / Reliures | Suppléments façonnage | OK | `/administration/finitions-reliures`, `FinishingPrice` (+ seed « Collage contre-collé ») |
| E. Articles vente directe | Prix unitaires standards | OK | `/administration/articles-vente-directe` |
| F. Grand format | m² / format / laize | OK | `/administration/grand-format-prix` |
| G. Paliers / Remises | Remises quantité | OK | `DiscountTier` publiés → `published-volume-tiers.ts` (ISF + générique + DirectSale) |

## 2. Gaps vs ultra-prompt §§1–17

| § | Thème | État | Implémentation |
|---|-------|------|----------------|
| 3–4 | ISF A4 + formules formats | OK | `PaperFormatRule` + `computePaperFormatPrice` (découpe / A4+ / A3+) |
| 5–6 | Paramètres + custom supérieur | OK | `resolvePaperFormatForCustomSize` (orientation-free, format supérieur) |
| 7 | Recto/verso supports | OK | `SupportFaceRule` + filtre POS + garde moteur |
| 8 | Équivalences matières | OK | `MaterialPriceEquivalence` + Admin/Excel |
| 9 | Papier épais / contre-collé | OK | `ThickPaperRule` + matières vierges |
| 10 | Collage finition | OK | Ligne `FinishingPrice` « Collage contre-collé » (seed idempotent) |
| 11 | Paliers unifiés | OK | `ensureVolumeDiscountTiersSeeded` + runtime `setPublishedVolumeDiscountTiers` |
| 13 | Sync règles | OK | `lib/services/pricing-rules-sync.service.ts` |
| 14 | Excel ISF | OK | Import/export `BasePrintingPrice` via `/api/.../base-printing` |
| 15 | Cohérence | OK | Bouton « Vérifier cohérence » (ISF + formats) → `verifyPricingConsistency` |

## 3. Risques (résiduels / P2)

1. **Drift Centre sync** : règles formats/faces/équivalences pas encore dans le drift UI Centre sync (P2).
2. **Fallback TS** : encore présent si tables vides — volontaire ; anomalie signalée par verify, pas de prix silencieux une fois DB publiée.
3. **Corbeille / duplication** sur nouvelles tables : pattern DirectSale à étendre (P2).
4. **E2E Admin→POS** (modifier A4 → F5 POS) : suite tests manuelle / E2E à planifier (P2).

## 4. Roadmap

- **P0** : ✅ PaperFormatRule, SupportFaceRule, Excel ISF, route `/administration/impression-sf`, sync + verify
- **P1** : ✅ Équivalences, ThickPaperRule, matières vierges, collage CC, paliers sous `DiscountTier`
- **P2** : Drift Centre sync, corbeille, E2E Admin→POS

## 5. Fichiers clés

| Zone | Fichiers |
|------|----------|
| Schema | `prisma/schema.prisma` (`PaperFormatRule`, `SupportFaceRule`, `MaterialPriceEquivalence`, `ThickPaperRule`, `BlankMaterialPrice`) |
| Engine | `lib/pricing/paper-format-rules.ts`, `support-face-rules.ts`, `impression-sf-pricing.ts`, `published-volume-tiers.ts` |
| POS | `lib/pos/impression-sf-policy.ts` |
| Sync | `lib/services/pricing-rules-sync.service.ts` |
| Admin | `ImpressionSfWorkspace`, `PricingRulesWorkspace`, `MaterialRulesWorkspace` |
| Tests | `tests/paper-format-face-rules.test.ts`, `impression-sf-pricing`, `thick-paper-grammage`, `impression-sf-policy` (41 OK) |

## 6. Principes non négociables

- Zéro suppression de routes/modules
- Prix / découpe / suppléments uniquement DB/Excel
- Seed idempotent (table vide seulement)
- Ne pas casser Stock & POS Commercial
