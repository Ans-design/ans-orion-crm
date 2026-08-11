# AUDIT COMPLET A→Z — ANS ORION CRM/ERP

| Champ | Valeur |
|--------|--------|
| **Projet** | `2em-export-complet-UNIQUE` |
| **Date** | 2026-08-10 |
| **Périmètre** | Tous les univers sidebar + modules registry (~85 modules, ~127 routes app) |
| **Objectif** | Atteindre un produit utilisable 10/10 : sync, flux amont/aval, design uniforme, zéro incohérence métier |
| **Méthode** | Analyse code + cartographie nav (`sidebar-universes`, `module-registry`) + bus live + chaînes finance/stock/GPAO |
| **Fichier unique** | Ce document — à télécharger / archiver tel quel |

**Légende sévérité**

| Code | Sens |
|------|------|
| **P0** | Bloque usage réel / données fausses / risque ledger |
| **P1** | Anomalie forte sync/UX/flux — corriger avant prod large |
| **P2** | Incohérence design / dette / détail non digne d’un livrable expert |
| **OK** | Comportement solide ou pattern déjà correct |
| **CONTR** | Contradiction métier / double vérité / malentendu produit |

---

## 0. Verdict exécutif

Le produit a une **architecture métier ambitieuse et souvent bien pensée** (hub commande, `paymentSnapshot`, `afterPaiementRecorded`, univers sidebar, Admin = SoT prix/catalogue). Il n’est **pas encore 10/10** pour un usage quotidien sans friction.

**Écart principal** : le **feedback multi-modules** (rafraîchissement automatique après mutation) est **partiel** — très présent sur Commandes / Devis / Stock / Dashboard / POS, **absent ou faible** sur Factures, Paiements, Livraisons, RH, Machines, Réclamations, Caisse, etc. L’opérateur voit donc des **chiffres / listes périmés** tant qu’il ne recharge pas.

**Second écart** : **design non unifié** (OrionPageHeader vs AppPageHeader vs templates Admin vs workspaces) + **toolbars Import/Export/Corbeille** amorcées mais **pas homogènes** (corbeille UI sans filtre API partout, Prisma `generate` souvent bloqué EPERM).

**Troisième écart** : **flux chronologique contradictoire** entre sidebar (Finance après Logistique) et réalité atelier (acompte / facture **pendant** la commande), avec badges univers « 9 / 6 / 54 » qui mélangent alertes et « étapes faites » (`is-ops-done`) — lisibilité expert insuffisante.

Score indicatif actuel (audit) : **~6,5 / 10** utilisable en démo / pilote ; **~4 / 10** pour prod multi-postes sans formation lourde.

---

## 1. Cartographie sidebar (source de vérité navigation)

Fichiers : `lib/navigation/sidebar-universes.ts`, `lib/modules/module-registry.ts`, `components/layout/sidebar/sidebar-universe-nav.tsx`.

### 1.1 Univers (ordre affiché)

| # | Univers | flowLabel déclaré | Modules typiques (ordre) |
|---|---------|-------------------|---------------------------|
| 1 | Pilotage | Cockpit → Ops → Rapports → Historique | cockpit, operations, rapports, rapports_performance, historique |
| 2 | Commercial | Client → Catalogue → Panier → Devis → Commande → SAV | clients, pos, panier, devis, commandes, reclamations (+ numéros 1→6) |
| 3 | Stock & Achats | Stock → Achats → Fournisseurs | stock, ws_magasin, achats, fournisseurs |
| 4 | Studio & BAT | Studio → Conception → BAT | studio_hub, conception, bat, ws_studio |
| 5 | Production | GPAO → Planning → Machines → Fabrication → CQ | dossiers, production, planning, tâches, qualité, plan matière, machines, tickets, workspaces atelier |
| 6 | Communication | Talk → Relances | messagerie, suggestions, campagnes, relances, notifications, aide, ws_cm |
| 7 | Logistique | Préparation → Expédition → Livré | livraisons, ws_logistique |
| 8 | Finance | Facture → Paiement → Caisse | factures, paiements, charges, coûts, fiscalité, ventes directes, caisse, ws_finance |
| 9 | RH | Employés → Absences → Paie | employés, recrutement, absences, performance, paie, annonces, matériels, profil |
| 10 | Administration | Articles → Prix → Flux → Sync | hub Admin (beaucoup d’entrées `hidden` + routes `/administration/*`) |
| 11 | Mon espace | Workspace selon profil | ws_* + mon profil |

