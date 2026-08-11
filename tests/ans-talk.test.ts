import { describe, expect, it } from 'vitest';
import {
  TALK_ALLOWED_EXTENSIONS,
  TALK_BLOCKED_EXTENSIONS,
  TALK_ORDER_MEMBER_ROLES,
  detectMimeType,
  maxTalkUploadBytes,
  roleToServiceKeys,
} from '@/lib/messaging/constants';
import { sha256Buffer } from '@/lib/messaging/file-store';

describe('messaging constants', () => {
  it('autorise PDF et formats studio', () => {
    expect(TALK_ALLOWED_EXTENSIONS.has('pdf')).toBe(true);
    expect(TALK_ALLOWED_EXTENSIONS.has('ai')).toBe(true);
    expect(TALK_BLOCKED_EXTENSIONS.has('exe')).toBe(true);
  });

  it('détecte mime PDF', () => {
    expect(detectMimeType('pdf')).toBe('application/pdf');
  });

  it('limite upload configurable', () => {
    expect(maxTalkUploadBytes()).toBeGreaterThan(1024 * 1024);
  });

  it('mappe livraison vers services logistique', () => {
    expect(roleToServiceKeys('livraison')).toContain('livraison');
  });

  it('définit rôles groupe commande', () => {
    expect(TALK_ORDER_MEMBER_ROLES).toContain('livraison');
    expect(TALK_ORDER_MEMBER_ROLES).not.toContain('logistique');
  });
});

describe('sha256Buffer', () => {
  it('calcule un hash réel', () => {
    const h = sha256Buffer(Buffer.from('test-ans-talk'));
    expect(h).toHaveLength(64);
    expect(h).toMatch(/^[a-f0-9]+$/);
  });
});
