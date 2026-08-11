# Backlog d'implémentation benchmark — ANS ORION

## But

Transformer le benchmark en backlog exécutable, ordonné et suffisamment concret pour être traité lot par lot dans Cursor.

## Règles

- Prioriser la stabilité avant l'enrichissement.
- Aucun chantier ne doit casser le hub commande.
- Les calculs métier restent centralisés côté services / APIs.
- Le backoffice reste source de vérité.
- Chaque ticket doit avoir un test ou une vérification explicite.

---

## Epic A — Phase 1 Stabilisation

### A1. Stock négatif et réservations incohérentes

- **Priorité**: P0
- **Pourquoi**: risque direct sur production, stock, KPI et promesse client
- **Résultat attendu**: impossible de laisser `reservedQty` dépasser le stock réel sans alerte métier explicite

#### Tickets

1. Ajouter un garde-fou central sur ajustement / sortie de stock.
2. Refuser les mises à jour qui rendent `reservedQty > quantity`.
3. Retourner une erreur métier claire côté API au lieu d'un faux `500`.
4. Ajouter des tests ciblés sur les cas incohérents.

### A2. Permissions et erreurs API homogènes

- **Priorité**: P0
- **Pourquoi**: sécurité et lisibilité des comportements

#### Tickets

1. Recenser les routes critiques encore hétérogènes.
2. Uniformiser `401/403/404/409/500`.
3. Renforcer les points sensibles commande, devis, paiements, stock.

### A3. Routes legacy et redirections

- **Priorité**: P1
- **Pourquoi**: réduire les régressions et 404 silencieuses

#### Tickets

1. Vérifier alias legacy critiques.
2. Confirmer les redirections middleware et accès rôle.
3. Ajouter tests sur routes les plus utilisées.

### A4. Snapshots critiques

- **Priorité**: P1
- **Pourquoi**: éviter dérive devis / commande / logistique

#### Tickets

1. Lister les snapshots minimum à figer.
2. Valider le moment de figer par workflow.
3. Couvrir les cas d'acceptation devis et conversion commande.

---

## Epic B — Phase 2 Données vraies

### B1. Définitions KPI unifiées

- **Priorité**: P0
- **Tickets**
1. Définir officiellement CA, marge, retard, impayé, production active.
2. Centraliser les calculs dans des services partagés.
3. Ajouter un tableau de correspondance KPI -> source.

### B2. Filtres analytiques cohérents

- **Priorité**: P1
- **Tickets**
1. Période globale.
2. Annexe.
3. Commercial.
4. Famille produit.

### B3. Data quality et anomalies

- **Priorité**: P1
- **Tickets**
1. Vue admin anomalies.
2. Liens cassés / orphelins.
3. Doublons clients.
4. Usage effectif de `ImportAnomaly`.

---

## Epic C — Phase 3 CRM / Commercial

### C1. Fiche client 360

- **Priorité**: P1
- **Tickets**
1. Bloc identité / contacts / adresses.
2. Historique devis / commandes / paiements / réclamations.
3. Prochaine action.
4. Score fidélité simple.

### C2. Pipeline commercial

- **Priorité**: P1
- **Tickets**
1. Stages prospect -> devis -> commande.
2. Détection devis stagnants.
3. Relances simples.
4. Raisons de perte.

---

## Epic D — Phase 4 POS / Devis / Commandes

### D1. Coût détaillé devis

- **Priorité**: P1
- **Tickets**
1. Matière.
2. Machine.
3. Main-d'oeuvre.
4. Sous-traitance.
5. Marge.

### D2. Hub commande renforcé

- **Priorité**: P1
- **Tickets**
1. Timeline complète.
2. Blocages visibles.
3. Prochaine action utile.
4. Documents liés.

---

## Epic E — Phase 5 Production / Stock / Machines

### E1. Charge atelier et goulets

- **Priorité**: P1

### E2. Temps prévu / réel

- **Priorité**: P2

### E3. Parc machines unifié

- **Priorité**: P1

---

## Epic F — Phase 6 Finance / RH

### F1. Cash et recouvrement

- **Priorité**: P1

### F2. Rentabilité commande / client / famille

- **Priorité**: P1

### F3. KPI RH utiles

- **Priorité**: P2

---

## Epic G — Phase 7 BI / Analytics

### G1. Dashboard direction fiable

- **Priorité**: P1

### G2. Dashboard commercial

- **Priorité**: P1

### G3. Exports et tendances

- **Priorité**: P2

---

## Epic H — Phase 8 Backoffice / Data Management

### H1. Gouvernance data visible

- **Priorité**: P1

### H2. Workflow & statuts

- **Priorité**: P2

### H3. Permissions fines et approbations

- **Priorité**: P1

---

## Premier lot recommandé — Sprint 1

### Objectif

Obtenir un gain immédiat de fiabilité sans refonte large.

### Périmètre

1. **Stock**  
   Ajouter le garde-fou central pour empêcher les incohérences entre stock réel et stock réservé.

2. **API stock**  
   Faire remonter une erreur métier claire si l'opération est refusée.

3. **Tests**  
   Ajouter des tests ciblés pour sécuriser ce comportement.

### Pourquoi commencer ici

- transversal,
- peu risqué,
- impact métier direct,
- améliore aussi la fiabilité des futurs KPI.

### Fichiers ciblés

- `lib/services/stock-service.ts`
- `lib/server/modules/stock/stock.service.ts`
- `app/api/stock/[id]/route.ts`
- `tests/*stock*.test.ts`

---

## Dépendances minimales

- aucune migration schéma lourde,
- aucun changement UX majeur,
- aucun service externe.

## Définition de fini

Un lot est terminé si:

1. le code est modifié,
2. les cas critiques sont testés ou vérifiés,
3. les erreurs métier sont explicites,
4. la documentation utile est mise à jour si nécessaire.
