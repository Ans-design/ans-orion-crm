import { describe, expect, it } from 'vitest';
import { HTML_PAGE_ROUTE_MAP, resolveHtmlPageRoute } from '@/lib/html-source-route-map';

describe('html-source-route-map', () => {
  it('mappe cockpit vers dashboard', () => {
    expect(resolveHtmlPageRoute('cockpit')).toBe('/dashboard');
  });

  it('contient les routes POS et panier', () => {
    expect(HTML_PAGE_ROUTE_MAP.pos).toBe('/pos');
    expect(HTML_PAGE_ROUTE_MAP.panier).toBe('/panier');
  });
});
