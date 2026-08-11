/** Résumé article pour commande multi-lignes */
export function buildCommandeArticleSummary(labels: string[]): string {
  if (labels.length === 0) return 'Commande';
  if (labels.length === 1) return labels[0];
  return `${labels[0]} (+ ${labels.length - 1} autre${labels.length > 2 ? 's' : ''})`;
}

export type CommandeLigneInput = {
  articleId?: string | null;
  articleLabel: string;
  configSnapshot?: unknown;
  quantity: number;
  totalLigne: number;
  sortOrder?: number;
};

export function sumCommandeLignes(lignes: { quantity: number; totalLigne: number }[]) {
  return {
    total: lignes.reduce((s, l) => s + l.totalLigne, 0),
    qty: lignes.reduce((s, l) => s + l.quantity, 0),
  };
}

export function mapDevisLignesToCommande(lignes: {
  articleId: string;
  articleLabel: string;
  configSnapshot: unknown;
  quantity: number;
  totalLigne: number;
  sortOrder: number;
}[]): CommandeLigneInput[] {
  return lignes.map((l) => ({
    articleId: l.articleId,
    articleLabel: l.articleLabel,
    configSnapshot: l.configSnapshot,
    quantity: l.quantity,
    totalLigne: l.totalLigne,
    sortOrder: l.sortOrder,
  }));
}
