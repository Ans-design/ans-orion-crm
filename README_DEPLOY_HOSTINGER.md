# Déploiement Hostinger — ANS ORION CRM

URL production : **https://darkorchid-badger-644294.hostingersite.com**

## Configuration hPanel Node.js

| Paramètre | Valeur |
|-----------|--------|
| Framework | Next.js |
| Branch | `main` |
| Root | `./` |
| Node | 22.x |
| Build | `npm run build:hostinger` |
| Start | `npm start` |
| Package manager | npm |

## Variables d'environnement (obligatoires)

Copier depuis `deploy/hostinger/orion.env` (généré par `npm run hostinger:deploy`) :

```env
DATABASE_URL=postgresql://...neon...
USE_PRODUCTION_DB=true
AUTH_TRUST_HOST=true
ALLOW_V29_AUTH=true
NEXTAUTH_URL=https://darkorchid-badger-644294.hostingersite.com
HOSTINGER_SITE_URL=https://darkorchid-badger-644294.hostingersite.com
NEXTAUTH_SECRET=<64 caractères minimum>
AUTH_SECRET=<identique à NEXTAUTH_SECRET>
```

## Initialisation base Neon (une fois)

```bash
# Local — avec URL Neon
DATABASE_URL="postgresql://..." npm run seed:production
DATABASE_URL="postgresql://..." npm run verify:production
```

Migration depuis ancienne SQLite :

```bash
OLD_DATABASE_URL="file:./prisma/dev.db" DATABASE_URL="postgresql://..." npm run migrate:old-data
```

## Analyse HTML source v29

Le fichier `crm complet ans design sauf devis deja fini par les developpeur ok.html` est la référence métier ORION v29.

```bash
# Copier le HTML vers le projet (recommandé)
mkdir -p data/reference
cp "chemin/vers/crm complet...ok.html" data/reference/ans-orion-v29-source.html

# Analyse A-Z + rapport de gaps
npm run extract:html
# → data/reference/html-source-gap-report.json
```

Éléments déjà intégrés dans Next.js :

- Comptes matricules v29 (`lib/orion-v29-accounts.ts`)
- Navigation par rôle (`lib/modules/role-registry.ts`)
- Mapping pages HTML → routes (`lib/html-source-route-map.ts`)
- POS préservé — prix via `npm run sync:pos-prices`

## Scripts maintenance

| Commande | Rôle |
|----------|------|
| `npm run seed:production` | Seed complet (users, clients, commandes, stocks, GPAO…) |
| `npm run seed:incremental` | Upsert comptes v29 + audit (sans db push) |
| `npm run verify:production` | Compteurs DB |
| `npm run create:admin` | Créer/réinitialiser admin |
| `npm run backup:export` | Export JSON backup |
| `npm run migrate:old-data` | Migration ancienne DB |
| `npm run hostinger:deploy` | ZIP + orion.env |
| `npm run hostinger:healthcheck` | Test `/api/health` en production |
| `npm run extract:html` | Analyse HTML source v29 |
| `npm run sync:pos-prices` | Sync tarifs POS depuis Excel |
| `npm run verify:pos-prices` | Vérif couverture prix |
| `npm run check:env` | Vérif variables env |
| `npm run reset:admin` | Reset mot de passe admin |

## Vérification post-déploiement

1. `GET /api/health` → `{ ok: true }` (sans Prisma — rapide)
2. `GET /api/health/db` → `{ ok: true, database: "connected" }` (Neon, timeout 6s)
3. `/admin` → hub backoffice + score seed
4. `/login` → connexion avec `ADMIN_EMAIL` / `<ADMIN_PASSWORD>` (variables d’environnement)
5. `/dashboard` → KPIs (pas d'écran vide)
6. `/panier` → panier local + sync serveur
7. `/rapports` · `/historique` · `/pos`

```bash
npm run hostinger:healthcheck
```

### Dépannage 503 / 504

| Symptôme | Cause | Action |
|----------|-------|--------|
| `/api/health/db` → `file:` protocol | Client Prisma SQLite en prod | Rebuild avec `build:hostinger` (génère client PostgreSQL) |
| `/api/health/db` timeout | Neon lent ou URL invalide | Vérifier `deploy/hostinger/database.bundled.env` + hPanel `DATABASE_URL` |
| Dashboard vide | DB vide ou API timeout | `npm run seed:incremental` ou `seed:production` |
| Panier « Session invalide » | User absent de Neon | `npm run seed:incremental` (comptes v29) |
| `EPERM` prisma generate | Serveur Next verrouille le moteur | Arrêter `next start` puis relancer seed |

### Seed incrémental (sans db push)

Après un premier `seed:production`, pour ajouter comptes matricules v29 sans tout réinitialiser :

```bash
DATABASE_URL="postgresql://..." npm run seed:incremental
```

## Comptes après seed

Les mots de passe **ne sont jamais** documentés en clair. Utiliser :

- `ADMIN_EMAIL` + `ADMIN_PASSWORD` (≥12) ou bootstrap `ORION_SEED_BOOTSTRAP_SECRET`
- Comptes démo **interdits** en production (`assert-production-boot`)
- Matricules v29 : uniquement via `ORION_V29_PASSWORDS_JSON` (local / staging contrôlé)

## Dépôt Git

`https://github.com/Ans-design/ans-crm-hostinger.git` — push `main` vers GitHub.

**Important hPanel** : si le site ne se met pas à jour après push, ouvrir **hPanel → Sites → Node.js → Redéployer** (le webhook Git n’est pas toujours actif). Au démarrage, `prestart` régénère le client Prisma PostgreSQL automatiquement.
