# Règles impact variables — Prix personnalisés

## Règles strictes

1. **Impact prix ON** → variable utilisée dans le calcul (`dynamic-engine`, options avec `priceModifier`)
2. **Indicatif ON** → affichée POS/devis, **n’impacte jamais le total**
3. **Jamais les deux ON** simultanément (toggle UI + validation backoffice)
4. Variables sans impact : remarque, orientation, couleur non tarifaire, notes client…

## Implémentation

- Flags DB : `ProductOptionGroup.impactsPrice`, `isInformational`
- Résolution : `lib/pricing/price-impact-rules.ts`
- Filtrage POS : `apply-product-option-overrides.ts`, `loadPosDynamicContext()`
- Backoffice : `OptionsChipsWorkspace` toggles → API PATCH chips

## Vérification

Simulateur : `POST /api/admin-backoffice/pricing/articles/:id/simulate`  
Comparer total avec/sans variable indicatif → total identique si indicatif seul.
