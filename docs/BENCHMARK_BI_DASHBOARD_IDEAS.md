# Benchmark BI / Dashboards — idées pour ANS ORION

## Objectif

S'inspirer des meilleures pratiques de:

- Power BI
- Klipfolio
- Zoho Analytics
- Geckoboard
- Tableau
- Domo
- Databox
- Looker Studio
- Qlik Sense
- Yellowfin

pour améliorer les dashboards internes ANS ORION sans ajouter un outil BI externe.

## Règle directrice

ANS ORION doit rester sur une BI interne simple et fiable:

- source de vérité Prisma / PostgreSQL,
- calculs centralisés côté service / API,
- filtres communs,
- pas de chiffres fake,
- pas de doublon entre modules.

---

## Principes BI utiles à reprendre

1. Les dashboards opératoires et les dashboards de direction n'ont pas les mêmes besoins.
2. Les KPI doivent partager des définitions communes.
3. Il faut séparer données transactionnelles et calcul analytique.
4. Les filtres globaux doivent être cohérents: période, annexe, commercial, machine, famille produit.
5. Un dashboard doit toujours proposer une action ou un drill-down.

---

## A. Dashboard global

### KPI à prioriser

- CA
- marge brute
- dépenses
- encaissements
- devis en attente
- commandes actives
- commandes en retard
- production en cours
- alertes stock
- clients fidèles

### Recommandations pour ANS ORION

1. Distinguer clairement:
   - KPI direction,
   - KPI commerciaux,
   - KPI atelier,
   - KPI finance.
2. Afficher des alertes actionnables:
   - commandes à risque,
   - retards,
   - rupture matière,
   - impayés.
3. Ajouter un drill-down vers:
   - commande,
   - client,
   - machine,
   - facture,
   - devis.

### Fichiers probables

- `app/(app)/dashboard/page.tsx`
- `components/dashboard/*`
- `lib/services/dashboard-stats.ts`
- `lib/services/dashboard-slices.ts`

---

## B. Finance

### KPI à afficher

- encaissements par période
- impayés
- factures échues
- dépenses
- trésorerie
- délai moyen de paiement
- masse salariale
- charges fixes vs variables

### Recommandations pour ANS ORION

1. Construire une vue `cash & recouvrement`:
   - encaissements du jour / semaine / mois,
   - factures ouvertes,
   - retard moyen paiement,
   - top clients en retard.
2. Ajouter une vue `rentabilité`:
   - marge par commande,
   - marge par famille produit,
   - marge par client.
3. Afficher la séparation:
   - réel,
   - estimé,
   - manquant.

### Fichiers probables

- `app/(app)/factures/page.tsx`
- `app/(app)/paiements/page.tsx`
- `lib/services/reports-service.ts`
- `lib/services/facture-workflow-service.ts`
- `lib/services/finance-adv-service.ts`

---

## C. Production

### KPI à afficher

- commandes en cours
- charge machine
- charge opérateur
- temps prévu vs réel
- retards
- déchets
- productivité équipe

### Recommandations pour ANS ORION

1. Ajouter une vue `atelier temps réel`:
   - OF lancés,
   - OF en retard,
   - machine saturée,
   - étape bloquée.
2. Ajouter des écarts:
   - durée prévue,
   - durée réelle,
   - perte estimée,
   - perte réelle.
3. Afficher un taux simple:
   - OF terminés à l'heure,
   - OF en retard,
   - OF bloqués.

### Fichiers probables

- `app/(app)/production/page.tsx`
- `app/(app)/planning/page.tsx`
- `app/api/productions/**/route.ts`
- `lib/services/planning-commande-service.ts`

---

## D. Commercial

### KPI à afficher

- top clients
- top produits
- CA par période
- conversion devis
- villes clients
- ventes par commercial
- relances
- devis stagnants

### Recommandations pour ANS ORION

1. Créer un dashboard commercial dédié, séparé du cockpit direction.
2. Ajouter les segments:
   - clients actifs,
   - clients dormants,
   - prospects chauds,
   - gros comptes.
3. Mesurer la conversion:
   - devis créés,
   - devis acceptés,
   - devis perdus,
   - délai moyen avant acceptation.

### Fichiers probables

- `app/(app)/workspace/commercial/page.tsx`
- `app/(app)/clients/page.tsx`
- `lib/services/client-relance-service.ts`
- `lib/services/dashboard-stats.ts`

---

## E. BI rules pour ANS ORION

### Règles obligatoires

1. Tous les chiffres viennent de Prisma / PostgreSQL ou d'agrégats internes construits depuis eux.
2. Aucun KPI ne doit dépendre d'une donnée mock ou d'un fallback silencieux.
3. Tous les écrans analytiques partagent les mêmes filtres de période et d'annexe.
4. Les formules métier sont centralisées dans les services, pas dupliquées dans le front.
5. Si une donnée manque, afficher un empty state explicite au lieu d'inventer une valeur.

### Modèle analytique interne recommandé

Sans BI externe, ANS ORION peut construire une couche analytique légère via:

- services d'agrégation partagés,
- snapshots journaliers,
- tables d'agrégats si besoin,
- ou vues Prisma / Postgres plus tard.

### Dimensions communes utiles

- date
- annexe
- client
- commercial
- famille produit
- commande
- machine
- opérateur
- statut

### Faits utiles

- devis
- commandes
- lignes de commande
- productions
- mouvements de stock
- paiements
- factures
- dépenses
- présences / paie
- réclamations

---

## Quick wins BI pour ANS ORION

### P0 / P1

- Harmoniser les définitions de CA, marge, retard, impayé.
- Ajouter les filtres période / annexe partout.
- Faire remonter les commandes à risque sur le dashboard.
- Rendre explicite la qualité / fiabilité d'un KPI si source partielle.

### P2

- Dashboard commercial dédié.
- Dashboard finance plus lisible.
- Dashboard atelier avec temps prévu / réel.
- Dashboard stock avec réservations et ruptures.

### P3

- Tendances hebdo / mensuelles.
- Snapshots d'évolution.
- Exports PDF / CSV analytiques standardisés.
