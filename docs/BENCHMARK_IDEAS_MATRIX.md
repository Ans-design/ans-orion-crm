# Matrice des idées benchmark -> ANS ORION

| Source inspiration | Idée | Module ANS ORION | Priorité | Effort | Impact métier | À faire maintenant ? |
|-------------------|------|------------------|----------|--------|---------------|----------------------|
| Tharstern / EFI Pace / Avanti | Coût détaillé devis (matière, machine, MO, sous-traitance, marge) | Devis / POS / Commandes | P1 | M | Très fort | Oui |
| Tharstern / Cerm | Transformation devis -> job ticket sans re-saisie | Devis / Commandes / GPAO | P1 | M | Très fort | Oui |
| Optimus / PrintVis | Variantes de devis (budget / recommandé / premium) | Devis | P2 | M | Fort | Oui |
| EFI Pace / Avanti | Prix manuel contrôlé avec justification | Devis / Backoffice | P1 | M | Fort | Oui |
| Cerm / MultiPress | Planning charge machine et atelier | Production / Planning / Machines | P1 | L | Très fort | Oui |
| Tharstern / Optimus | Temps prévu vs temps réel par étape | GPAO / Rapports | P2 | M | Fort | Oui |
| Cerm / EFI Monarch | Déchets, retouches, pertes par OF | Production / Qualité / Finance | P2 | M | Fort | Oui |
| Avanti / Print MIS modernes | Stock réservé / disponible / consommé | Stock / Commandes / GPAO | P1 | M | Très fort | Oui |
| Print MIS cloud | Réapprovisionnement suggéré selon seuil et couverture | Stock / Achats | P2 | M | Fort | Oui |
| Salesforce / HubSpot | Fiche client 360 avec prochaine action | CRM Clients | P1 | M | Très fort | Oui |
| Pipedrive / noCRM | Pipeline visuel devis -> commande avec stagnation | CRM / Devis | P1 | M | Très fort | Oui |
| HubSpot / Zoho | Relances automatiques simples sur devis stagnants | CRM / Notifications | P2 | M | Fort | Oui |
| Salesforce / Dynamics | Raisons de perte / refus structurées | CRM / Devis | P2 | S | Moyen | Oui |
| Power BI / Tableau | KPI par rôle (direction, atelier, commercial, finance) | Dashboard / Rapports | P1 | M | Très fort | Oui |
| Databox / Geckoboard | Alertes actionnables sur commandes à risque | Dashboard / Commandes | P1 | M | Très fort | Oui |
| Power BI / Looker | Définitions KPI centralisées et filtres communs | Dashboard / Services / APIs | P0 | M | Très fort | Oui |
| PaperCut / MyQ / uniFLOW | Etat machine centralisé + incidents + maintenance | Machines / Maintenance | P1 | M | Fort | Oui |
| Print management modernes | Traçabilité machine / opérateur / commande / résultat | Machines / Production / Audit | P2 | M | Fort | Oui |
| Odoo / ERPNext | Approvals par seuil (remise, stock, achat, changement sensible) | Backoffice / Finance / Stock | P1 | M | Très fort | Oui |
| Odoo / Axelor | Workflow & statuts configurables plus lisibles | Administration / Workflows | P2 | M | Fort | Oui |
| Odoo / ERPNext | Séparation des rôles sur actions critiques | Permissions / Audit / Finance | P1 | M | Très fort | Oui |
| Odoo / Dolibarr | Gouvernance import/export et anomalies | Data Management | P1 | M | Fort | Oui |
| Yellowfin / Qlik | Drill-down KPI -> commande / client / machine | Dashboard / Rapports | P2 | M | Fort | Oui |
| BI gouvernée | Snapshots analytiques / agrégats internes sans BI externe | Dashboard / Rapports / Postgres | P1 | M | Très fort | Oui |
| CRM modernes | Segmentation client légère mais exploitable | CRM Clients / Commercial | P2 | S | Moyen | Oui |
| ERP manufacturiers | Centre de gravité commande unique | Commandes / Talk / Production / Finance | P0 | M | Très fort | Déjà engagé |
| ERP manufacturiers | Blocages métier visibles dans le hub commande | Commandes | P1 | S | Fort | Oui |
| Print MIS / BI | Marge réelle par commande et famille produit | Finance / Dashboard / Devis | P1 | M | Très fort | Oui |
| Print MIS / ERP | Consommation matière réelle post-production | Stock / GPAO | P2 | M | Fort | Plus tard |
| PaperCut / MyQ | Pull-print / release sécurisée | Non prioritaire pour ANS ORION actuel | P3 | L | Faible | Non |

## Lecture rapide

- **P0**: fiabilité des données, cohérence KPI, hub commande, sécurité et droits.
- **P1**: flux métier critique et valeur directe terrain.
- **P2**: productivité, visibilité, meilleure UX.
- **P3**: confort ou sujets non prioritaires pour le périmètre actuel.

## Critères d'arbitrage ANS ORION

Une idée mérite intégration si elle est:

1. utile à une imprimerie réelle,
2. adaptée au contexte ANS DESIGN PRINT / Madagascar,
3. faisable dans Next.js + Prisma + PostgreSQL,
4. exploitable sans alourdir le produit,
5. connectée au hub commande et au backoffice.
