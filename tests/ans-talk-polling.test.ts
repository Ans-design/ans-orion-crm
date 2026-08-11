import { describe, expect, it } from 'vitest';
import { ANS_TALK_POLL_MS, nextTalkPollDelayMs } from '@/lib/ans-talk/polling';

describe('ans-talk polling', () => {
  it('utilise 90s en mode badge seul', () => {
    expect(nextTalkPollDelayMs(ANS_TALK_POLL_MS.unreadOnly, false, false)).toBe(90_000);
  });

  it('utilise 12s en mode actif', () => {
    expect(nextTalkPollDelayMs(ANS_TALK_POLL_MS.active, false, true)).toBe(12_000);
  });

  it('double le délai après erreur jusqu’au plafond', () => {
    expect(nextTalkPollDelayMs(60_000, true, false)).toBe(120_000);
    expect(nextTalkPollDelayMs(200_000, true, true)).toBe(300_000);
    expect(nextTalkPollDelayMs(300_000, true, true)).toBe(300_000);
  });
});
