import { describe, expect, it, vi } from 'vitest';
import { sanitizeTalkError, canUseTalkDemoFallback } from '@/lib/ans-talk/error-utils';
import { DEMO_CONVERSATIONS, getDemoMessages } from '@/lib/ans-talk/demo-data';

describe('ans-talk error-utils', () => {
  it('masque les erreurs Prisma', () => {
    const err = sanitizeTalkError('Invalid `prisma.talkConversation.findMany()` invocation: column devisId does not exist');
    expect(err.title).toBe('Impossible de charger les conversations');
    expect(err.description).toContain('base de données');
    expect(err.technical).toContain('devisId');
  });

  it('autorise le fallback démo en dev', () => {
    vi.stubEnv('NODE_ENV', 'development');
    expect(canUseTalkDemoFallback()).toBe(true);
    vi.unstubAllEnvs();
  });
});

describe('ans-talk demo-data', () => {
  it('fournit des conversations démo', () => {
    expect(DEMO_CONVERSATIONS.length).toBeGreaterThanOrEqual(5);
    expect(DEMO_CONVERSATIONS.some((c) => c.name.includes('CMD-001'))).toBe(true);
  });

  it('fournit des messages par conversation', () => {
    const msgs = getDemoMessages('demo-cmd-001');
    expect(msgs.length).toBeGreaterThan(0);
  });
});
