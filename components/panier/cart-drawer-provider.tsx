'use client';

import { createContext, useCallback, useContext } from 'react';
import { useRouter } from 'next/navigation';
import { ShoppingCart } from 'lucide-react';

type Ctx = { openCartDrawer: () => void; closeCartDrawer: () => void; toggleCartDrawer: () => void };

const CartDrawerContext = createContext<Ctx | null>(null);

export function useCartDrawer() {
  const ctx = useContext(CartDrawerContext);
  if (!ctx) throw new Error('useCartDrawer requires CartDrawerProvider');
  return ctx;
}

/** Badge = nombre de lignes panier (types d'articles), pas la somme des quantités */
export function CartDrawerTrigger({
  count,
  mounted,
}: {
  count: number;
  mounted: boolean;
}) {
  const { openCartDrawer } = useCartDrawer();

  return (
    <button
      type="button"
      onClick={openCartDrawer}
      className="orion-header-icon-btn relative"
      aria-label="Panier / Devis"
    >
      <ShoppingCart size={17} strokeWidth={2} />
      {mounted && count > 0 && (
        <span className="orion-header-cart-badge">
          {count > 99 ? '99+' : count}
        </span>
      )}
    </button>
  );
}

/** Provider léger — clic panier → navigation directe vers Panier / Devis (sans mini-drawer) */
export function CartDrawerProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  const goToPanier = useCallback(() => {
    router.push('/panier');
  }, [router]);

  return (
    <CartDrawerContext.Provider
      value={{
        openCartDrawer: goToPanier,
        closeCartDrawer: () => {},
        toggleCartDrawer: goToPanier,
      }}
    >
      {children}
    </CartDrawerContext.Provider>
  );
}
