# ANS ORION — Export OK CRM COMPLET

Archive générée le 02/08/2026 11:51:19.

## Contenu

- Code source complet
- `node_modules` (dépendances déjà installées)
- `prisma/dev.db` + `.env.local` portable (`DATABASE_URL="file:./dev.db"`)
- `data/`, docs, configs

## Exclu (volontaire)

- `.next` / `.next-build` — caches build (~3 Go), se régénèrent
- `playwright-report` / `test-results`

## Nouveau PC

1. Dézipper
2. Node.js 20+
3. `npx prisma generate`
4. `npm run dev` → http://127.0.0.1:3020

Si erreur modules natifs (rare) : `npm install` puis relancer.
