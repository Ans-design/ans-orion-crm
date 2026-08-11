
```text
    → Planification → Production → Contrôle qualité → Livraison
| Étape | Module | Univers sidebar | Route | Service clé |
|-------|--------|-----------------|-------|-------------|
| Client | CRM | Commercial | `/clients` | — |
| Devis | Devis / Panier | Commercial | `/devis`, `/panier` | `devis-accept-service.ts` |
| POS | Catalogue | Commercial | `/pos` | `catalogue-service.ts` |
| Config articles / prix | Backoffice | Administration | `/administration/*` | APIs `/api/backoffice/*` |
| Matières / réservation | Stock | Stock & Achats | `/stock` | `commande-stock-workflow.ts` |
| BAT | Studio / BAT | Studio & BAT | `/bat`, `/studio` | `bat-gpao-sync.ts` |
| Commande | Commandes | Commercial (hub) | `/commandes/[id]` | `commande-workflow-service.ts` |
| GPAO | Dossiers | Production | `/production/dossiers` | `gpao-dossier-service.ts` |
| Production | Planning / Kanban | Production | `/planning`, `/production` | — |
| Qualité | Qualité | Production | `/production/qualite` | — |
| Talk / relances | ANS Talk | Communication | `/messagerie` | `create-from-order` |
| Livraison | Logistique | Logistique | `/livraisons` | — |
| Finance | Factures / Paiements | Finance | `/factures`, `/paiements` | `facture-workflow-service.ts` |

**Ordre sidebar opérationnel :** Pilotage → Commercial → Stock → Studio → Production → Communication → Logistique → Finance → RH → Administration → Mon espace.

Bandeau hub : `lib/commande/commande-universe-flow.ts` + `CommandeIntegrationHub`.