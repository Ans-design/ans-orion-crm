# POS Variables Price Impact — Rapport final

Date : 2026-07-04  
Statut : livré en lot unique

## Objectifs couverts

1. **Paiement par commande** dans le détail commande (niveau `commandeId`, resync factures)
2. **Modèle unifié** descriptif vs tarifaire
3. **Neutralisation ciblée** sans casser format / quantité / variables tarifaires
4. **Persistance** POS → panier → devis → commande avec badges légers
5. **Backoffice pricing** branché sur le moteur dynamique
6. **Tests + rapports** de validation

---

## Axe 1 — Paiement commande

### UI

- `components/commandes/order-payment-button.tsx` — bouton « Enregistrer paiement »
- `components/encaissement-modal.tsx` — montant, type, mode, Mobile Money, banque, référence, date/heure, payeur, note
- `components/commandes/order-finance-tab.tsx` — statuts `Non payé` / `Acompte` / `Partiel` / `Soldé`, totaux, historique
- `components/commandes/commande-360-view.tsx` — refresh après encaissement

### Service

- `lib/server/modules/paiements/paiement-payment-meta.ts` — encodage métadonnées dans `notes`
- `lib/server/modules/paiements/paiements.service.ts` — mode effectif, validation référence
- `lib/services/facture-workflow-service.ts` — `syncCommandeLinkedFacturesFromPayments`
- `lib/server/modules/snapshots/snapshot.service.ts` — `buildPaymentSnapshot` enrichi
- `lib/validators/crm.ts` — schéma étendu

### Décision figée

Un paiement sans `factureId` met à jour la commande **et** resynchronise toutes les factures liées pour éviter la dérive finance.

---

## Axe 2–5 — Impact prix

Voir `docs/POS_PRICE_IMPACT_RULES_REPORT.md` pour le détail des règles.

### Affichage synthèse

- `lib/cart-config-display.ts` — suffixes `(descriptif)` / `(impact prix)`
- Consommateurs : devis, snapshots commande, sections snapshot UI

### Variables toujours tarifaires (non neutralisées)

Format, dimensions, quantité, surface, laize, grammage, reliure tarifaire, faces, urgences, livraison, main d’œuvre, prix manuel.

---

## Checklist validation manuelle

- [ ] POS : changer orientation / couleur goodies → total inchangé
- [ ] POS : changer format / quantité → total mis à jour
- [ ] Panier / devis : variables descriptives visibles avec badge
- [ ] Commande finance : encaissement partiel → statut + reste + facture resync
- [ ] Backoffice pricing : toggle « Impacte le prix » persisté après sync catalogue
- [ ] Snapshot ancien avec `nb_perforations` : affichage OK, pas de champ UI neuf

---

## Commandes exécutées

```bash
npm run typecheck
npx prisma validate
npm run test -- tests/price-impact-rules.test.ts tests/dynamic-pricing-seed.test.ts
npm run build
```

Remplacer `[ ]` par `[x]` après vérification manuelle POS / commande / backoffice.
