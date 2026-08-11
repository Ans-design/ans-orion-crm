# Checklist sécurité export ANS ORION

Avant de transmettre un ZIP, une archive ou un snapshot du projet :

## Exclusions obligatoires

- [ ] `.env`, `.env.local`, `.env.production`, `.env.vercel.*`, `.env.backup*`
- [ ] Bases SQLite : `*.db`, `prisma/dev.db`, `prisma/e2e.db`
- [ ] `node_modules`, `.next`, `test-results`, `playwright-report`
- [ ] `deploy/hostinger/.chrome-cdp` (profils navigateur)
- [ ] `e2e/.auth` (sessions Playwright)
- [ ] Archives déjà partagées : `ANS_ORION_FULL_AUDIT_BUNDLE.zip`

## Fichiers autorisés

- [ ] `.env.example` uniquement (sans secrets réels)
- [ ] Code source, docs, schéma Prisma, migrations (sans données prod)

## Commandes

```bash
npm run sanitize:secrets      # liste les secrets présents localement
npm run export:clean          # dossier export-clean/ sans artefacts sensibles
npm run export:clean -- --zip   # + ZIP à la racine
npm run audit:build-snapshot  # bundle audit (exclusions DB/CDP)
```

## Si un ZIP a déjà été partagé avec des secrets

1. Révoquer / régénérer toutes les clés listées par `sanitize:secrets`
2. Changer mots de passe admin et comptes démo
3. Invalider tokens Vercel / Hostinger / Neon si exposés
4. Ne jamais re-committer les fichiers `.env*`

## Validation avant envoi

- [ ] `npm run verify:audit-gates` OK en local
- [ ] Aucun fichier `.db` dans l’archive
- [ ] Recherche manuelle `DATABASE_URL`, `NEXTAUTH_SECRET`, `API_KEY` dans l’export