### 1.2 Hub commande (parcours opérationnel)

`COMMANDE_HUB_UNIVERSE_ORDER` = commercial → stock → studio → production → communication → logistique → finance.

Les boutons univers marqués `is-ops-done` / titre `CMD-… (fait)` viennent du **journey ops** (`opsJourney`) — pas d’un statut métier serveur unique. **Risque** : un univers affiché « fait » alors qu’une sous-tâche (ex. stock réservé partiel, BAT en attente) n’est pas terminée.

---

## 2. Bus de synchronisation & feedback live

Fichiers : `lib/live/orion-live.ts`, `lib/hooks/use-orion-live-revision.ts`, `liveFetch`.

### 2.1 Domaines live existants

`commandes | devis | clients | stock | factures | paiements | livraisons | production | bat | sync | pricing | catalogue | nav | *`

### 2.2 Qui écoute vraiment (`useOrionLiveRevision`)

| Module / page | Abonné live ? | Domaines |
|---------------|---------------|----------|
| Commandes liste | **Oui** | commandes, paiements, livraisons, production |
| Hub commande 360 | **Oui** (partiel) | commandes, production — **pas** factures/paiements/stock/bat |
| Devis | **Oui** | devis, commandes, clients |
| Clients | **Oui** | clients, devis, commandes |
| Stock | **Oui** | stock, pricing, catalogue, sync |
| Dashboard | **Oui** | large |
| POS / prix | **Oui** | pricing, catalogue, stock, sync |
| Factures | **Non** | — |
| Paiements | **Non** | — |
| Livraisons | **Non** | — |
| Réclamations | **Non** | — |
| Machines / tickets | **Non** | — |
| RH (tous) | **Non** | — |
| Caisse | **Non** | — |
| Planning / GPAO dossiers | À vérifier cas par cas — souvent refresh manuel |
| Talk / CM | Pas sur le même bus métier |

### 2.3 Chaîne finance serveur (OK côté données)

`afterPaiementRecorded` → `syncFactureStatutFromPaiements` + `syncCommandePaiementTotals` + `syncCommandePaymentSnapshot` — **correct** pour cohérence DB.

**P0 UI** : après encaissement depuis modal, `emitOrionLive` part sur paiements/commandes/factures, mais **page Factures / Paiements ouvertes dans un autre onglet ou déjà montées sans hook live ne se mettent pas à jour**.

### 2.4 Findings sync globaux

| ID | Sév. | Finding |
|----|------|---------|
| SYNC-01 | P0 | Listes Factures / Paiements / Livraisons **sans** `useOrionLiveRevision` → montants / statuts stale |
| SYNC-02 | P0 | Hub commande 360 n’écoute pas `factures`/`paiements`/`stock`/`bat` → onglet finance / stock peut mentir jusqu’à navigation |
| SYNC-03 | P1 | `skipNav: true` fréquent sur emits → badges sidebar parfois en retard vs contenu |
| SYNC-04 | P1 | Domaine `reclamations` / `rh` / `machines` **absents** du type `OrionLiveDomain` → impossible de brancher proprement sans étendre le bus |
| SYNC-05 | P1 | Admin → POS : bridge `inferLiveDomainsFromUrl` existe, mais écrans Admin non unifiés (plusieurs hubs) → sync « ressentie » comme aléatoire |
| SYNC-06 | P2 | `orion:nav-badges-refresh` découplé du contenu page — badge vert / chiffre ≠ données liste |
| SYNC-07 | P0 | Migrations soft-archive + `printFormat` : `prisma generate` EPERM si Next tourne → runtime peut **ignorer colonnes** ou planter filtres `archived` |
| SYNC-08 | P1 | Import/Export entity-data : archive OK via API ; **listes stock/machines/achats** ne passent pas toujours `?archived=1` → corbeille toolbar **décorative** |

---

## 3. Flux amont / aval & intersynchronisation métier

### 3.1 Chaîne commerciale canonique (attendu)

```
Client → Catalogue POS → Panier → Devis → Acceptation → Commande
   → (Stock réservation) → Studio/BAT → Production → CQ
   → Livraison → Facture/Paiement/Caisse (et acomptes en parallèle)
```

