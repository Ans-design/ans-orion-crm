export type ClientPhone = { label: string; number: string };
export type ClientAddress = { label: string; axe: string; repere: string; axeDetail?: string };
export type ClientFileRef = { name: string; size: number; type: string; id?: string };

export type ClientCharteData = {
  societe?: string;
  recommandations?: string;
  charteCouleurs?: string;
  livraisonPrefs?: string;
  conditionsCommerciales?: string;
  phones?: ClientPhone[];
  addresses?: ClientAddress[];
  files?: ClientFileRef[];
};

export function parseClientCharte(charte: string | null | undefined): ClientCharteData {
  if (!charte?.trim()) return {};
  try {
    const parsed = JSON.parse(charte) as ClientCharteData;
    return parsed && typeof parsed === 'object' ? parsed : { charteCouleurs: charte };
  } catch {
    return { charteCouleurs: charte };
  }
}

export function serializeClientCharte(data: ClientCharteData): string | null {
  const cleaned = Object.fromEntries(
    Object.entries(data).filter(([, v]) => {
      if (v == null || v === '') return false;
      if (Array.isArray(v) && v.length === 0) return false;
      return true;
    }),
  );
  return Object.keys(cleaned).length > 0 ? JSON.stringify(cleaned) : null;
}

export const LIVRAISON_AXES = [
  'Centre-ville',
  'Andravoahangy',
  'Analakely',
  'Ivato',
  'Ambohimanarina',
  'Antanimena',
  'Province',
  'Autre',
] as const;
