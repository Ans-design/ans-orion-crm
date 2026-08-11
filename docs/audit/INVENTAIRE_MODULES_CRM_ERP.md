# Inventaire modules CRM/ERP (synthèse)

| Date | 2026-07-18 |
|------|------------|
| Source | `lib/modules/module-registry.ts` + routes `app/` |

## Familles confirmées

| Famille | Modules (exemples) | État observé |
|---------|-------------------|--------------|
| Pilotage | Cockpit, opérations | Actif |
| Administration | Backoffice, catalogue, prix, matières, sync, permissions | Actif (dual UI legacy) |
| Ventes / POS | POS, panier, conception, workspace commercial | Actif — dépend profils publiés |
| CRM | Clients, réclamations | Actif |
| Devis / Factures / Paiements | devis, factures, paiements, caisse | Actif |
| GPAO / Production | commandes, production, planning, qualité | Actif |
| Studio / BAT | studio, bat, prépresse | Actif |
| Stock / Achats | stock, achats, fournisseurs | Actif |
| Logistique | livraisons | Actif |
| Finance | charges, fiscalité, coûts | Actif |
| RH | paie, présence, recrutement | Actif (sensible) |
| Communication | CM, notifications, ANS Talk | Actif |
| Maintenance | machines, tickets | Actif |
| Rapports / Historique | rapports, historique | Actif |
| Paramètres | apparence, sécurité, règles | Actif |

Détail pages/API par module : à densifier Lot 2 (matrice complète). Voir aussi `docs/MODULES_MAP.md`, `docs/USER_JOURNEYS.md`.