### 3.2 Matrice inter-modules (ce qui doit se propager)

| Mutation | Aval attendu | Amont / latéral | État audit |
|----------|--------------|-----------------|------------|
| Client archivé | Devis/commandes liés restent ; listes excluent client | Talk, réclamations | Corbeille clients OK ; export Excel récent |
| Devis accepté | Commande + snapshots | Panier vidé / deep-link | Service accept solide ; soft-archive devis **nouveau** (migration requise) |
| Paiement | Facture.statut, Commande.acompte/reste, paymentSnapshot, caisse | Export comptable | **DB OK** ; **UI listes souvent stale** |
| printFormat ticket/facture | PDF / réimpression | Même Facture | Implémenté ; generate/migrate requis |
| Mouvement stock | quantity, alertes, plan matière | Production bloquée | Stock liste live OK ; plan matière / GPAO sync à durcir |
| BAT validé | Statut commande / production | Studio | Deep-links OK ; live `bat` peu consommé hors studio |
| Livraison livrée | Commande terminée / preuve | Finance solde | Peu de live ; risque double vérité statut |
| Réclamation | Impact employé / Talk | Client / commande | Création OK ; live & corbeille partiels |
| Admin prix | POS, devis futurs | Historique devis figés | Intention bonne ; perception sync faible si onglets multiples |
| Achat réception | Stock entrée | Fournisseur | Excel fournisseurs OK ; trash Supplier nouveau champ |

### 3.3 Contradictions produit (CONTR)

| ID | Contradiction |
|----|----------------|
| CONTR-01 | Sidebar place **Finance après Logistique**, mais le métier exige **acompte dès devis/commande** → opérateur croit « payer à la fin » |
| CONTR-02 | Univers « Stock » **avant** Studio alors que beaucoup de jobs réservent matière **après** BAT — ordre pédagogique flou |
| CONTR-03 | `commandes` dans registry `group: gpao_production` mais override universe `commercial` — OK technique, **confusion** pour lecteurs du registry |
| CONTR-04 | Modules `ws_*` apparaissent à la fois sous Production/Stock **et** Mon espace — **doublons cognitifs** |
| CONTR-05 | `rh_equipements` hidden alias `/machines` vs `materiels` RH — historique anti-doublon, encore **ambigu** (« équipements » ≠ « machines ») |
| CONTR-06 | Badges numériques sur univers (9, 6, 54) **mélangés** avec pastilles « étape commande faite » → signal concurrent |
| CONTR-07 | `next-action.ts` garde des maps **deprecated** commande à côté de `resolveCommandeNextAction` — deux cerveaux flow |
| CONTR-08 | Soft-archive ledger (commandes/factures/paiements) : policy « pas hard-delete » vs UI qui parlait encore « Supprimer » sur devis (corrigé partiellement) |
| CONTR-09 | Ticket vs Facture : même rôle métier (bien) mais utilisateurs peuvent croire 2 documents légaux distincts si libellés UI pas assez clairs |
| CONTR-10 | Communication placée **avant** Logistique dans hub, alors que Talk sert aussi **après** livraison (SAV) — flowLabel le dit, ordre sidebar non |

---

## 4. Audit design & uniformité UI

### 4.1 Systèmes de header coexistant

| Pattern | Usage typique |
|---------|----------------|
| `OrionPageHeader` | commandes, devis, stock, machines, livraisons, factures, paiements… |
| `AppPageHeader` | réclamations, fournisseurs, achats, RH employés, matériels… |
| Templates Admin / backoffice-v2 | Administration |
| Workspaces `ws_*` | Layouts allégés / différents |
| `ModuleHeader` / list-page-template | Peu généralisé |

**P2 DESIGN-01** : trop de **variations** (spacing, syncStatus badge, compact, kicker, sticky CTA) pour un même type de liste métier.

### 4.2 Toolbars données

| Pattern | État |
|---------|------|
| `ExcelTableActions` Admin | Mature |
| `EntityModuleDataBar` / `EntityDataToolbar` | Nouveau — branché inégalement |
| Corbeille clients historique | Mature |
| Corbeille devis | Nouveau |
| Corbeille stock UI | Toolbar parfois **sans** toggle trash + filtre API |

