#!/usr/bin/env node
/** Valide schema.prisma avec DATABASE_URL SQLite local (évite le faux échec postgres/.env). */
import { execSync } from 'child_process';
import { ensureSqliteSchema, localSqliteEnv } from './lib/sqlite-schema.mjs';

ensureSqliteSchema();
const env = localSqliteEnv();
execSync('npx prisma validate', { stdio: 'inherit', env, cwd: process.cwd() });
console.log('✓ schema Prisma valide (sqlite local)');
