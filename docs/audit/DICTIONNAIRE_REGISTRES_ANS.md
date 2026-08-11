# Dictionnaire des 24 registres ANS (V17) — V2-02R

| Date | 2026-07-18 |
|------|------------|
| Règle | Ne pas créer 24 tables isolées — rattacher à entité / journal / vue / doc |

| Registre V17 | Type ORION | Modèle / écran candidat | Propriétaire | Permission | Confidentialité | Conservation | État |
|--------------|------------|-------------------------|--------------|------------|-----------------|--------------|------|
| Présence | Entité | RH présences | RH | rh:* | Interne | À valider | présent incomplet |
| Pauses | Journal / config | RH (à configurer) | RH | rh:* | Interne | À valider juridique | à valider juridiquement |
| Commandes | Entité | `Commande` | Commercial/Prod | commandes:* | Interne | Illimitée métier | confirmé |
| Passations | Journal / checklist | À modéliser (poste→poste) | Production | production:write | Interne | À valider | absent |
| Tâches / planning | Entité | MetierTask / Planning | Production | planning:* | Interne | Métier | présent |
| Appels | Journal / CRM | À lier Client notes | Accueil/CM | clients:write | Interne | À valider | incomplet |
| Courrier | Journal / fichier | FileAsset catégorie | Accueil | — | Interne | À valider | incomplet |
| Devis | Entité | `Devis` | Commercial | devis:* | Interne | Métier | confirmé |
| Factures | Entité | `Facture` | Finance/Caisse | factures:* | Sensible | Légal | confirmé |
| Caisse | Entité | `CashSession` | Caisse | pos:close_register | Sensible | Légal | confirmé partiel |
| Pièces de caisse | Justificatif | notes/réf paiement | Caisse | paiements:* | Sensible | Légal | incomplet |
| Recettes | Vue filtrée | Agrégats paiements | Finance | rapports:* | Sensible | Légal | présent |
| Achats / dépenses | Entité | Achats / FinanceCharge | Achats | achats:* | Sensible | Métier | présent |
| Stock | Entité + mvt | StockItem / StockMovement | Magasin | stock:* | Interne | Métier | confirmé partiel |
| Machines | Entité | Machines | Maintenance | — | Interne | Métier | présent |
| Maintenance | Entité | tickets maintenance | Technicien | — | Interne | Métier | présent |
| Qualité | Entité / checklist | QualiteControle / GPAO CQ | Production | production | Interne | Métier | présent |
| BAT / BAR | Entité | BAT / Proof | Studio | bat:* | Client | Métier | confirmé |
| Livraison / coursier | Entité | Livraison | Livraison | livraisons:* | Interne+client | Métier | présent |
| Produits finis | Vue / stock | stockCategory / PF | Magasin | stock:* | Interne | Métier | incomplet |
| Réunions / briefings | Journal / doc | TeamMessage / docs | Direction | — | Interne | À valider | incomplet |
| Heures supplémentaires | Config RH | RH | RH | rh | Sensible | À valider juridique | à valider juridiquement |
| Tiers / visiteurs | Entité légère | Client / fournisseur / visite | Accueil | clients | Perso | Minimisation C04 | à valider |
| Notes de service | Doc versionné | DOC famille | Direction | — | Interne | DOC-00 | à valider |

## Champs obligatoires communs (écriture importante)

date, heure, référence, auteur, objet, décision/suite, preuve (si requis). Montants : Ariary entier (`roundMga`).

## Passation critique (modèle cible — pas encore table dédiée)

référence · poste donnant/recevant · date/heure · support/qty/état · consignes · deadline · auteur · accusé · réserves · signature numérique.
