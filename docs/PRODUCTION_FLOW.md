# Flow Production / GPAO

## Création dossier

**Déclencheur :** Commande confirmée  
**Service :** `gpao-dossier-service.ts` → `syncDossierForCommande`

## Contenu dossier GPAO

- Commande, client, articles, quantités, options
- Fichiers & BAT liés
- Matières nécessaires, stock réservé
- Étapes, responsable, machine, date prévue
- Statut & historique

**Route :** `/production/dossiers`

## Étapes GPAO recommandées

1. Dossier reçu
2. Vérification fichiers
3. Stock vérifié
4. Préparation
5. Impression
6. Finition
7. Contrôle qualité
8. Prêt livraison
9. Clôturé

UI : `gpao-dossier-stepper.tsx`

## Poste opérateur

Workspace : `/workspace/production`

Actions :
- Démarrer / Pause / Terminer
- Signaler problème → maintenance
- Signaler perte → déchets
- Envoyer qualité → `/production/qualite`

## Action suivante

| Statut | Action |
|--------|--------|
| Dossier créé | Vérifier fichiers |
| Stock bloqué | Ouvrir stock / achat |
| Production terminée | Envoyer CQ |
| CQ validé | Préparer livraison |

## Workflow commande

Hub intégré : `/commandes/[id]`  
API : `/api/commandes/[id]/workflow`  
Code : `lib/workflow/commande-workflow.ts`

## Documents liés

- `docs/STOCK_FINANCE_SYNC.md`
- `docs/SYNC_MATRIX.md`