**P1 DESIGN-02** : un opérateur voit 3 langages (Admin Excel, EntityData, bouton Corbeille isolé).

### 4.3 Détails « pas digne d’un expert »

| ID | Détail |
|----|--------|
| UX-01 | Labels encoding cassés en schéma Prisma / commentaires (`Fig?`, `Esp?ces`) — dette visuelle code & parfois UI |
| UX-02 | Boutons CTA pleine largeur / sticky bar : correctifs amorcés, **pas homogènes** toutes pages |
| UX-03 | Empty states textes inégaux (ton commercial vs technique) |
| UX-04 | Filtres chips vs select vs boutons `factures-filter` — 3 grammaires |
| UX-05 | Icônes lucide mélangées avec pictos custom Admin |
| UX-06 | Densité tableau vs cartes : `prefersCardList` responsive OK idée, rendu encore **saccadé** selon module |
| UX-07 | Titres page parfois « Gestion stocks » vs registry « Stock » vs flow « Stock atelier » — **3 noms** |
| UX-08 | Pastille `is-done` verte sur univers entier trop forte ( dichté visuelle sidebar) |

---

## 5. Audit module par module (A→Z par univers)

Pour chaque module : **rôle**, **amont**, **aval**, **sync**, **anomalies**, **retouches**.

---

### 5.1 PILOTAGE

#### 5.1.1 Cockpit global (`/dashboard`)
- **Rôle** : synthèse direction.
- **Amont** : tous domaines.
- **Aval** : deep-links ops.
- **Sync** : live large — **OK relatif**.
- **Anomalies** : KPIs peuvent diverger des listes modules si agrégats ne filtrent pas `archived` (P1 après soft-archive).
- **Retouche** : aligner agrégats sur `archived: false` ; même header que Ops.

#### 5.1.2 Opérations temps réel (`/operations`)
- **Rôle** : urgences / exécution.
- **CONTR** : risque de **cockpit bis** malgré description anti-doublon (P2).
- **Retouche** : KPI uniques vs dashboard ; pas de liste complète commandes.

#### 5.1.3 Rapports / Performance / Historique
- **Sync** : souvent snapshot lecture — OK.
- **P1** : exports comptables vs listes paiements — vérifier même filtre statut Valide.
- **P2** : deux entrées Rapports + Performance — libellés proches.

---

### 5.2 COMMERCIAL

#### 5.2.1 CRM Clients (`/clients`)
- **OK** : corbeille + restore + live.
- **P1** : EntityModuleDataBar ajouté sans remplacer complètement l’ancien bouton Corbeille → **double contrôle** trash.
- **P2** : header/toolbar densités vs devis.

#### 5.2.2 Catalogue vente POS (`/pos`)
- **OK** : live pricing/catalogue/stock.
- **P1** : prix « unavailable » / sync Admin → POS encore source de tickets terrain.
- **Aval** : panier — vérifier que configSnapshot fige bien le prix.

#### 5.2.3 Panier (`/panier`)
- **Amont** : POS + client.
- **Aval** : devis / commande.
- **P1** : UX multi-headers (plusieurs OrionPageHeader dans le fichier) — design bruité.
- **Retouche** : un seul header ; CTA unique « Créer devis ».

#### 5.2.4 Devis (`/devis`)
- **OK** : live ; soft-archive + EntityDataToolbar.
- **P0** : migration `archived` + `prisma generate` obligatoires sinon listes/API cassées.
- **P1** : import Excel devis = souvent `ignored` (structure lignes complexe) — **promettre** import alors que round-trip incomplet.
- **CONTR** : libellé historique « Supprimer » encore possible en détail (vérifier toutes occurrences).

#### 5.2.5 Commandes (`/commandes` + hub 360)
- **OK** : cœur métier ; live multi-domaines liste ; finance tab + paymentSnapshot.
- **P0** : hub 360 live trop étroit (SYNC-02).
- **P1** : EntityModuleDataBar + trash : filtre `archived` API OK si migrate ; sinon liste vide/erreur.
- **P2** : hero « Nouvelle commande » + sticky + deep-link banners = **surcharge** première viewport.

