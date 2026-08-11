# Tutoriel débutant — ANS ORION (CRM / ERP imprimerie)

**Objectif** : comprendre et exploiter le projet à **100 %**, module par module, dans le bon ordre.  
**Public** : débutant (commercial, atelier, finance, RH, admin).  
**App locale typique** : http://127.0.0.1:3020 — page de connexion `/login`  
**Aide in-app** : menu **Communication → Centre d’aide** (`/aide`)

---

## 1. Qu’est-ce qu’ANS ORION ?

ORION est le système de gestion d’une **imprimerie / studio** : clients, devis, commandes, stock, graphisme (BAT), production, livraisons, factures, caisse, RH, communication interne.

### Idée centrale (à retenir)

Une **commande** est le fil rouge. Autour d’elle tournent 7 univers opérationnels :

1. **Commercial** → vente créée  
2. **Stock & Achats** → matières OK  
3. **Studio & BAT** → fichiers / validation client  
4. **Production** → fabrication  
5. **Communication** → échanges équipe / client  
6. **Logistique** → livraison  
7. **Finance** → facture + paiement soldé  

La sidebar reprend ces univers (+ Pilotage, RH, Administration, Mon espace).

### Règle d’or pour un débutant

| Ne commencez PAS par… | Commencez plutôt par… |
|---|---|
| Administration / prix / sync | Créer un client → devis → commande |
| Tous les workspaces | Un seul parcours vente complet |
| Import Excel massif | 2–3 fiches manuelles pour comprendre |

---

## 2. Premiers pas (jour 1 — 30 minutes)

### 2.1 Se connecter

1. Ouvrir l’app → `/login`  
2. En local : utiliser **Accès de démonstration** (cartes profils) ou email + mot de passe du seed.  
3. Après login → **Cockpit** (`/dashboard`) ou l’accueil de votre rôle.

### 2.2 Repères d’interface

| Élément | Utilité |
|---|---|
| **Sidebar (gauche)** | Univers métier → modules |
| **Recherche modules** | Trouver vite un écran (ex. « devis », « caisse ») |
| **Palette / raccourcis** | Navigation rapide (Escape pour fermer) |
| **Bandeau / alertes** | Urgences, messages équipe |
| **Hub commande 360** | Tout le cycle d’**une** commande |
| **Toolbar liste** | Recherche, Export Excel, Import (si autorisé), **Corbeille** (`?archived=1`) |
| **Live multi-postes** | Les listes se rafraîchissent quand un autre poste modifie (même serveur) |

### 2.3 Exercice obligatoire n°1 (parcours minimal)

Faites **une fois** ce scénario de bout en bout avant d’explorer le reste :

1. **Clients** → créer un client test  
2. **Catalogue vente (POS)** → choisir un article  
3. **Panier** → construire l’offre  
4. **Devis** → valider / convertir  
5. **Commandes** → ouvrir la fiche 360  
6. Suivre les boutons univers (Stock → Studio → Prod → Log → Finance)  
7. **Factures / Paiements** → encaisser (ticket ou facture selon le format choisi)  
8. **Livraisons** → marquer livré si applicable  

Quand ce parcours est clair, vous pouvez apprendre les autres modules.

---

## 3. Dans quel ordre apprendre ? (plan formation)

### Semaine type recommandée

| Étape | Quand | Quoi exercer | Pourquoi avant le reste |
|---|---|---|---|
| **A** | Jour 1 | Login + Pilotage (lecture seule) + Aide | Voir l’ensemble sans casser de données |
| **B** | Jour 1–2 | **Commercial** (Clients → POS → Panier → Devis → Commandes) | Cœur du métier |
| **C** | Jour 2 | **Stock** + Achats (lecture + 1 mouvement) | Comprendre pourquoi une commande bloque |
| **D** | Jour 3 | **Studio & BAT** | Sans BAT, la prod ne démarre pas bien |
| **E** | Jour 3–4 | **Production** (Dossiers GPAO → Kanban → Planning) | Exécution atelier |
| **F** | Jour 4 | **Logistique** + **Finance** | Clôturer le cycle client |
| **G** | Jour 5 | **Communication** (ANS Talk, relances) | Coordination multi-postes |
| **H** | Semaine 2 | **RH** selon rôle | Pointage, absences, paie |
| **I** | Semaine 2 (admin) | **Administration** (catalogue, prix, sync) | Source de vérité — réservé formés |
| **J** | Continu | **Mon espace** = vue filtrée de votre poste | Travail quotidien une fois le flux connu |

