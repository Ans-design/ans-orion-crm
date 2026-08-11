'use client';

import { motion } from 'framer-motion';
import { Edit3, Copy, Trash2, Minus, Plus } from 'lucide-react';
import { CAT_LABELS, formatPrice } from '@/lib/data/catalogue';
import { getCartItemDisplayFields, getCatalogueItemForCart } from '@/lib/cart-config-display';
import type { CartItem } from '@/lib/cart-store';
import { Button } from '@/components/ui/button';

interface CartItemCardProps {
  item: CartItem;
  index: number;
  onQtyChange: (id: string, qty: number) => void;
  onEdit: (item: CartItem) => void;
  onDuplicate: (id: string) => void;
  onRemove: (id: string) => void;
  busy?: boolean;
}

function SpecCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-[var(--bg-chip)] border border-[var(--border-soft)] px-2.5 py-1.5 min-w-0">
      <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground truncate">{label}</p>
      <p className="text-xs font-medium truncate mt-0.5" title={value}>{value}</p>
    </div>
  );
}

export function CartItemCard({
  item,
  index,
  onQtyChange,
  onEdit,
  onDuplicate,
  onRemove,
  busy,
}: CartItemCardProps) {
  const display = getCartItemDisplayFields(item.config, item.articleId);

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ delay: index * 0.04 }}
      className="orion-surface-card-soft overflow-hidden"
    >
      <div className="p-4 sm:p-5 min-w-0">
        <div className="flex flex-wrap items-start justify-between gap-2 mb-3">
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold text-base truncate">{item.name}</h3>
            <span className="orion-badge-chip inline-flex mt-1 text-[10px] font-bold px-2 py-0.5 bg-[var(--bg-chip-active)] text-primary">
              {CAT_LABELS[item.category] ?? item.category}
            </span>
          </div>
          <div className="text-right shrink-0">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Total ligne</p>
            <p className="font-mono font-bold text-lg text-[var(--ans-gold-500)]">{formatPrice(item.totalLigne)} Ar</p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 mb-4">
          <SpecCell label="Produit" value={item.name} />
          <SpecCell label="Format" value={display.format} />
          <SpecCell label="Matière" value={display.matiere} />
          <SpecCell label="Grammage" value={display.grammage} />
          <SpecCell label="Impression" value={display.impression} />
          <SpecCell label="Finition" value={display.finition} />
          <SpecCell label="Quantité" value={String(item.quantity)} />
          <SpecCell label="Prix unitaire" value={`${formatPrice(item.prixUnitaire)} Ar`} />
          <SpecCell label="Délai" value={display.delai} />
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-[var(--border-soft)]">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-1 rounded-lg border border-[var(--border-soft)] bg-[var(--bg-card-soft)] p-0.5">
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                tabIndex={-1}
                data-orion-stepper="1"
                disabled={busy || item.quantity <= 1}
                onClick={() => onQtyChange(item.id, item.quantity - 1)}
                aria-label="Diminuer quantité"
              >
                <Minus size={14} />
              </Button>
              <input
                type="number"
                min={1}
                value={item.quantity}
                disabled={busy}
                onChange={(e) => onQtyChange(item.id, parseInt(e.target.value, 10) || 1)}
                className="w-12 text-center bg-transparent font-mono text-sm outline-none"
                aria-label="Quantité"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                tabIndex={-1}
                data-orion-stepper="1"
                disabled={busy}
                onClick={() => onQtyChange(item.id, item.quantity + 1)}
                aria-label="Augmenter quantité"
              >
                <Plus size={14} />
              </Button>
            </div>
            <div className="text-xs text-muted-foreground">
              <span className="font-mono font-semibold text-foreground">{formatPrice(item.prixUnitaire)}</span>
              {' '}Ar / u
            </div>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={busy}
              onClick={() => onEdit(item)}
              className="gap-1.5"
            >
              <Edit3 size={14} /> Modifier
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={busy}
              onClick={() => onDuplicate(item.id)}
              className="gap-1.5"
            >
              <Copy size={14} /> Dupliquer
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={busy}
              onClick={() => onRemove(item.id)}
              className="gap-1.5 text-destructive hover:text-destructive hover:bg-destructive/10"
            >
              <Trash2 size={14} /> Supprimer
            </Button>
          </div>
        </div>
      </div>
    </motion.article>
  );
}
