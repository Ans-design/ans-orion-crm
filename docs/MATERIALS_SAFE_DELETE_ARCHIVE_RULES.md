# Archivage sécurisé matières

## Suppression

- Matière **non utilisée** → `DELETE` autorisé
- Erreur contrainte → bascule automatique en **archivage**

## Archivage

- `archived=true`, `archivedAt=now()`
- `active=false`, `visiblePos=false`
- `publicationStatus=draft`
- Snapshots devis/commande **inchangés**

## Jamais supprimer

- Matière liée à un devis ou commande
- Matière dans un snapshot historique
- Matière avec mouvements stock
