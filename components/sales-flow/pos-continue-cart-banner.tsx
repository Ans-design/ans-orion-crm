'use client';

import Link from 'next/link';
import { ArrowRight, ShoppingCart } from 'lucide-react';
import { useEffect, useState } from 'react';
import { getCart, getCartLineCount } from '@/lib/cart-store';

/** Bandeau sticky après ajout panier — reste sur POS pour multi-articles. */
export function PosContinueCartBanner() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const sync = () => setCount(getCartLineCount(getCart()));
    sync();
    window.addEventListener('cartUpdated', sync);
    return () => window.removeEventListener('cartUpdated', sync);
  }, []);

  if (count <= 0) return null;

  return (
    <div className="pos-continue-cart-banner" role="status">
      <div className="pos-continue-cart-banner__inner">
        <span className="pos-continue-cart-banner__copy">
          <ShoppingCart size={16} strokeWidth={1.75} aria-hidden />
          {count} article{count > 1 ? 's' : ''} dans le panier — ajoutez d&apos;autres articles ou continuez
        </span>
        <Link href="/panier" className="pos-continue-cart-banner__cta">
          Continuer vers le panier
          <ArrowRight size={14} strokeWidth={2} aria-hidden />
        </Link>
      </div>
    </div>
  );
}
