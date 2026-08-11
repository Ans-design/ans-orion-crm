# Flow POS → Devis → Commande

## Étapes

1. **Choisir ou créer client** — `/clients`
2. **Sélectionner article** — `/pos` (catalogue Backoffice)
3. **Configurer** — options, dimensions, matière, grammage, format, quantité
4. **Vérifier stock** — alerte si insuffisant
5. **Calculer prix** — formules Backoffice (`catalogue-service.ts`)
6. **Ajouter au panier** — `/panier`
7. **Générer devis** — `/devis`
8. **Envoyer / valider** — statut Devis
9. **Transformer en commande** — `devis-accept-service.ts`

## Règles

| Règle | Détail |
|-------|--------|
| POS lit Backoffice | Articles **Actifs** uniquement |
| Options filtrées | Celles autorisées par article |
| Prix figé au devis validé | Historique commande indépendant des futurs changements prix |
| Stock avant validation | Vérification + réservation si possible |

## Action suivante par statut

| Statut devis | Action | Lien |
|--------------|--------|------|
| Brouillon | Envoyer au client | `/devis` |
| Envoyé | Relancer / attendre | `/cm/relances` |
| Accepté | **Créer commande** | `/commandes` |
| Refusé | Archiver / nouveau devis | `/devis` |

Code : `lib/flow/next-action.ts` → clé `devis.*`

## Services

- `lib/services/catalogue-service.ts` — lecture catalogue DB
- `lib/services/catalogue-pos-builder.ts` — payload POS
- `lib/services/devis-accept-service.ts` — acceptation → commande

## Synchronisation

Voir `docs/SYNC_MATRIX.md` : Backoffice Articles/Prix → POS/Devis
