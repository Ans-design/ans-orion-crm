# Benchmark Print MIS / ERP imprimerie — idées pour ANS ORION

## Objectif

S'inspirer des meilleurs Print MIS / ERP imprimerie sans migrer hors de ANS ORION.  
Les outils étudiés servent de référence métier, UX, workflow et pilotage:

- Logic Print
- Cadratin
- Tharstern
- EFI Pace
- EFI Monarch
- Avanti Slingshot
- Optimus
- Cerm
- MultiPress
- PrintVis
- Hiflex

## Principes communs observés

Les meilleurs outils Print MIS convergent sur les mêmes fondamentaux:

1. Un devis n'est jamais un simple prix; c'est un coût structuré transformable en ordre de fabrication.
2. Un job ticket unique traverse tout le flux: devis -> commande -> production -> livraison -> facture.
3. Le stock est réservé avant production, consommé pendant production, puis réconcilié après exécution réelle.
4. Les retards sont visibles par étape, par machine et par priorité.
5. Les dashboards utiles montrent la marge réelle, la charge atelier, le WIP, les retards et les pertes.

---

## A. Devis imprimerie

### Ce que font bien les outils du marché

- Devis rapide par famille produit, gabarit et règles de prix.
- Devis multi-lignes avec variantes de quantité, format, finition, support.
- Coût détaillé: matière, machine, main-d'oeuvre, sous-traitance, marge.
- Garde-fous sur prix minimum, marge minimum, remise maximum.
- Transformation directe du devis accepté en commande / job ticket.
- Historique des versions et raisons de modification.

### Adaptation recommandée pour ANS ORION

1. Ajouter un mode `devis rapide` par familles ANS (petit format, grand format, textile, goodies).
2. Afficher dans le devis un récapitulatif de coût interne:
   - coût matière,
   - coût machine,
   - coût main-d'oeuvre,
   - sous-traitance,
   - marge brute estimée.
3. Introduire un `prix manuel contrôlé`:
   - saisir un prix final manuel,
   - conserver l'écart vs prix calculé,
   - exiger justification si l'écart dépasse un seuil.
4. Ajouter des `variantes commerciales` dans le devis:
   - version budget,
   - version recommandée,
   - version premium.
5. Figer plus tôt les snapshots utiles:
   - logistique,
   - paramètres produit,
   - matières critiques,
   - délai promis.

### Bénéfice métier

- Moins de devis sous-margés.
- Moins de re-saisie après acceptation.
- Meilleure lisibilité commerciale pour le client et la direction.

### Fichiers probables

- `app/(app)/devis/page.tsx`
- `app/api/devis/**/route.ts`
- `lib/server/modules/devis/devis.service.ts`
- `lib/services/devis-accept-service.ts`
- `components/devis/*`

---

## B. Production / GPAO

### Ce que font bien les outils du marché

- Ordre de fabrication central avec étapes, ressources, fichiers et délais.
- Planning atelier par machine / poste / opérateur.
- Charge machine visible à court terme.
- Retard par étape et goulet d'étranglement.
- Temps prévu vs temps réel.
- Déchets / pertes / retouches tracés par job.
- Validation BAT comme jalon bloquant.

### Adaptation recommandée pour ANS ORION

1. Faire du dossier de production un vrai `job ticket numérique`:
   - référence commande,
   - BAT,
   - fichiers,
   - matière réservée,
   - machine prévue,
   - opérateur,
   - délai cible.
2. Ajouter un `planning charge atelier` simple:
   - par machine,
   - par étape,
   - par priorité,
   - par jour / semaine.
3. Introduire un indicateur `temps prévu / temps réel` par commande et par étape.
4. Afficher un badge `goulet` si une machine ou une étape cumule trop de retard.
5. Ajouter une saisie rapide des pertes:
   - gâche papier,
   - rebuts,
   - reprise,
   - retouche.

### Bénéfice métier

- Vision atelier plus fiable.
- Détection précoce des retards.
- Meilleure rentabilité réelle par commande.

### Fichiers probables

- `app/(app)/production/page.tsx`
- `app/(app)/planning/page.tsx`
- `app/api/productions/**/route.ts`
- `lib/services/gpao-dossier-service.ts`
- `lib/services/planning-commande-service.ts`
- `lib/services/commande-workflow-service.ts`

---

## C. Stock imprimerie

### Ce que font bien les outils du marché

- Stock réel + stock réservé + stock disponible.
- Réapprovisionnement piloté par seuil et couverture.
- Consommation liée au job ticket.
- Contrôle des matières critiques (papier, bâche, vinyle, encre, consommables).
- Réconciliation entre théorie et réel après production.

