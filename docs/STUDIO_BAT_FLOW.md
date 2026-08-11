# Flow Studio & BAT

## Déclencheur

Commande confirmée + article nécessitant validation graphique → **BAT requis**

## Étapes

1. Commande confirmée
2. Vérifier si BAT requis (règle article / option)
3. Créer brief — `/studio/briefs`
4. Lier fichiers sources — `/studio/fichiers`
5. Affecter graphiste
6. Créer version BAT — `/bat`
7. Envoyer validation client (token `/bat/valider/[token]`)
8. Gérer corrections
9. Valider BAT → production autorisée

## Statuts studio

| Statut | Description |
|--------|-------------|
| Brief reçu | Demande enregistrée |
| À concevoir | En attente graphiste |
| En conception | Travail en cours |
| BAT envoyé | En attente client |
| Correction demandée | Retour client |
| Validé client | BAT approuvé |
| Prêt prépresse | Fichiers prêts |
| Envoyé production | Lien GPAO |

## Action suivante

| Situation | Action |
|-----------|--------|
| BAT requis non créé | Créer brief |
| BAT en correction | Ouvrir commentaires |
| BAT validé | Envoyer production / débloquer GPAO |

Service : `bat-gpao-sync.ts`

## ANS Talk

Conversation liée à : client, devis, commande, BAT, production  
Route : `/messagerie` (plein écran, non flottant)

## Documents liés

- `docs/FLOW_GLOBAL.md`
- `docs/PRODUCTION_FLOW.md`