#### 5.2.6 Réclamations (`/reclamations`)
- **P1** : pas de live ; soft-archive champ nouveau.
- **P2** : AppPageHeader vs Orion ailleurs.
- **Aval** : impact employé — vérifier que performances RH se mettent à jour (souvent non live).

---

### 5.3 STOCK & ACHATS

#### 5.3.1 Gestion stocks (`/stock`)
- **OK** : filtre `archived: false` service ; live Admin→stock.
- **P1** : EntityModuleDataBar **sans** `onTrashChange` → pas de vue corbeille UI alors que modèle a `archived`.
- **P1** : `reservedQty` vs plan matière — risque sur-réservation si GPAO et stock ne partagent pas la même transaction.
- **Retouche** : brancher trash + mouvements live sur onglet mouvements.

#### 5.3.2 Achats (`/achats`)
- **P1** : PurchaseOrder.archived migration ; UI toolbar export sans trash state lié à la liste.
- **Aval** : réception → stock — tester chemin critique E2E.

#### 5.3.3 Fournisseurs (`/fournisseurs`)
- **OK** : Excel Admin mature.
- **P2** : ExcelTableActions **+** EntityModuleDataBar = double Excel.
- **P1** : trash Supplier nouveau — liste API doit filtrer `archived`.

#### 5.3.4 Workspace magasin (`/workspace/magasin`)
- **CONTR** : doublon cognitif avec `/stock`.
- **Retouche** : soit alias strict, soit périmètre **uniquement** tâches opérateur.

---

### 5.4 STUDIO & BAT

#### 5.4.1 Studio hub (`/studio`)
- Briefs / fichiers / prépresse **hidden** dans nav (anti-doublon) — **OK intention**.
- **P1** : opérateurs cherchent encore « briefs » dans palette — aliases OK, UI hub doit être claire.

#### 5.4.2 Conception (`/pos/conception`)
- **CONTR** : route sous POS path mais univers Studio — navigation mentale cassée (P2).

#### 5.4.3 BAT (`/bat`)
- **P1** : domaine live `bat` peu consommé hors module.
- **Aval** : validation BAT doit pousser commande/production — vérifier emits.

---

### 5.5 PRODUCTION

#### 5.5.1 Dossiers GPAO / Production / Planning / Tâches / Qualité / Plan matière
- **P1** : multiple écrans pour un même dossier commande → risque de **statuts divergents** (kanban vs dossier vs tâches).
- **P0** : avancement commande dérivé tâches — si une page mute statut sans recalcul, hub menteur.
- **Retouche** : une seule source `avancement` (déjà partiellement `commande-task-avancement`) — **imposer** partout.

#### 5.5.2 Machines (`/machines`)
- **P1** : pas de live ; soft-archive champ nouveau ; EntityModuleDataBar OK export.
- **P2** : design drawer dense vs listes Orion.

#### 5.5.3 Tickets maintenance
- Univers Production — OK.
- **P1** : lien machines ↔ tickets ; badges non branchés MODULE_BADGE_KEYS.

#### 5.5.4 Workspaces production / façonnage / conducteur
- **CONTR** doublons Mon espace.
- **P2** : design allégé ≠ design listes — sensation « autre produit ».

---

### 5.6 COMMUNICATION

#### 5.6.1 ANS Talk (`/messagerie`)
- Hors soft-archive planifié (OK hors scope).
- **P1** : pas sur bus OrionLive métier — commande / réclamation peuvent avancer sans refresh Talk.

#### 5.6.2 Relances / Campagnes / Notifications / Suggestions / Aide
- **P2** : densité marketing vs CRM inégalée.
- **P1** : relances devis stagnants — dépendent signaux devis ; si devis archivés encore comptés → faux positifs (après soft-archive).

---

### 5.7 LOGISTIQUE

#### 5.7.1 Livraisons (`/livraisons`)
- **P0** : pas de live revision — preuve livrée / statut commande aval **souvent stale**.
- **P1** : soft-archive Livraison ; toolbar export sans trash list filter.
- **P2** : modes Dispatch / Liste / Livreur / TourneePlanner — **trop de modes** première arrivée.
- **Workspace logistique** : allégé volontairement — documenter pour ne pas croire feature manquante.

---

### 5.8 FINANCE

