export type StockStatus =
  | 'AVAILABLE'
  | 'LOW_STOCK'
  | 'PARTIAL_OUT_OF_STOCK'
  | 'OUT_OF_STOCK'
  | 'ON_DEMAND'
  | 'DISABLED'
  | 'UNKNOWN';

export type StockCheckInput = {
  articleId: string;
  quantity?: number;
  configuration?: Record<string, unknown>;
  userRole?: string;
};

export type StockCheckResult = {
  status: StockStatus;
  canAddToCart: boolean;
  canCreateQuote: boolean;
  canCreateOrder: boolean;
  requiresManagerApproval: boolean;
  message: string;
  estimatedDelayDays?: number;
};

const LOW_STOCK_THRESHOLD = 50;

/** Vérification stock simulée (fallback si pas d'entrée DB) */
export function checkStockAvailabilitySimulated(input: StockCheckInput): StockCheckResult {
  const qty = Math.max(1, input.quantity ?? 1);
  const config = input.configuration ?? {};
  const paper = String(config.paperType || config.papier || '').toLowerCase();
  const weight = String(config.paperWeight || config.grammage || '').replace(/g/i, '');

  if (input.articleId.startsWith('disabled-') || config.disabled === true) {
    return {
      status: 'DISABLED',
      canAddToCart: false,
      canCreateQuote: false,
      canCreateOrder: false,
      requiresManagerApproval: false,
      message: 'Article indisponible ou désactivé.',
    };
  }

  if (config.onDemand === true || paper.includes('sur commande')) {
    return {
      status: 'ON_DEMAND',
      canAddToCart: true,
      canCreateQuote: true,
      canCreateOrder: true,
      requiresManagerApproval: false,
      message: 'Article sur commande — délai estimé 5 à 7 jours.',
      estimatedDelayDays: 6,
    };
  }

  const hash = [...input.articleId, paper, weight].join('|').split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  const simulatedStock = 200 - (hash % 180);

  if (simulatedStock <= 0) {
    const isManager = ['admin', 'manager'].includes(input.userRole ?? '');
    return {
      status: 'OUT_OF_STOCK',
      canAddToCart: false,
      canCreateQuote: isManager,
      canCreateOrder: isManager,
      requiresManagerApproval: !isManager,
      message: 'Rupture de stock — cet article ne peut pas être commandé actuellement.',
    };
  }

  if (qty > simulatedStock) {
    const isManager = ['admin', 'manager'].includes(input.userRole ?? '');
    return {
      status: 'PARTIAL_OUT_OF_STOCK',
      canAddToCart: isManager,
      canCreateQuote: isManager,
      canCreateOrder: isManager,
      requiresManagerApproval: !isManager,
      message: `Quantité demandée (${qty}) supérieure au stock disponible (${simulatedStock}).`,
    };
  }

  if (simulatedStock <= LOW_STOCK_THRESHOLD) {
    return {
      status: 'LOW_STOCK',
      canAddToCart: true,
      canCreateQuote: true,
      canCreateOrder: true,
      requiresManagerApproval: false,
      message: 'Stock faible — vérifiez la disponibilité avant de confirmer.',
    };
  }

  return {
    status: 'AVAILABLE',
    canAddToCart: true,
    canCreateQuote: true,
    canCreateOrder: true,
    requiresManagerApproval: false,
    message: 'Disponible',
  };
}

/** @deprecated use resolveStockAvailability from stock-service */
export function checkStockAvailability(input: StockCheckInput): StockCheckResult {
  return checkStockAvailabilitySimulated(input);
}
