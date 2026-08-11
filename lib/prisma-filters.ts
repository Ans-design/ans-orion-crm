import { isPostgresDatabase } from '@/lib/database-url';
import { normalizeSearchTerm } from '@/lib/server/search/text-search';

/** Filtre texte compatible SQLite (local) et PostgreSQL (Neon prod). */
export function containsQ(value: string) {
  const term = normalizeSearchTerm(value) ?? value.trim();
  if (isPostgresDatabase()) {
    return { contains: term, mode: 'insensitive' as const };
  }
  return { contains: term };
}
