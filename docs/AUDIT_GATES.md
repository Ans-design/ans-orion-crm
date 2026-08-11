# Gates audit ANS ORION

## Commandes

```bash
npm run sanitize:secrets              # liste .env sensibles locaux
npm run export:clean                  # dossier export-clean sans secrets
npm run export:clean -- --zip         # + archive ZIP
npm run export:missing-material-prices # Excel ~120 matières sans prix
npm run backfill:base-material-prices
npm run backfill:task-assignees
npm run backfill:planning-slots
npm run repair:sync-drift
npm run verify:audit-gates            # lint + typecheck + test + pos + drift + api-auth + build
npm run verify:audit-gates -- --skip-build  # sans build (dev actif)
npm run audit:build-snapshot          # snapshot source sans secrets/DB
```

Voir aussi `docs/EXPORT_SECURITY_CHECKLIST.md`.

## Règles

- Toujours `APP_ENV=local` + `DATABASE_URL=file:./prisma/dev.db` pour les scripts locaux.
- Ne jamais zipper `.env*`, `prisma/*.db`, `e2e/.auth`, `deploy/hostinger/.chrome-cdp`.
- Si un ZIP a déjà fuité des secrets : révoquer / régénérer.
