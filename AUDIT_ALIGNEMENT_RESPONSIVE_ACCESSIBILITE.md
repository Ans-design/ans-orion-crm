# AUDIT — Alignement · Responsive · Accessibilité

Date : 2026-07-11

## Alignement

| Point | Avant | Après |
| --- | --- | --- |
| Marges négatives | Présentes localement | Bannies dans couche globale |
| Toolbars | Gaps irréguliers | `flex` + `gap: var(--toolbar-gap)` |
| KPI | Cartes hétérogènes | `.orion-ds-metric` + grille 12 |
| Page header | Styles divergents | `.orion-ds-page-header` flex wrap |
| Colonnes tables | Headers lourds | Padding unifié 10–12px |

## Responsive

Breakpoints appliqués dans `orion-ui-ux-complete.css` :

- **≤575** : KPI 2 colonnes, tables scroll-x contrôlé
- **576–767** : spans adaptés
- **768–991** : headers colonne
- **≥992** : layout desktop shell

Règles globales :

- `box-sizing: border-box`
- `overflow-x: clip` sur html/body/viewport
- `flex-wrap` toolbars
- images `max-width: 100%`
- pas de `max-width` forcé sur le contenu ERP

## Accessibilité

| Critère | Statut |
| --- | --- |
| Focus visible | ✅ anneau rouge `--focus-ring` |
| Touch 44×44 | ✅ `--touch-min` boutons / icon-btn |
| Contraste AA texte | ✅ tokens clair/sombre ultra |
| Disabled lisible | ✅ opacity ≥ 0.85 + fond dédié |
| Ordre DOM | ✅ shell inchangé (sidebar → header → main) |
| Outline retiré sans alt. | ❌ corrigé via `:focus-visible` |

## Tests automatisés

- `tests/a11y-tokens.test.ts` — radius **10px**, présence spacing + focus-visible

## Restes / risques

- Certains TSX utilisent encore des classes violet littérales (CSS remap partiel)
- Tables très larges (master-data) : scroll horizontal métier justifié
- Validation manuelle clavier à confirmer sur POS + Admin
