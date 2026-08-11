# V12 — Lot 4 Commercial bootstrap

## Livré

- `DevisAccepted` outbox **in-TX** (déjà Lot 3) + handler qui rappelle `bootstrapCommandeWorkflow` (idempotent repair).
- `ProductionDossier.commandeId` **UNIQUE** + race-safe create.
- `StudioBrief.commandeId` **UNIQUE** + race-safe create.
- Talk `createOrderConversation` déjà unique + race catch.
- `syncTasksForCommande` skip si tâches existantes.

## Statut

| Item | Statut |
|------|--------|
| Outbox + bootstrap reconcile | PASS |
| UNIQUE dossier/brief | PASS (migration additive) |
| releaseId snapshot devis | NOT_RUN |
| E2E double-accept | NOT_RUN |
