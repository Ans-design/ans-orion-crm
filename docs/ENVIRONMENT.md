# Variables d'environnement — ANS ORION

## Fichiers

| Fichier | Usage |
|---------|-------|
| `.env.example` | Modèle versionné (sans secrets) |
| `.env.local` | Dev local (gitignored) |
| `.env` | Alternative locale (gitignored) |
| hPanel Hostinger | Production |

## Obligatoires (production)

```env
DATABASE_URL="postgresql://..."
NEXTAUTH_SECRET="64+ caractères aléatoires"
AUTH_SECRET="identique à NEXTAUTH_SECRET"
NEXTAUTH_URL="https://darkorchid-badger-644294.hostingersite.com"
HOSTINGER_SITE_URL="https://darkorchid-badger-644294.hostingersite.com"
AUTH_TRUST_HOST="true"
NODE_ENV="production"
```

## Développement local

```env
DATABASE_URL="file:./dev.db"
NEXTAUTH_URL="http://localhost:3000"
```

## Optionnelles

- `RESEND_API_KEY`, `EMAIL_FROM` — emails
- `S3_*` — fichiers R2/S3
- `E2E_EMAIL`, `E2E_PASSWORD` — tests prod
- `SETUP_SECRET` — init DB prod unique
- `ALLOW_PUBLIC_SIGNUP` — inscription publique

## Règles

1. Ne jamais committer `.env` ou `.env.local`
2. `.gitignore` contient `.env*`
3. Redéployer Hostinger après changement d'env
4. `npm run check:env` pour valider localement

Voir `.env.example` pour la liste complète.