### Qui forme qui ?

| Profil | Modules prioritaires | Peut ignorer au début |
|---|---|---|
| Commercial / vendeur | Clients, POS, Panier, Devis, Commandes, Réclamations | Machines, paie, sync admin |
| Graphiste | Studio, Conception, BAT, Talk | Achats, fiscalité |
| Atelier / conducteur | Dossiers GPAO, Production, Planning, Machines, Qualité | Catalogue prix admin |
| Magasinier | Stock, Achats, Fournisseurs, Plan matière | Campagnes CM |
| Livreuro / logistique | Livraisons, workspace logistique | Prépresse |
| Finance / caisse | Factures, Paiements, Caisse, Charges | Machines, recrutement |
| RH | Employés, Absences, Paie, Matériels | POS avancé |
| Direction | Cockpit, Ops, Rapports, Historique | Détail chaque écran atelier |
| Admin système | Administration complète + Paramètres | — |

---

## 4. Parcours métier d’une commande (carte mentale)

```
Client
  → Catalogue (POS) + Panier
    → Devis (offre)
      → Commande (engagement)
        → Stock (réservation / achat si manque)
          → Studio / BAT (validation)
            → Production GPAO (impression, façonnage, CQ)
              → Communication (Talk / relances si besoin)
                → Livraison
                  → Facture + Paiement + Caisse
                    → (option) Réclamation SAV
```

**Astuce** : ouvrez toujours la commande dans **Commandes** (vue 360). Les liens `?commande=…` vous emmènent au bon module sans perdre le fil.

---

## 5. Univers par univers — mode d’emploi débutant

### 5.1 Pilotage

| Module | Route | À quoi ça sert | Comment l’utiliser |
|---|---|---|---|
| **Cockpit global** | `/dashboard` | Synthèse direction (CA, urgences, activité) | Lire le matin ; ne pas y « travailler » les commandes |
| **Opérations temps réel** | `/operations` | Urgences / exécution immédiate | Traiter ce qui bloque aujourd’hui |
| **Rapports & analyses** | `/rapports` | Analyses plus détaillées que le cockpit | Hebdo / mensuel |
| **Performance machines & équipes** | `/rapports/performance` | Scores atelier / RH | Suivi productivité |
| **Historique & Audit** | `/historique` | Qui a fait quoi | Contrôle / litiges |

**Exercice** : 10 min — ouvrir Cockpit puis Ops, noter 3 alertes, sans rien modifier.

---

### 5.2 Commercial (à maîtriser en premier)

Ordre affiché / pédagogique : **1 Clients → 2 Catalogue → 3 Panier → 4 Devis → 5 Commandes → 6 Réclamations**

#### Clients (`/clients`)
- Fiche client : contact, historique, documents liés.  
- **Avant** toute vente : créer ou retrouver le client.  
- Export / corbeille : archiver sans détruire (soft-archive).

#### Catalogue vente / POS (`/pos`)
- Choisir les articles / formats / options.  
- Les **prix** viennent de l’Administration (source de vérité), pas d’un Excel improvisé.  
- Conception graphique liée : `/pos/conception`.

#### Panier (`/panier`)
- Construire l’offre avant document officiel.  
- Ensuite bascule vers **Devis** (le document reste dans Devis).

#### Devis (`/devis`)
- Offre commerciale officielle.  
- Valider → convertir en **commande**.  
- Suivre les statuts (brouillon, envoyé, accepté, refusé…).

#### Commandes (`/commandes`)
- Cœur du système : hub 360, onglets (prod, finance, logistique, BAT…).  
- Bannière « prochaine action » : faites ce qu’elle indique.  
- Rail de vie + univers : Stock, Studio, Prod, Com, Log, Finance.

#### Réclamations (`/reclamations`)
- SAV / litiges liés clients.  
- **Après** une commande livrée (ou pendant un conflit qualité).  
- Corbeille via `?archived=1` (Actifs / Corbeille).

