import { parseDevisNotes } from '@/lib/devis-meta';

export type GeographyRow = { name: string; value: number; count?: number };

export function buildClientsByVille(
  clients: { ville?: string | null }[],
): GeographyRow[] {
  const map = new Map<string, number>();
  for (const c of clients) {
    const ville = (c.ville?.trim() || 'Non renseigné').slice(0, 40);
    map.set(ville, (map.get(ville) ?? 0) + 1);
  }
  return [...map.entries()]
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 12);
}

export function buildCaByVille(
  commandes: { total: number; client?: { ville?: string | null } | null }[],
): GeographyRow[] {
  const map = new Map<string, { value: number; count: number }>();
  for (const cmd of commandes) {
    const ville = (cmd.client?.ville?.trim() || 'Non renseigné').slice(0, 40);
    const prev = map.get(ville) ?? { value: 0, count: 0 };
    map.set(ville, { value: prev.value + (cmd.total ?? 0), count: prev.count + 1 });
  }
  return [...map.entries()]
    .map(([name, { value, count }]) => ({ name, value, count }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 12);
}

/** CA par canal de vente client (fallback métadonnées devis). */
export function buildCaByCanal(
  commandes: {
    total: number;
    client?: { canalVente?: string | null; canalDecouverte?: string | null } | null;
    devis?: { notes?: string | null } | null;
  }[],
): GeographyRow[] {
  const map = new Map<string, { value: number; count: number }>();
  for (const cmd of commandes) {
    const { meta } = parseDevisNotes(cmd.devis?.notes);
    const canal = (
      cmd.client?.canalVente?.trim()
      || meta?.canalPaiement?.trim()
      || 'Non renseigné'
    ).slice(0, 40);
    const prev = map.get(canal) ?? { value: 0, count: 0 };
    map.set(canal, { value: prev.value + (cmd.total ?? 0), count: prev.count + 1 });
  }
  return [...map.entries()]
    .map(([name, { value, count }]) => ({ name, value, count }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 10);
}

export function buildCaByCanalDecouverte(
  commandes: {
    total: number;
    client?: { canalDecouverte?: string | null } | null;
  }[],
): GeographyRow[] {
  const map = new Map<string, { value: number; count: number }>();
  for (const cmd of commandes) {
    const canal = (cmd.client?.canalDecouverte?.trim() || 'Non renseigné').slice(0, 40);
    const prev = map.get(canal) ?? { value: 0, count: 0 };
    map.set(canal, { value: prev.value + (cmd.total ?? 0), count: prev.count + 1 });
  }
  return [...map.entries()]
    .map(([name, { value, count }]) => ({ name, value, count }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 10);
}
