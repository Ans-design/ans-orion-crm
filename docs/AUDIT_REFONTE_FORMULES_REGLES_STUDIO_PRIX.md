# AUDIT — Refonte UX Formules & règles (Studio Prix)

**Référence :** `docs/references/PROMPT_ULTRA_REFONTE_DESIGN_FORMULES_REGLES_ANS_CRM_V3.txt`  
**Date :** 2026-07-15

## Problème → correction

| Problème actuel | Impact | Correction | Composant | Test |
|-----------------|--------|------------|-----------|------|
| Colonne profils trop étroite, noms tronqués | Illisible | Bibliothèque 280–320px + 2 lignes + filtres | `PricingProfileLibrary` | `formula-display` |
| Préfixes `[archivé→…]` / codes techniques | Confusion métier | `displayProfileLabel` | `formula-display.ts` | unit |
| Statuts anglais / contradictoires | Erreur interprétation | Labels FR + un état principal | `resolveProfileListState` | unit |
| Layout 2 colonnes plat | Pas un constructeur | Workspace 3 zones + drawer &lt;1360 | `FormulaWorkspace` | manuel |
| Cases + flèches minuscules | Difficile à utiliser | Step cards + actions 36px + inspecteur | `FormulaCanvas` | manuel |
| Pas de palette / inspecteur | Config obscure | Palette + Inspecteur + Simulation | panels | manuel |
| Save/Publish éloignés | Risque de pub accidentelle | Toolbar sticky Enregistrer → Publier | `FormulaToolbar` | manuel |
| Simulateur absent | Pas de feedback | Panel → `/api/pricing/simulate` | `FormulaSimulationPanel` | API existante |
| « Marge » ambiguë / min = plafond | Erreur tarifaire | Marque vs marge ; plancher | `price-builder-blocks` | unit NL |

## Architecture livrée

```
PricingFormulasStudio → FormulaWorkspace
  ├─ PricingProfileLibrary (zone A)
  └─ FormulaEditorCore
       ├─ FormulaToolbar
       ├─ FormulaSummary
       ├─ FormulaCanvas (+ stages)
       └─ droite : Inspecteur | Palette | Simulation
```

Moteur inchangé : `FormulaVersion` + PATCH/POST `/api/dynamic-pricing/[id]` + `resolvePrice` via simulate.

## Smoke

`?studio=prix&tab=regles` · local `http://127.0.0.1:3020`

## Suite

- Mode Expert expression
- Virtualisation &gt;100 profils
- Scénarios CI pré-publication
- E2E Playwright parcours §21
- PublishFormulaDialog note de version