**Exercice** : créer Client « DEMO TUTO », devis 1 ligne, convertir, ouvrir hub 360.

---

### 5.3 Stock & Achats (avant / pendant la prod)

| Module | Route | Rôle | Ordre d’usage |
|---|---|---|---|
| **Gestion stocks** | `/stock` | Inventaire matières, alertes, réservations | Vérifier dès qu’une commande est créée |
| **Mon magasin** | `/workspace/magasin` | Vue filtrée magasinier | Quotidien magasin |
| **Achats** | `/achats` | Commandes fournisseurs | Si stock insuffisant |
| **Fournisseurs** | `/fournisseurs` | Fiches fournisseurs | Avant de créer un achat |

**Exercice** : sur une commande, ouvrir `/stock?commande=…`, vérifier disponibilité ; si manque → Achats.

---

### 5.4 Studio & BAT

| Module | Route | Rôle |
|---|---|---|
| **Studio graphique** | `/studio` | Hub : briefs, fichiers, prépresse (onglets) |
| **Conception** | `/pos/conception` | Conception liée à la vente |
| **Bon à tirer (BAT)** | `/bat` | Validation client avant impression |
| **Mon studio** | `/workspace/studio` | Vue filtrée graphiste |

**Ordre** : fichiers / brief → prépresse → **envoyer BAT** → attendre validation → puis production.  
Sans BAT validé, ne forcez pas l’impression.

**Exercice** : depuis une commande, onglet BAT → créer / suivre un BAT jusqu’à « validé ».

---

### 5.5 Production

| Module | Route | Rôle | Quand |
|---|---|---|---|
| **Dossiers GPAO** | `/production/dossiers` | Étapes atelier liées à la commande | Dès commande + BAT OK |
| **Production Kanban** | `/production` | Vue colonnes atelier | Pilotage quotidien atelier |
| **Planning Gantt** | `/planning` | Créneaux machines | Planifier charge |
| **Tâches métier** | `/equipe/taches` | Tâches chronométrées liées commande | Exécution |
| **Contrôle qualité** | `/production/qualite` | CQ / conformité | Avant emballage / livraison |
| **Plan matière / déchets** | `/production/dechets` | Besoins, pertes | Pendant / après tirage |
| **Machines** | `/machines` | Parc impression / finition | Dispo & pannes |
| **Tickets maintenance** | `/maintenance/tickets` | Pannes / interventions | Si machine HS |
| Workspaces | `/workspace/production`, `faconnage`, `conducteur` | Postes filtrés | Selon métier |

**Ordre atelier typique** : Dossier GPAO → Planning → Impression → Façonnage → CQ → Prête.

**Exercice** : ouvrir le dossier GPAO d’une commande et avancer 1–2 étapes réellement.

---

### 5.6 Communication

| Module | Route | Rôle |
|---|---|---|
| **ANS Talk** | `/messagerie` | Chat interne, groupes commande |
| **Suggestions & idées** | `/equipe/suggestions` | Boîte à idées |
| **Campagnes CM** | `/cm/campagnes` | Social media |
| **Relances clients** | `/cm/relances` | Templates devis / factures / prospection |
| **Notifications clients** | `/cm/notifications` | Alertes retard, BAT, livraison |
| **Centre d’aide** | `/aide` | Raccourcis pédagogiques |
| **Mon espace CM** | `/workspace/cm` | Vue filtrée community manager |

**Quand** : pendant et après la réalisation (pas avant d’avoir une commande claire).  
**Exercice** : ouvrir Talk depuis une commande (`?commande=`).

---

### 5.7 Logistique

| Module | Route | Rôle |
|---|---|---|
| **Livraisons** | `/livraisons` | Préparation → expédition → livré |
| **Mes livraisons** | `/workspace/logistique` | Vue livreur / logistique |

**Avant** : production « prête » (et finance selon règles internes : acompte / solde).  
**Exercice** : créer / compléter une livraison liée à la commande test.

---

### 5.8 Finance

