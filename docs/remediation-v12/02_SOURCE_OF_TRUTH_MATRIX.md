# V12 — Matrice source de vérité

Règle : un domaine = un propriétaire = des commandes d’écriture = projections en lecture.

| Domaine | Vérité canonique | Projections / consommateurs | Événements cibles | SLA convergence | Détecteur |
|---------|------------------|-----------------------------|-------------------|-----------------|-----------|
| Administration | AdminConfig publié + version | shell, menus, modules | AdminConfigPublished | < 30s | config-catalogue |
| Permissions | policy + overrides versionnés | sidebar, API, payload | PermissionPolicyChanged | immédiat | — |
| Tarification | PricingRelease publiée (cible) | POS, devis, simulation | PricingReleasePublished | < 60s | pricing-publish |
| Matière | BaseMaterial | POS, achats, production | Material* | < 60s | stock-material |
| Stock | StockMovement + agrégat StockItem | dispo, alertes | Stock* | immédiat TX | stock-material |
| Achats | PO + PurchaseReceipt | stock, coût | PurchaseReceiptPosted | < 60s | — |
| Commercial | Devis/Commande + snapshots | Talk, Studio, GPAO | Commande* | < 30s | payment-truth |
| BAT | Proof + versions | Commande, GPAO | ProofStatusChanged | < 30s | bat-gpao |
| Production | dossier/étapes GPAO | commande, cockpit | GpaoStepChanged | < 30s | production-kanban |
| Livraison | Livraison + preuve | commande, facture | DeliveryCompleted | < 60s | — |
| Finance | Facture/Paiement/ledger | commande, caisse | PaymentRecorded | immédiat TX | payment-truth |
| RH | employé/paie (protégé) | self-service | events minimisés | — | — |
| Communication | conversation/message | badges | BusinessConversationEnsured | < 30s | talk-commande |

JSON miroir : `artifacts/remediation-v12/source-of-truth-matrix.json` (à valider CI ultérieurement).