#### 5.8.1 Factures (`/factures`)
- **P0** : pas de live ; printFormat réimpression dépend colonne migrée.
- **OK serveur** : sync statut depuis paiements.
- **P1** : EntityModuleDataBar + ComptableExportButton — deux exports (compta vs Excel générique) : clarifier libellés.

#### 5.8.2 Paiements (`/paiements`)
- **OK** : choix Ticket/Facture + ouverture PDF.
- **P0** : pas de live sur la liste.
- **P1** : modes/types FR hardcodés vs enums Prisma — bridge nécessaire.

#### 5.8.3 Caisse (`/caisse`)
- **P1** : session caisse vs paiements — vérifier cohérence totale journée vs liste paiements filtrée date.
- **P0** si écart : trésorerie fausse.

#### 5.8.4 Charges / Coûts / Fiscalité / Ventes directes
- **P2** : modules satellites peu reliés au hub commande.
- **P1** : ventes directes stock vs stock atelier — double canal marge.

---

### 5.9 RH

#### 5.9.1 Employés / Absences / Recrutement / Performance / Paie / Annonces
- **P1** : aucun live RH ; EntityModuleDataBar employés = export/import sans trash liste.
- **P1** : réclamation → impact employé non visible immédiatement en Performance.
- **P2** : design RH (liens header) ≠ Orion listes.

#### 5.9.2 Matériels (`/materiels`)
- Univers RH (parc) vs Machines Production — **OK après anti-doublon**, à réexpliquer en aide.
- Soft-archive Equipment nouveau.

#### 5.9.3 Mon profil
- OK isolé ; **P2** aussi sous Mon espace.

---

### 5.10 ADMINISTRATION (SoT)

Modules souvent `hidden` dans sidebar plate mais accessibles via hub Backoffice :

| Zone | Risque |
|------|--------|
| Catalogue & POS | Sync POS — cœur P0 métier |
| Prix / Variables / Matières | Divergence devis historiques vs nouveaux — **voulu** si snapshot, **bug** si relecture live |
| Flux & statuts | Si mal configuré → commandes bloquées |
| Synchronisation | Centre dédié — si peu utiliséé, sync reste magique |
| Import/Export | Mature Admin ; CRM entity-data **parallèle** (DESIGN-02) |
| Permissions | Matrice complexe — rôles lecture seule vs write |

**P0 ADMIN-01** : toute publication prix sans emit live consommé = POS stale.  
**P1 ADMIN-02** : plusieurs URLs hub (`/admin`, `/administration/backoffice`, catalogue-prix-stock) — **trop d’entrées** même en hidden.

---

### 5.11 MON ESPACE

Workspaces par rôle — bons pour focus, **mauvais** si l’utilisateur croit que ce sont des modules distincts avec données différentes.

**Retouche** : sous-titre systématique « Vue filtrée du module X » + lien « Ouvrir module complet ».

---

## 6. Données incorrectes / non mises à jour après modification (checklist)

| # | Scénario | Risque | Correctif |
|---|----------|--------|-----------|
| 1 | Encaissement → liste Factures ouverte | Statut/reste faux à l’écran | `useOrionLiveRevision(['factures','paiements'])` |
| 2 | Encaissement → hub 360 onglet finance | Snapshot UI stale | Élargir live hub |
| 3 | Livraison « Livrée » → liste Commandes autre poste | Statut commande retardé | Emit + listener livraisons/commandes |
| 4 | Admin change prix → POS autre onglet | Prix panier faux | Déjà partiel ; tester E2E multi-onglets |
| 5 | Soft-archive devis sans migrate | Erreur Prisma / filtre ignoré | generate + migrate |
| 6 | Import entity-data devis | Créés 0 / ignored | Ne pas afficher Import tant que mapping lignes absent |
| 7 | KPI Pilotage vs listes archivées | Totaux gonflés | Filtrer archived |
| 8 | Badge sidebar vs liste | Chiffre ≠ réalité | Unifier query badges + listes |
| 9 | reservedQty stock vs consommation production | Stock négatif logique | Transaction unique |
| 10 | printFormat non persisté (client Prisma old) | Toujours PDF facture | generate |

---

## 7. Plan de remédiation priorisé (vers 10/10)