| Module | Route | Rôle | Ordre |
|---|---|---|---|
| **Factures** | `/factures` | Documents de facturation | Après / pendant commande selon acompte |
| **Paiements** | `/paiements` | Encaissements | Dès paiement reçu |
| **Caisse** | `/caisse` | Journal caisse | Contrôle journalier |
| **Charges & dépenses** | `/finance/charges` | Sorties | Gestion trésorerie |
| **Coûts de revient** | `/finance/couts-revient` | Marge réelle | Analyse |
| **Ventes directes stock** | `/finance/ventes-directes` | Vente stock hors parcours long | Cas simple |
| **Fiscalité** | `/finance/fiscalite` | TVA / échéances | Comptable |
| **Mon espace finance** | `/workspace/finance` | Vue filtrée | Quotidien finance |

**Important** : au paiement, choisir le format d’impression (**Ticket** ou **Facture**) selon le besoin client.  
Une commande n’est « finance terminée » que si **reste ≤ 0** et facture présente (selon critères hub).

**Exercice** : enregistrer un acompte puis le solde ; vérifier Caisse + reste commande = 0.

---

### 5.9 RH

| Module | Route | Rôle |
|---|---|---|
| **Employés & pointage** | `/rh/employes` | Fiches, présences |
| **Recrutement ATS** | `/rh/recrutement` | Pipeline candidats |
| **Congés & absences** | `/rh/absences` | Demandes / validations |
| **Performance équipe** | `/rh/performance` | Scores / leaderboard |
| **Paie & salaires** | `/rh/paie` | Grille, bulletins |
| **Annonces RH** | `/rh/annonces` | Com interne RH |
| **Matériels RH & IT** | `/materiels` | PC, véhicules, licences (≠ machines atelier) |
| **Mon profil** | `/rh/mon-profil` | Espace personnel |

**Ordre RH** : Employés → Absences → Paie.  
**Ne confondez pas** : **Machines** (atelier) ≠ **Matériels** (RH/IT).

---

### 5.10 Administration (source de vérité — former en dernier)

Réservé aux profils admin / direction formés. Configure **avant** un usage massif en production réelle, mais **après** avoir compris le parcours vente.

| Thème | Exemples de routes | Pourquoi c’est critique |
|---|---|---|
| Vue d’ensemble / Backoffice | `/administration/vue-ensemble`, `/administration/backoffice` | Hub config |
| Catalogue & POS / Prix | `/administration/catalogue-pos`, `/administration/prix` | Les vendeurs vendent ces articles |
| Variables tarification | `/administration/variables` | TVA, coeffs |
| Matières & grammages | `/administration/matieres` | Lien stock / prix |
| Flux & statuts | `/administration/production-flux` | Transitions métier |
| Temps & capacités | `/administration/estimation-temps` | Planning réaliste |
| Synchronisation | `/administration/synchronisation` | Articles↔POS, Prix↔Devis, Stock↔Prod |
| Import / Export admin | `/administration/import-export` | Catalogue avec prévisualisation |
| Permissions | `/admin/permissions` | Qui voit quoi |
| Bandeau alertes | `/admin/ticker` | Messages équipe |

**Ordre admin recommandé** :
1. Permissions / comptes  
2. Catalogue articles  
3. Prix & variables  
4. Matières / stock de base  
5. Flux production  
6. Sync  
7. Import Excel seulement avec prévisualisation  

Aliases utiles : `/admin` → vue d’ensemble ; `/admin/pricing` → prix.

---

### 5.11 Mon espace (workspaces)

Ce ne sont **pas** de nouvelles bases de données : ce sont des **vues filtrées** selon le poste.

| Workspace | Pour qui |
|---|---|
| `/workspace/accueil` | Accueil / réception |
| `/workspace/commercial` | Vendeur |
| `/workspace/studio` | Graphiste |
| `/workspace/production` | Atelier |
| `/workspace/faconnage` | Façonnage |
| `/workspace/conducteur` | Conducteur machine |
| `/workspace/magasin` | Magasin |
| `/workspace/logistique` | Livraisons |
| `/workspace/finance` | Finance |
| `/workspace/cm` | Community manager |
| `/workspace/maintenance` | Technicien |

**Conseil** : apprenez d’abord le **module complet** (ex. `/commandes`), puis utilisez le workspace au quotidien.

---

## 6. Gestes transverses (pour exploiter à 100 %)

