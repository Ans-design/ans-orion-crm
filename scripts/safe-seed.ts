import fs from "fs";
import path from "path";
import { execSync } from "child_process";

try {
  const seedFile = path.resolve(process.cwd(), "scripts/seed.ts");
  const content = fs.readFileSync(seedFile, "utf-8");

  const forbiddenPatterns = [
    /prisma\.\w+\.delete\(/,
    /prisma\.\w+\.deleteMany\(/,
  ];

  const violations = forbiddenPatterns.filter((pattern) => pattern.test(content));

  if (violations.length > 0) {
    console.error("Seed aborted: seed.ts contains prisma.delete or prisma.deleteMany calls.");
    console.error("Remove all delete operations before seeding to avoid deleting production data.");
    console.error("Do not modify this file to bypass this check in development environment as production and deployment database can be shared.");
    process.exit(1);
  }

} catch (err: any) {
}

const seedEnv = { ...process.env };
if (seedEnv.E2E_MODE === 'true' || seedEnv.DATABASE_URL?.startsWith('file:')) {
  seedEnv.LOCAL_DEV = 'true';
  seedEnv.APP_ENV = 'local';
  seedEnv.ANS_LOCAL_SQLITE_SEED = '1';
  seedEnv.USE_PRODUCTION_DB = 'false';
  seedEnv.DEMO_MODE = 'false';
  if (!seedEnv.DATABASE_URL?.startsWith('file:')) {
    seedEnv.DATABASE_URL = seedEnv.DATABASE_URL_SQLITE || 'file:./prisma/dev.db';
  }
  // E2E / local file DB : accepter les secrets déjà fournis sous d’autres noms
  if (!seedEnv.SEED_ADMIN_PASSWORD || seedEnv.SEED_ADMIN_PASSWORD.length < 12) {
    seedEnv.SEED_ADMIN_PASSWORD =
      seedEnv.E2E_ADMIN_PASSWORD
      || seedEnv.DEMO_ADMIN_PASSWORD
      || seedEnv.E2E_PASSWORD
      || seedEnv.SEED_ADMIN_PASSWORD
      || '';
  }
  if (!seedEnv.SEED_DEMO_PASSWORD || seedEnv.SEED_DEMO_PASSWORD.length < 12) {
    seedEnv.SEED_DEMO_PASSWORD =
      seedEnv.DEMO_PASSWORD
      || seedEnv.E2E_DEMO_PASSWORD
      || seedEnv.E2E_PASSWORD
      || seedEnv.SEED_ADMIN_PASSWORD
      || '';
  }
} else if (seedEnv.DATABASE_URL?.startsWith('postgres') || seedEnv.USE_PRODUCTION_DB === 'true') {
  seedEnv.USE_PRODUCTION_DB = 'true';
  seedEnv.DEMO_MODE = 'false';
}

execSync("tsx --require dotenv/config scripts/seed.ts", {
  stdio: "inherit",
  env: seedEnv,
});