# Backoffice — Plan de refonte

## Objectif

Interface unifiée **Backoffice Catalogue & Tarification** : article + variables + prix + stock + sync + historique sans quitter l’écran.

## URL canonique

`/administration/backoffice?article={id}`

Alias : `/backoffice` → redirection

## Layout (3 colonnes)

1. **Gauche** — Catalogue (familles, filtres, liste articles, badges statut/prix/anomalie)
2. **Centre** — Fiche article (6 onglets unifiés)
3. **Droite** — Panneau contextuel (publication, anomalies, raccourcis POS)

## 6 onglets fiche article

| Onglet | Contenu | Réutilisation |
|--------|---------|---------------|
| Général | Infos, statut | `ArticlePricingCard` section `infos` / `statut` |
| Variables & Options | Chips, variables | sections `options`, `variables` |
| Prix & Formules | Matières, formule, paliers, simulateur | sections `matieres`…`sim` |
| Stock & Contraintes | Règles stock | section `statut` |
| Synchronisation POS | Centre sync | `SyncCenterPanel` |
| Historique & Anomalies | Versions, alertes | sections `versions`, `anomalies` |

## Architecture cible

```
components/backoffice/
  BackofficeCatalogShell.tsx      ← orchestrateur
  BackofficeHeader.tsx
  BackofficeArticleSidebar.tsx
  BackofficeArticleEditor.tsx
  BackofficeContextPanel.tsx

lib/server/modules/backoffice/
  backoffice.service.ts
  backoffice-anomaly.service.ts
  backoffice-sync.service.ts
  backoffice.types.ts

lib/server/modules/pricing/
  pricing-simulator.service.ts
```

## APIs standardisées (format `{ ok, data }`)

- `GET /api/backoffice/catalog`
- `GET /api/backoffice/anomalies`
- `POST /api/backoffice/pricing/simulate`
- `POST /api/backoffice/publish`
- `POST /api/backoffice/sync`
- `GET /api/backoffice/audit-log`

## Phases restantes

- [ ] Table variables éditable inline (prompt §5)
- [ ] Grille prix matière/format/grammage unifiée (prompt §6)
- [ ] Historique audit enrichi par article
- [ ] Bouton « corriger » par anomalie avec deep-link onglet
- [ ] Tests E2E Playwright backoffice

## Règle absolue

Aucune suppression de route/module — les anciennes sections `/administration/*` restent actives.