### 6.1 Import / Export Excel & Corbeille

Sur beaucoup de listes (clients, réclamations, stock, machines, employés, etc.) :

1. **Exporter** un modèle Excel  
2. Remplir / corriger hors ligne  
3. **Importer** (quand le module l’autorise — certains flux sensibles comme ledger restent protégés)  
4. **Corbeille** = soft-archive (restaurable), pas une suppression définitive improvisée  

Modules typiques couverts : clients, devis, réclamations, fournisseurs, stock, achats, machines, matériels, livraisons, commandes, factures, paiements, employés.

### 6.2 Multi-postes (live)

Si un collègue valide un paiement ou change une commande, votre liste peut se mettre à jour sans F5 (même instance serveur).  
Pensez quand même à regarder la **bannière prochaine action** sur le hub commande.

### 6.3 Recherche & filtres

- Recherche globale modules  
- Filtres dates sur listes  
- Paramètre URL `?commande=` / `?id=` / `?archived=1` pour deep-link

### 6.4 Paramètres personnels

`/parametres` (apparence, notifications, sécurité…) = confort utilisateur.  
La **config métier** (prix, flux) reste dans **Administration**.

---

## 7. Scénarios d’entraînement (checklist 100 %)

Cochez au fur et à mesure.

### Niveau 1 — Vente simple
- [ ] Créer un client  
- [ ] Ajouter un article au panier depuis le POS  
- [ ] Générer un devis  
- [ ] Convertir en commande  
- [ ] Voir la commande en 360  

### Niveau 2 — Réalisation
- [ ] Vérifier le stock lié  
- [ ] Créer / valider un BAT  
- [ ] Avancer le dossier GPAO  
- [ ] Planifier un créneau machine  
- [ ] Passer le CQ  

### Niveau 3 — Clôture
- [ ] Créer une livraison  
- [ ] Émettre facture  
- [ ] Enregistrer paiement (ticket **ou** facture)  
- [ ] Vérifier caisse  
- [ ] Confirmer reste = 0  

### Niveau 4 — SAV & équipe
- [ ] Ouvrir ANS Talk sur la commande  
- [ ] Créer une réclamation  
- [ ] Relancer un client (template)  

### Niveau 5 — Pilotage & admin
- [ ] Lire cockpit + un rapport  
- [ ] Archiver / restaurer une fiche (corbeille)  
- [ ] Exporter Excel d’un module  
- [ ] (Admin) Vérifier un prix catalogue et la sync  

---

## 8. Erreurs fréquentes de débutant

| Erreur | Conséquence | Bon réflexe |
|---|---|---|
| Commencer par Admin / Sync | Catalogue cassé, prix incohérents | D’abord 1 vente complète |
| Ignorer le BAT | Retouches / rebuts | Valider BAT avant tirage |
| Confondre Machines et Matériels | Mauvais parc | Machines = atelier ; Matériels = RH/IT |
| Travailler seulement dans un workspace | Vision partielle | Comprendre le module complet |
| Payer sans regarder le reste commande | Impayés cachés | Toujours vérifier hub finance |
| Supprimer au lieu d’archiver | Perte de tracabilité | Utiliser Corbeille / soft-archive |
| Former tout le monde à tout | Surcharge | Former par rôle (tableau §3) |

---

## 9. Où trouver l’aide au quotidien

| Support | Emplacement |
|---|---|
| Centre d’aide in-app | `/aide` |
| Ce tutoriel (texte) | `TUTORIEL-DEBUTANT-ANS-ORION.md` |
| Version imprimable / PDF | `TUTORIEL-DEBUTANT-ANS-ORION.pdf` (même dossier) |
| Audit technique | `AUDIT-COMPLET-A-Z-ORION.md` |
| Rapport qualité produit | `RAPPORT-FINAL-ORION-10-10.md` |
| Démarrage local | `README_LOCAL.md` |

---

## 10. Résumé en une phrase

**Apprenez d’abord Client → POS → Devis → Commande → Stock → BAT → Production → Livraison → Facture/Paiement ; ensuite Communication, RH, Pilotage ; Administration en dernier une fois le métier compris.**

---

*Document généré pour formation interne ANS ORION — à imprimer ou diffuser en PDF.*
