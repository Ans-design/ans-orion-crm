# AUDIT 360 — Phase 7 : Fonctionnalités / Gap Analysis

Date : 2026-07-04  
Référence : `docs/MODULES_MAP.md`, `docs/ROADMAP_EXECUTION.md`

---

## Fonctionnalités présentes ✅

CRM clients · POS catalogue · Panier · Devis · Commandes hub 360 · BAT/Proofs · Studio briefs · Production/GPAO · Stock · Achats · Machines · Livraisons · Factures · Paiements · Caisse · RH (employés, présences, absences, paie partielle) · ANS Talk · Dashboard · Rapports · Backoffice admin · Import/export · Notifications · Audit log

---

## Fonctionnalités manquantes / incomplètes

| Fonctionnalité | Priorité | Effort |
|----------------|----------|--------|
| Coût de revient automatique post-prod | P1 | L |
| Relances CRM automatisées | P1 | M |
| Export comptable standard Mada | P1 | M |
| Planning machine réel | P2 | L |
| Signature électronique devis/BAT | P2 | M |
| Portail client self-service | P2 | L |
| App mobile livreur native | P3 | L |
| BI prédictif / forecasting | P3 | L |

---

## Doublons à masquer (pas supprimer)

- `/admin/pricing` → alias administration
- `/admin-control` → alias administration
- `/ans-talk` → redirect `/messagerie`
- Modules hidden registry (`tarifs`, `rh_soon`)

---

## Roadmap suggérée (extrait)

1. **Vague 1 (P0-P1) :** Sync prix, paiement commande, hub commande, validation POS
2. **Vague 2 :** Facture auto, relances, exports finance
3. **Vague 3 :** UX/UI polish, Storybook
4. **Vague 4 :** RH paie complet, conformité locale (expert)
5. **Vague 5 :** Logistique transporteurs Mada, BI avancée

---

## Modules incomplets

| Module | Gap |
|--------|-----|
| RH paie | Calcul IRSA/CNaPS à valider expert |
| Finance fiscalité | Obligations — structure OK, contenu à valider |
| CM campagnes | Maquette > opérationnel |
| Rapports | Partiel vs BI complet |
