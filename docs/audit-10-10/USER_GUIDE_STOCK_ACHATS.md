# Guide — Stock & Achats

## Stock — 4 catégories

| Catégorie | Quand l'utiliser |
|---|---|
| **Vente directe** | Article revendu tel quel |
| **Hybride** | Vente + consommation production |
| **Matière interne** | Papier, vinyle, encre |
| **Maintenance** | Pièces machines |

## Créer un article

1. Stock → **Nouveau stock / matière**
2. Saisir nom → **SKU généré automatiquement**
3. Choisir catégorie → champs adaptés s'affichent
4. Preset conversion (ex. rame 500 feuilles)
5. Quantité initiale → mouvement `stock_initial` créé
6. Si matière interne/hybride : activer **Lier Matières DB**
7. **Créer** ou **Créer & lier Matières DB**

## SKU

- Format : `STYLO-BIC-BLEU`, `PAPIE-OFF80G-A4-R500`
- Modification manuelle : case admin + **justification obligatoire**
- Doublon → suffixe `-002`

## Achats

1. Achats → commande fournisseur
2. Lignes : SKU, quantité, unité achat, conversion
3. **Réception** → entrée stock + sync matière + prix achat

## Fournisseurs

- Sélection dans modal stock
- Détection doublons email/téléphone à la création

## Statuts stock

| Statut | Signification |
|---|---|
| OK | Au-dessus du seuil |
| Critique | ≤ stock minimum |
| Rupture | Quantité 0 |

## Liaison Matières

Colonne « Stock lié » dans Matières & prix de base affiche SKU + quantité.  
Badge orange/rouge si stock faible ou rupture.
