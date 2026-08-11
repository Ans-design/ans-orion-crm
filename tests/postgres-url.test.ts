import { describe, expect, it } from 'vitest';
import { normalizePostgresUrl, databaseUrlScheme, pickPostgresUrl } from '@/lib/postgres-url';

describe('postgres-url', () => {
  it('retire channel_binding', () => {
    const url = 'postgresql://u:p@host/db?channel_binding=require&sslmode=require';
    expect(normalizePostgresUrl(url)).not.toContain('channel_binding');
    expect(normalizePostgresUrl(url)).toContain('sslmode=require');
  });

  it('convertit hostname Neon direct en pooler', () => {
    const url = 'postgresql://u:p@ep-square-rain-atj5hdkx.c-9.us-east-1.aws.neon.tech/neondb';
    const out = normalizePostgresUrl(url);
    expect(out).toContain('-pooler.c-9');
    expect(out).toContain('connection_limit=1');
  });

  it('ajoute pgbouncer et connection_limit sur pooler Neon', () => {
    const url = 'postgresql://u:p@ep-test-pooler.neon.tech/neondb?sslmode=require';
    const out = normalizePostgresUrl(url);
    expect(out).toContain('pgbouncer=true');
    expect(out).toContain('connection_limit=1');
  });

  it('pickPostgresUrl privilégie le pooler par défaut', () => {
    const pooled = 'postgresql://u:p@ep-test-pooler.neon.tech/neondb';
    const direct = 'postgresql://u:p@ep-test.neon.tech/neondb';
    expect(
      pickPostgresUrl({
        POSTGRES_PRISMA_URL: pooled,
        POSTGRES_URL_NON_POOLING: direct,
      }),
    ).toContain('-pooler.');
  });

  it('pickPostgresUrl peut privilégier direct si demandé', () => {
    const pooled = 'postgresql://u:p@ep-test-pooler.neon.tech/neondb';
    const direct = 'postgresql://u:p@ep-test.neon.tech/neondb';
    expect(
      pickPostgresUrl(
        { POSTGRES_PRISMA_URL: pooled, POSTGRES_URL_NON_POOLING: direct },
        true,
      ),
    ).not.toContain('-pooler.');
  });

  it('détecte le schéma URL', () => {
    expect(databaseUrlScheme('postgresql://x')).toBe('postgresql');
    expect(databaseUrlScheme('file:./dev.db')).toBe('file');
    expect(databaseUrlScheme('')).toBe('missing');
  });
});
