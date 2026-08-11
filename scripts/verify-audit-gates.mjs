#!/usr/bin/env node

/**

 * Gates audit locaux — APP_ENV=local + SQLite.

 * Usage: npm run verify:audit-gates

 */

import { spawnSync } from 'child_process';



const env = {

  ...process.env,

  APP_ENV: 'local',

  LOCAL_DEV: 'true',

  DATABASE_URL: process.env.DATABASE_URL?.startsWith('file:')

    ? process.env.DATABASE_URL

    : (process.env.DATABASE_URL_SQLITE || 'file:./prisma/dev.db'),

};



const skipBuild = process.argv.includes('--skip-build');



function run(label, cmd, args) {

  console.log(`\n▶ ${label}`);

  const r = spawnSync(cmd, args, { stdio: 'inherit', env, shell: true });

  if (r.status !== 0) {

    console.error(`\n❌ ${label} failed (exit ${r.status})`);

    process.exit(r.status ?? 1);

  }

}



console.log('🔐 verify:audit-gates — local SQLite');

run('lint', 'npm', ['run', 'lint']);

run('typecheck', 'npm', ['run', 'typecheck']);

run('test', 'npm', ['run', 'test']);

run('verify:pos-prices', 'npm', ['run', 'verify:pos-prices']);

run('sync:verify-drift', 'npm', ['run', 'sync:verify-drift']);

run('audit:api-auth', 'npm', ['run', 'audit:api-auth']);

if (!skipBuild) {

  run('build:local', 'npm', ['run', 'build:local']);

} else {

  console.log('\n⏭ build:local ignoré (--skip-build)');

}

console.log('\n✅ verify:audit-gates OK\n');

