

**Chaîne univers (rappel) :** Administration + Stock & Achats alimentent le catalogue/prix → **Commercial** (client → devis → commande) → **Studio & BAT** + **Production** après validation → **Communication** (Talk) pendant la réalisation → **Logistique** + **Finance** → **Pilotage** / **Mon espace**.

Hub unique : `/commandes/[id]` (bandeau univers + next-action).
| Admin / Manager | Tous dont **Administration** (7 macros) |
| Commercial | Ventes & CRM (flow Client→…→Commande ; **Réclamations** Direction-only pour l’instant), Mon espace, Communication — **pas** Administration |
| Production | Production/GPAO, Mon espace — **pas** Administration |
Ne pas afficher tous les menus à tous les utilisateurs — `permission-matrix.ts` + `canAccessAdministration` + `page-access.ts` + overrides admin.

**Flow Commercial structurel (6) :** Clients → POS → Panier → Devis → Commandes → Réclamations.  
La numérotation sidebar est recalculée sur les **items visibles** du rôle (ex. commercial = 1→5 sans Réclamations).  
Décision métier ouverte : ajouter `reclamations` au profil commercial (action humaine).