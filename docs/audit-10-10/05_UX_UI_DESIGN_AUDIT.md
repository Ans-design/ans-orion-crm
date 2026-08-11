# 05 — UX/UI Design Audit

## Inspiration cible

Linear / Stripe Dashboard / SAP Fiori : clarté, une action principale par écran, tables alignées, switches explicites.

## Points forts actuels

- Thème sombre premium ANS (rouge `#cc0033`, obsidian)
- Backoffice v2 : toggles ON/OFF, filtres chips, recherche intelligente options
- Matières & prix : KPIs, publication brouillon, drawer édition
- Stock modal : blocs métiers, champs conditionnels, SKU auto

## Écarts

| Problème | Zone | Priorité | Correction |
|---|---|---|---|
| Radius incohérent 7px vs 10px | Global vs mp/stk | P2 | Documenter `--orion-radius` + variantes module |
| Onglets administration trop nombreux | 26 sections | P1 | Regrouper en 11 hubs (ultraprompt §6) |
| Refresh perd contexte tab | Navigation | P1 | URL query `?section=` persistante |
| Texte coupé tables | Legacy tables | P2 | `table-layout`, colonnes fixes |
| Mode clair partiel | Certaines pages | P2 | Tokens CSS variables partout |

## Règles UX métier (4 questions par écran)

Chaque écran doit répondre : Où suis-je ? Statut ? Prochaine action ? Modules impactés ?

- **Hub commande** : `Commande360View` + `flow-context-banner` ✅
- **Backoffice** : KPI sync + anomalies ✅ partiel
- **Stock** : statut OK/critique/rupture ✅

## Accessibilité

- Contraste dark : globalement OK
- Labels formulaires : améliorés stock modal
- **À faire :** focus visible uniforme, aria sur menus « … »

## Mobile

- Sidebar responsive ✅
- Tables stock/backoffice : scroll horizontal OK
- POS mobile : tests Playwright `smoke-orion` ✅
