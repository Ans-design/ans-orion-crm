# AUDIT 360 — Phase 12 : Livraison / Coopératives / Colis Madagascar

Date : 2026-07-04

> Sources locales (Cotisse, Besady, Rapido, etc.) — **à vérifier** avant intégration commerciale.

---

## État module logistique

| Fonction | Route | Statut |
|----------|-------|--------|
| Liste livraisons | `/livraisons` | ✅ |
| Workspace livreur | `/workspace/conducteur`, `/workspace/logistique` | ✅ |
| Lien commande | Deep link `?commande=` | ✅ |
| Preuve livraison | Photo + note | ✅ |
| Axes / landmarks | Snapshot devis/commande | ✅ partiel |
| Transporteurs | Config limitée | ⚠️ |
| Coûts livraison | Global pricing | ⚠️ |
| Tournées | — | ❌ P3 |

Modèle : Livraison (statut, proofPhotoUrl, commandeId)

---

## Modèle cible livraison Mada

| Donnée | Description |
|--------|-------------|
| Mode | Atelier / livraison / point relais / province |
| Axe | Antananarivo / périphérie / régions |
| Transporteur | Cotisse, Besady, Rapido, interne ANS |
| Coût | Frais + assurance optionnelle |
| Colis | Poids, dimensions, nb colis |
| Statuts | À planifier → En tournée → Livré / Échec / Retour |
| Preuve | Photo + signature future P2 |

---

## Intégration future (P3)

- API transporteurs si disponibles
- Tracking numéro colis
- Paiement à la livraison (COD) sync finance

---

## Priorités

**P1 :** Statuts livraison ↔ commande ↔ facture  
**P2 :** Référentiel transporteurs + tarifs axes  
**P3 :** Tournées conducteur, intégrations API