### Vague R1 — P0 (1–3 jours)
1. Stopper Next → `prisma generate` + `migrate deploy` (printFormat + archived).
2. Brancher `useOrionLiveRevision` sur **factures, paiements, livraisons, caisse, réclamations**.
3. Étendre live du **hub commande 360** (factures, paiements, stock, bat, livraisons).
4. Tests E2E : paiement → facture statut + commande reste + PDF format.

### Vague R2 — P1 sync & corbeille (3–7 jours)
1. Trash réelle : stock, fournisseurs, machines, achats, livraisons (filtre API + UI).
2. Étendre `OrionLiveDomain` : `reclamations`, `rh`, `machines`, `achats`.
3. Retirer Import trompeur devis/achats/livraisons ou implémenter upsert lignes.
4. Unifier badges nav avec mêmes where que listes.
5. Clarifier Ticket vs Facture (microcopy + aide).

### Vague R3 — Design unique (1–2 semaines)
1. **Un** list-page shell : OrionPageHeader + EntityModuleDataBar + AppModuleToolbar + sticky CTA.
2. Migrer AppPageHeader listes vers ce shell.
3. Workspaces : bandeau « vue filtrée ».
4. Réduire modes livraisons (Dispatch par défaut, autres en menu).
5. Sidebar : séparer badge alerte vs état ops commande (deux signaux distincts).

### Vague R4 — Flux & pédagogie
1. Réordonner aide / onboarding : **Finance parallèle** dès commande (pas « après livraison »).
2. Supprimer maps next-action deprecated.
3. Documenter ordre Stock avant Studio (ou le changer si métier ANS dit le contraire).

---

## 8. Inventaire conformité Import / Export / Corbeille (état code)

Réf. `lib/crm/entity-data-compliance.ts` + implémentation récente.

| Entité | Import | Export | Corbeille | Note audit |
|---------|--------|--------|-----------|------------|
| clients | oui | oui | oui | Double UI trash |
| devis | partiel | oui | oui | Import faible |
| reclamations | oui | oui | partiel | Live manquant |
| suppliers | oui (Admin+) | oui | partiel | Double Excel |
| stock-items | oui | oui | partiel UI | Service filtre archived OK |
| purchase-orders | partiel | oui | partiel | |
| machines | oui | oui | partiel | |
| equipments | oui | oui | partiel | |
| livraisons | partiel | oui | partiel | Live manquant |
| commandes | non | oui | partiel | Ledger OK policy |
| factures | non | oui | partiel | printFormat + live |
| paiements | non | oui | partiel | Live manquant |
| employees | oui | oui | partiel | |

---

## 9. Couverture navigation auditée (checklist A→Z)

- [x] Pilotage — cockpit, operations, rapports, performance, historique  
- [x] Commercial — clients, pos, panier, devis, commandes, reclamations  
- [x] Stock & Achats — stock, magasin, achats, fournisseurs  
- [x] Studio & BAT — studio, conception, bat  
- [x] Production — dossiers, production, planning, tâches, qualité, plan matière, machines, tickets, ws atelier  
- [x] Communication — talk, suggestions, campagnes, relances, notifications, aide  
- [x] Logistique — livraisons, ws logistique  
- [x] Finance — factures, paiements, caisse, charges, coûts, fiscalité, ventes directes  
- [x] RH — employés, recrutement, absences, performance, paie, annonces, matériels, profil  
- [x] Administration — hubs backoffice / catalogue / prix / matières / sync / import-export / permissions  
- [x] Mon espace — workspaces  
- [x] Transversal — live bus, soft-archive, printFormat, design headers, next-action, badges, snapshots paiement  

---

## 10. Conclusion

ORION a déjà les **bons fondations ledger et parcours commande**. Les écarts qui empêchent le 10/10 ne sont plus « l’absence totale de modules », mais :

1. **Feedback live incomplet** (données écran non maj),  
2. **Soft-archive / Prisma non généré** (dette opérationnelle immédiate),  
3. **Design & toolbars hétérogènes**,  
4. **Contradictions d’ordre de flux** (finance / stock / communication),  
5. **Promesses UI** (import, corbeille, univers « fait ») **plus larges** que le comportement réel.

Ce fichier est la **liste de retouches unique** à suivre jusqu’à conformité expert.

---

*Fin de l’audit A→Z — fichier unique téléchargeable.*  
*Chemin : `2em-export-complet-UNIQUE/AUDIT-COMPLET-A-Z-ORION.md`*
