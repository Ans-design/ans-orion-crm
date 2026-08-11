import type { CartItem } from '@/lib/cart-store';
import { posProductHref } from '@/lib/pos/catalog-nav';

function isConceptionCartItem(item: CartItem): boolean {
  return item.category === 'conception' || item.articleId === 'cg-hub' || item.articleId.startsWith('cg-');
}

/** URL d'édition d'une ligne panier — préserve la configuration. */
export function cartItemEditHref(item: CartItem): string {
  if (isConceptionCartItem(item)) {
    const cfg = item.config ?? {};
    const rawKey = String(cfg.serviceKey ?? item.articleId.replace(/^cg-/, ''));
    const serviceKey = rawKey === 'hub' ? '' : rawKey;
    const p = new URLSearchParams();
    if (serviceKey) p.set('service', serviceKey);
    if (cfg.level) p.set('level', String(cfg.level));
    if (cfg.proposals != null) p.set('proposals', String(cfg.proposals));
    if (cfg.revisions != null) p.set('revisions', String(cfg.revisions));
    if (cfg.delay) p.set('delay', String(cfg.delay));
    if (Array.isArray(cfg.extras) && cfg.extras.length) p.set('extras', cfg.extras.join(','));
    if (cfg.remarques) p.set('remarques', String(cfg.remarques));
    if (cfg.fieldValues && typeof cfg.fieldValues === 'object') {
      try {
        p.set('fields', JSON.stringify(cfg.fieldValues));
      } catch {
        /* ignore */
      }
    }
    p.set('editCart', item.id);
    return `/pos/conception?${p.toString()}`;
  }

  const base = posProductHref(item.articleId, item.category);
  const sep = base.includes('?') ? '&' : '?';
  return `${base}${sep}editCart=${encodeURIComponent(item.id)}`;
}
