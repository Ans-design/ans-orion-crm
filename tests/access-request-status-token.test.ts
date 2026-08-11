import { describe, it, expect } from 'vitest';
import {
  createAccessRequestStatusToken,
  verifyAccessRequestStatusToken,
} from '@/lib/auth/access-request-status-token';

describe('access request status token', () => {
  it('round-trips request id', () => {
    const token = createAccessRequestStatusToken('req-abc');
    const verified = verifyAccessRequestStatusToken(token);
    expect(verified?.requestId).toBe('req-abc');
  });
});
