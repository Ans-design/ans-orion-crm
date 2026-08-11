# Recette UI/UX avant final — Vague 2 (V2-08)

| Date | 2026-07-19 (maj VF-P1/P2) |
|------|---------------------------|
| Statut | Directives vérifiées ; tokens radius **7px** ; Talk → `/messagerie` |

## Directives propriétaire — état

| Directive | État code | Action |
|-----------|-----------|--------|
| Pas de section Options/finitions dupliquée en publication | Tabs `options` → `articles` ; chips lib → `finitions` | **OK** (`CataloguePrixStockWorkspace`) |
| Retirer simulation de publication / admin quotidien | `sim`/`simulation` → `overview` | **OK** (redirigé, données conservées) |
| Versions tarifaires hors parcours quotidien | `versions` → `overview` | **OK** |
| Bibliothèque options obsolète hors nav | `chips`/`options-lib` → `finitions` | **OK** (pas de suppression données) |
| Formules & règles lisibles | Onglet `regles` + workspaces dédiés | Présent — amélioration continue |
| Modales centrées | Design system ORION existant | Pas de nouveau DS |
| Colonnes Admin/Commercial utiles | Documenté V2-04 | À densifier UI si besoin |
| Cohérence POS | Hub `/commandes/[id]` | Règle maître |

## Règle suppression UI

Masquer / rediriger ≠ supprimer routes, APIs, historiques. Confirmé dans cette vague.

## Design system (Vague Finale)

| Token | Valeur | Preuve |
|-------|--------|--------|
| `--radius` / `--radius-ui` / `--orion-radius` | **7px** | `globals.css` + `tailwind.config.ts` + `v2-ux-harmonize` |
| ANS Talk | Badge flottant → `/messagerie` | Pas de mini-panel |

## Responsive / a11y

| Contrôle | Statut |
|----------|--------|
| Breakpoints 320–1440 | NON EXÉCUTÉ (manuel checklist RC) |
| Clavier / focus | NON EXÉCUTÉ |
| WCAG 2.2 AA | Objectif — pas de scan automatisé cette session |
| Virtualisation listes | `computeWindowedSlice` testé (VF-QA01) |

## Prochaine passe UX (si validée)

1. Passer Formules & règles (hiérarchie, erreurs proches champs)  
2. Audit modales étroites à droite → Dialog centré  
3. États vide/erreur/permission sur écrans Admin principaux  

Sans toucher aux données ni aux historiques de versions.
