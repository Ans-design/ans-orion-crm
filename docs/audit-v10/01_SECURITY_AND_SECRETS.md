# Sécurité et secrets (V10)

## SEC-004 — Checklist rotation (SANS VALEURS)

Statut : **BLOCKED** — rotation à effectuer manuellement sur les consoles.

- [ ] NextAuth / AUTH_SECRET
- [ ] SETUP_SECRET
- [ ] DATABASE_URL / credentials DB
- [ ] Intégrations (Resend, Sentry, webhooks, stockage)
- [ ] Comptes demo / E2E
- [ ] Invalidation sessions après rotation (`credentialsRotatedAt` / version session)

Propriétaire : administrateur ANS DESIGN.  
Preuve attendue : capture/confirmation hors dépôt (jamais coller les secrets ici).

## Export

Voir `scripts/export-clean.mjs` — canaris obligatoires.  
Livrables ChatGPT : **sans** `.env*` ni `*.db` (script portable).

## Vulnérabilités npm

Voir `results.json` après `npm audit --omit=dev`. Critères C019/C020.
