# Matrice RACI ANS — V2-02R

| Date | 2026-07-18 |
|------|------------|
| Règle | Pas un rôle technique par intitulé V17 — permissions granulaires |

## Fonctions V17 ↔ rôles ORION

| Fonction V17 | Rôle(s) auth | Mission | A (Accountable) | R (Responsible) | Escalade |
|--------------|--------------|---------|-----------------|-----------------|----------|
| Administration principale | `admin` | Config, users, publish | Direction | Admin | — |
| Appui admin / caisse | `caisse`, `accueil` | Encaissement, accueil | Manager | Caisse | Manager |
| Chargé clientèle | `commercial`, `cm` | Devis, suivi | Manager | Commercial | Manager |
| Community Manager | `cm` | Digital, leads | Manager | CM | Commercial |
| Resp. technique / prépresse | `technicien`, `designer` | Fichiers, BAT | Manager | Technicien | Direction |
| Graphiste PAO | `designer` | Créa, BAT | Technicien | Designer | Technicien |
| Op. petit format | `production`, `conducteur` | Impression PF | Conducteur | Opérateur | Manager |
| Op. grand format / logistique | `production`, `livraison` | GF + expédition | Conducteur | Opérateur | Manager |
| Aide-conducteur | `production` | Assistance atelier | Conducteur | Aide | Conducteur |
| Façonnage | `faconnage` | Finition | Conducteur | Façonnage | Conducteur |
| CQ / produits finis | `production` | Contrôle final | Manager | CQ | Manager |
| Coursier | `livraison` | Livraison | Manager | Coursier | Accueil |
| Direction / audit | `manager`, `admin`, `finance` | Pilotage, audit | Direction | Manager | — |

## Séparation des tâches (H05)

| Domaine | Demande | Validation | Exécution | Interdit |
|---------|---------|------------|-----------|----------|
| Caisse | Caissier | Manager (dette) | Caissier | Auto-remboursement non tracé |
| Achat | Achats | Manager | Achats | Seed sans backup |
| Publish tarifs | Config | `config:publish` | Admin | View-only mutate |
| Paiement MM | Caisse | Référence obligatoire | Caisse | Double ref (idempotence V2-06) |

## Limites demo

Rôle `demo` : lecture élargie, **écritures finance/prod/stock restreintes** (Lot 2).
