import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getRecentArticleIds, trackRecentArticle } from '@/lib/cart-store';

function mockBrowserStorage() {
  const store = new Map<string, string>();
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => { store.set(key, value); },
    removeItem: (key: string) => { store.delete(key); },
  });
  vi.stubGlobal('window', {
    dispatchEvent: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  });
}

describe('cart-store recent articles', () => {
  beforeEach(() => {
    mockBrowserStorage();
  });

  it('starts empty', () => {
    expect(getRecentArticleIds()).toEqual([]);
  });

  it('tracks articles in anti-chronological order', () => {
    trackRecentArticle('art-a');
    trackRecentArticle('art-b');
    trackRecentArticle('art-a');
    expect(getRecentArticleIds()).toEqual(['art-a', 'art-b']);
  });

  it('caps at 12 entries', () => {
    for (let i = 0; i < 15; i++) trackRecentArticle(`art-${i}`);
    expect(getRecentArticleIds()).toHaveLength(12);
    expect(getRecentArticleIds()[0]).toBe('art-14');
  });
});
