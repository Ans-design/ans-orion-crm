import { ensureAuthRuntimeEnv } from '@/lib/auth-runtime-url';
import { loadBundledProductionEnv } from '@/lib/bundled-production-env';
import { resolveDatabaseUrl } from '@/lib/database-url';
import { getNextAuthSecret } from '@/lib/auth-secret';

/** Bootstrap env serveur — importé avant Prisma/NextAuth (ordre garanti). */
if (!process.env.TZ?.trim()) {
  process.env.TZ = 'Indian/Antananarivo';
}
loadBundledProductionEnv();
ensureAuthRuntimeEnv();
resolveDatabaseUrl();
if (!process.env.AUTH_SECRET?.trim()) {
  process.env.AUTH_SECRET = getNextAuthSecret();
}
