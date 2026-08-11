import { describe, it, expect } from 'vitest';
import { createBatClientAccessToken, verifyBatClientAccessToken } from '@/lib/bat/client-access-token';

describe('bat client access token', () => {
  it('round-trips proof id', () => {
    const token = createBatClientAccessToken('proof-abc');
    const verified = verifyBatClientAccessToken(token);
    expect(verified?.proofId).toBe('proof-abc');
  });

  it('rejects tampered token', () => {
    const token = createBatClientAccessToken('proof-abc');
    const tampered = `${token}x`;
    expect(verifyBatClientAccessToken(tampered)).toBeNull();
  });
});