### Adaptation recommandée pour ANS ORION

1. Afficher partout 3 états:
   - stock physique,
   - stock réservé,
   - stock disponible.
2. Déduire la matière non seulement à la commande, mais aussi après production réelle.
3. Ajouter une suggestion de réapprovisionnement:
   - seuil mini,
   - quantité conseillée,
   - délai fournisseur.
4. Bloquer ou alerter plus tôt les productions qui risquent de créer un stock négatif.
5. Afficher les matières réservées directement dans la fiche commande et le dossier GPAO.

### Bénéfice métier

- Moins de ruptures inattendues.
- Moins de dérive entre théorie et atelier.
- Réservations plus crédibles pour la planification.

### Fichiers probables

- `app/(app)/stock/page.tsx`
- `app/api/stock/**/route.ts`
- `lib/server/modules/stock/stock.service.ts`
- `lib/services/stock-reservation-service.ts`
- `lib/services/stock-service.ts`

---

## D. Commandes

### Ce que font bien les outils du marché

- Une vue commande 360 avec timeline, documents, production, livraison, facture, paiements.
- Statuts clairs et non ambigus.
- Historique complet des événements.
- Liens profonds vers toutes les entités liées.
- Alertes de blocage visibles sans ouvrir plusieurs modules.

### Adaptation recommandée pour ANS ORION

1. Renforcer encore la fiche `/commandes/[id]` comme source unique de vérité.
2. Ajouter une `timeline commande` exhaustive:
   - devis créé,
   - devis accepté,
   - BAT validé,
   - OF lancé,
   - production terminée,
   - livraison,
   - facture,
   - paiement.
3. Afficher un `score de risque` de commande:
   - paiement incomplet,
   - BAT manquant,
   - stock insuffisant,
   - retard planning,
   - fichier manquant.
4. Ajouter un panneau `prochaine action utile` plus systématique.
5. Afficher les documents liés dans une seule zone:
   - BAT,
   - factures,
   - BL,
   - pièces jointes,
   - conversation Talk.

### Bénéfice métier

- Moins d'allers-retours entre modules.
- Meilleure coordination commerciale / atelier / finance.
- Réduction des oublis dans le flux.

### Fichiers probables

- `app/(app)/commandes/[id]/page.tsx`
- `components/commandes/commande-360-view.tsx`
- `components/commandes/commande-integration-hub.tsx`
- `lib/services/commande-360-service.ts`
- `lib/services/commande-workflow-service.ts`

---

## E. Dashboard direction

### Ce que font bien les outils du marché

- KPI financiers et opérationnels sur la même page.
- Vue retards, charge, marge, déchets, top clients, top produits.
- Filtrage par période, site, annexe, activité.
- Drill-down vers la commande ou le poste problématique.

### Adaptation recommandée pour ANS ORION

1. Structurer le dashboard autour de 5 vues:
   - direction,
   - commercial,
   - atelier,
   - stock,
   - finance.
2. Afficher les KPI direction prioritaires:
   - CA,
   - marge brute,
   - commandes en retard,
   - devis en attente,
   - production active,
   - alertes stock,
   - pertes,
   - top clients,
   - top familles produits.
3. Ajouter un indicateur `retard atelier du jour / semaine`.
4. Afficher les jobs risqués avec accès direct à la commande.
5. Ne jamais afficher de KPI non reconcilie avec Prisma/PostgreSQL.

### Bénéfice métier

- Pilotage de direction plus actionnable.
- Alignement entre terrain et chiffres.
- Décision plus rapide sur les urgences.

### Fichiers probables

- `app/(app)/dashboard/page.tsx`
- `components/dashboard/chart-widgets.tsx`
- `lib/services/dashboard-stats.ts`
- `lib/services/dashboard-slices.ts`
- `app/api/dashboard/**/route.ts`

---

## Quick wins Print MIS pour ANS ORION

### P0 / P1

- Afficher `stock réservé` et `stock disponible` partout.
- Ajouter `prochaine action utile` sur commande et devis.
- Geler les snapshots utiles à l'acceptation du devis.
- Centraliser les blocages BAT / paiement / stock sur `/commandes/[id]`.
- Rendre visible la marge estimée au niveau devis / commande.

### P2

- Planning charge machine.
- Temps prévu vs temps réel.
- Pertes / gâches / retouches.
- Variantes de devis.
- Score de risque commande.

### P3

- Simulation de capacité atelier.
- Scénarios de sous-traitance.
- Analyse de rentabilité par famille produit / machine / opérateur.
