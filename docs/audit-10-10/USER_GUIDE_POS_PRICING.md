# Guide — POS & Tarification

## Flux commercial

```
Client → Catalogue POS → Configuration article → Panier → Devis → Commande
```

## Règles prix

Le POS lit **uniquement les tarifs publiés** depuis le backoffice.

### Ordre de calcul

1. Prix base (matière / support / format)
2. Quantité
3. Options avec **impact prix ON**
4. Finitions
5. Paliers / remises
6. Urgence, livraison
7. TVA

### Options / Chips

| Toggle | Effet |
|---|---|
| Impact prix ON | Modifie le total |
| Impact prix OFF | Indicatif seulement — **ne change pas le prix** |
| Impact stock ON | Vérifie disponibilité stock |
| Visible POS ON | Affiché au commercial |

## Panier & Devis

- Le **snapshot** fige les prix au moment du devis
- Modifier le backoffice après validation **ne change pas** un devis existant
- Nouveau devis = nouveaux prix publiés

## Vérifications avant vente

- Stock insuffisant → warning avant ajout panier (articles liés stock)
- Prix max dépassé → garde-fou moteur
- Anomalie matière non publiée → recalcul après publication

## Administration associée

| Besoin | Où aller |
|---|---|
| Modifier prix base matière | Matières & prix de base |
| Modifier variable article | Options / Chips |
| Modifier paliers | Paliers / remises |
| Publier changements | Bouton Publier (backoffice) |
| Vérifier sync | Centre synchronisation |

## Modes paiement (Madagascar)

Espèces, chèque, virement, Mvola, Airtel Money, Orange Money — références selon mode (module Finance).
