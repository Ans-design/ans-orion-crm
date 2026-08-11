# Benchmark -> plan d'action ANS ORION

## Objectif

Transformer les idées benchmark en plan d'exécution réaliste, compatible avec:

- Next.js 14
- Prisma
- PostgreSQL / SQLite local
- Vercel / Hostinger
- architecture modulaire existante

## Principes d'exécution

1. Stabiliser avant d'enrichir.
2. Améliorer les données avant les dashboards.
3. Renforcer le hub commande comme centre de gravité.
4. Utiliser le backoffice comme source de vérité.
5. Préférer des gains métiers nets à des raffinements techniques lourds.

---

## Phase 1 — Stabilisation

### Objectif

Réduire les erreurs, sécuriser les routes, fiabiliser le build et les bases de calcul.

### Cible

- API 500 / 401 durcies
- auth / permissions homogènes
- routes legacy stables
- build propre
- règles Prisma / services plus fiables

### Travaux

- terminer l'harmonisation auth / error handling dans les APIs sensibles
- réduire les routes Prisma direct sur domaines critiques
- sécuriser les statuts legacy / redirections
- fermer les sources de stock négatif
- stabiliser les snapshots utiles commande / devis

### Domaines

- commandes
- devis
- paiements
- stock
- permissions
- admin / redirections

### Résultat attendu

Le socle est assez fiable pour supporter des KPI et des workflows plus ambitieux.

---

## Phase 2 — Données vraies

### Objectif

Rendre les KPI cohérents, réconciliés et filtrables.

### Travaux

- centraliser les définitions de CA, marge, impayé, retard
- ajouter filtres période / annexe / commercial / famille
- fiabiliser les agrégats dashboard
- introduire une petite couche analytique interne
- renforcer data quality et data management

### Résultat attendu

Les dashboards ANS ORION deviennent pilotables sans contredire les modules métier.

---

## Phase 3 — CRM / Commercial

### Objectif

Rendre la vente plus suivie, plus visible et plus actionnable.

### Travaux

- fiche client 360 plus commerciale
- pipeline devis -> commande
- relances et opportunités stagnantes
- score fidélité / récence
- top clients / nouveaux clients / conversion devis

### Résultat attendu

Le commercial sait quoi faire ensuite, sur quel client et pourquoi.

---

## Phase 4 — POS / Devis / Commandes

### Objectif

Sécuriser le coeur business: chiffrage, transformation commerciale, suivi commande.

### Travaux

- coût détaillé devis
- prix manuel contrôlé
- variantes de devis
- ordre de fabrication issu du devis / de la commande
- prochaine action utile dans le hub commande
- documents liés et blocages visibles

### Résultat attendu

Moins de re-saisie, meilleure marge, meilleur suivi client -> atelier.

---

## Phase 5 — Production / Stock / Machines

### Objectif

Améliorer la maîtrise atelier.

### Travaux

- planning charge machine
- temps prévu / réel
- consommation matière réelle
- visibilité stock réservé / disponible
- état machine / maintenance / incidents
- alertes de goulet

### Résultat attendu

L'atelier voit plus tôt les retards, ruptures et goulots.

---

## Phase 6 — Finance / RH

### Objectif

Connecter mieux l'exécution au pilotage financier et RH.

### Travaux

- recouvrement / impayés
- rentabilité commande / client / famille
- masse salariale / charges
- présence / paie / indicateurs RH
- liens paie / présence / performance

### Résultat attendu

La direction retrouve les coûts et la trésorerie au bon niveau d'analyse.

---

## Phase 7 — BI / Analytics

### Objectif

Renforcer les dashboards et rapports sans introduire une BI externe.

### Travaux

- dashboards par rôle
- drill-down KPI -> entités métier
- tendances et comparatifs
- exports PDF / CSV standardisés
- vues direction / atelier / commercial / finance

### Résultat attendu

ANS ORION gagne en visibilité décisionnelle sans perdre en simplicité.

---

## Phase 8 — Backoffice / Data Management

### Objectif

Rendre le système plus gouvernable à long terme.

### Travaux

- administration workflow & statuts
- permissions plus fines
- anomalies de données visibles
- import / export gouverné
- audit log enrichi
- qualité de données pilotée

### Résultat attendu

Le backoffice devient le cockpit de gouvernance du système.

---

## Quick wins à faire en premier

1. KPI et filtres cohérents sur dashboard.
2. Fiche client 360 avec prochaine action.
3. Blocages visibles dans le hub commande.
4. Stock réservé / disponible.
5. Charge machine / retards de production.
6. Relances commerciales simples.
7. Data quality / anomalies visibles.

---

## Ordre recommandé

1. `P0` stabilité / sécurité / cohérence API
2. `P1` flux commercial et hub commande
3. `P1` données vraies dashboard
4. `P1-P2` atelier / stock / machines
5. `P2` finance / RH analytiques
6. `P2-P3` gouvernance avancée / polish

---

## Ce qu'il ne faut pas faire maintenant

- microservices,
- Kafka / RabbitMQ,
- BI externe lourde,
- refonte totale du schéma sans migration progressive,
- duplication de logique métier entre dashboard et APIs métier,
- copier-coller d'UX d'outils concurrents.
