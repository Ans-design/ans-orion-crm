# ANS ORION — Export Windows COMPLET « export tena final »

Généré le 10/08/2026 09:27:59.

Archive : `export tena final.zip` (Bureau Windows).

## Contenu

Export **intégral** du dossier projet :
- code (`app`, `components`, `lib`, …)
- `node_modules`
- caches `.next` / `.next-e2e`
- `.env*` (dont `.env.local`)
- bases Prisma (`prisma/*.db` si présentes)
- `.git`, docs, data, scripts, tests…

## Extraction (Windows)

1. Clic droit → Extraire tout… vers un dossier court, ex. `C:\ANS-ORION`
2. Ouvrir ce dossier (vous devez voir `package.json`, `app`, `node_modules`)
3. Si besoin : `npx prisma generate` puis `npm run dev:local`
4. http://127.0.0.1:3020

**Ne pas publier** cette archive (secrets + DB inclus).
