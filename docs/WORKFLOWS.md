# ANS ORION — Workflows métier

> Complément flow : `docs/FLOW_GLOBAL.md` · Matrice sync : `docs/SYNC_MATRIX.md` · Parcours : `docs/USER_JOURNEYS.md`

## Flux principal CRM

```
Client → Devis → BAT → Commande → Stock réservé → GPAO → Production
  → Contrôle qualité → Livraison → Facture → Paiement → Historique
```

## Statuts (référentiel `lib/data/status-registry.ts`)

### Devis
Brouillon → Envoyé → En attente → Accepté / Refusé / Expiré

### Commande (`lib/data/commande-status.ts`)
Voir `COMMANDE_STATUTS` — hub `/commandes/[id]`

### Production
En attente → En cours → Terminé / Bloqué

### BAT (Proof)
En attente → Envoyé → Validé / Refusé

### Livraison
Préparation → Prêt → En livraison → Livré

### Paiement
Non payé → Acompte → Partiel → Payé

## Transitions automatisées (services)

| Transition | Service |
|------------|---------|
| Devis accepté → Commande | `devis-accept-service.ts` |
| Commande → Stock | `commande-stock-workflow.ts` |
| Commande → GPAO | `gpao-dossier-service.ts`, `bat-gpao-sync.ts` |
| Commande → Facture | `facture-workflow-service.ts` |
| Workflow commande | `commande-workflow-service.ts` |

## API workflow commande

`GET/PATCH /api/commandes/[id]/workflow`

## Backoffice Flux & statuts

Section `/administration/flux-statuts` — visualisation du référentiel et transitions recommandées (`lib/data/business-workflow.ts`).

## Règle phase actuelle

Transitions **simples et modifiables** — pas de moteur BPM complexe.
