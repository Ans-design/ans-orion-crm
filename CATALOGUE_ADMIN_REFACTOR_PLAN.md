# Plan refonte Admin Catalogue Prix & Stock

## Phases

| Phase | Contenu | Statut |
|-------|---------|--------|
| 0 | Audit + snapshot prix + tests régression | En cours |
| 1 | Shell 8 studios + mapping `?studio=` / `?tab=` legacy | En cours |
| 2 | Cockpit KPI réels (`/api/admin/catalogue/cockpit`) | En cours |
| 3 | Studio Matières & Stocks unifié (inline existant) | Ensuite |
| 4 | Studio Prix cards familles (sans casser embeds) | Ensuite |
| 5 | Articles POS fiche 3 colonnes + archives masquées | Ensuite |
| 6 | Centre Excel + Anomalies actionnables | Ensuite |
| 7 | Sync POS status bar + audit history réel | Ensuite |
| 8 | Rapport final + build | Ensuite |

## Mapping onglets legacy → studios

| Ancien `?tab=` | Studio | Contenu |
|----------------|--------|---------|
| `vue` | `cockpit` | KPI + liens filtrés |
| `articles`, `chips`, `catalogue` | `articles` | Catalogue POS + chips |
| `matieres`, `prix-contexte`, `stock` | `matieres` | PMS embed |
| `isf`, `flyers`, `carterie`, `publications`, `grand-format`, `avd`, `paliers`, `regles` | `prix` | Familles + embeds |
| `finitions` | `finitions` | Finitions & Reliures embed |
| `excel` | `excel` | ExcelManager |
| `anomalies` | `anomalies` | AnomalyCenter |
| `historique`, `corbeille` | `historique` | Historique + corbeille |

## Règles

- Zéro suppression de routes : redirects only.
- Workspaces métier existants embarqués (dynamic import) — pas de rewrite pricing.
- Pas de seed auto après delete.
- Prix uniquement via engines / DB.
