const BLOCKED_VALUES = new Set([
  'undefined',
  'null',
  'invalide',
  'invalid',
  'non spécifié',
  'non specifie',
  'non choisi',
  'aucun',
  'aucune',
  'n/a',
  'na',
  '-',
  '—',
]);

/** Normalise une valeur affichable (documents, fiches fabrication, panier). */
export function sanitizeDisplayText(raw: unknown): string | null {
  if (raw === null || raw === undefined) return null;
  if (typeof raw === 'number') {
    if (!Number.isFinite(raw)) return null;
    if (raw === 0) return null;
    return String(raw);
  }
  if (typeof raw === 'boolean') return raw ? 'Oui' : 'Non';
  if (typeof raw === 'object') return null;

  let s = String(raw).trim();
  if (!s) return null;

  s = s
    .replace(/recto-veso/gi, 'Recto-verso')
    .replace(/ANS Desing Print/gi, 'ANS Design Print')
    .replace(/\bundefined\b/gi, '')
    .replace(/\binvalide\b/gi, '')
    .trim();

  if (!s) return null;
  if (s === '0') return null;
  if (BLOCKED_VALUES.has(s.toLowerCase())) return null;
  if (/^pages?\s*:\s*0$/i.test(s)) return null;
  if (/^0\s*(page|pages|pièce|pièces|ex\.?)$/i.test(s)) return null;

  return s;
}

/** Nettoie une ligne « Label : valeur » pour documents officiels. */
export function sanitizeDisplayLine(line: string): string | null {
  const trimmed = line.trim();
  if (!trimmed) return null;

  const colonIdx = trimmed.indexOf(':');
  if (colonIdx <= 0) {
    return sanitizeDisplayText(trimmed);
  }

  const label = trimmed.slice(0, colonIdx).trim();
  const value = sanitizeDisplayText(trimmed.slice(colonIdx + 1));
  if (!label || !value) return null;
  return `${label} : ${value}`;
}

export function sanitizeDisplayLines(lines: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const line of lines) {
    const clean = sanitizeDisplayLine(line);
    if (!clean) continue;
    const key = clean.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(clean);
  }
  return out;
}

export function validateCommercialQuantity(qty: number): boolean {
  return Number.isFinite(qty) && qty > 0;
}

export function validateCommercialLine(input: {
  label: string;
  quantity: number;
  totalLigne: number;
}): string[] {
  const errors: string[] = [];
  if (!sanitizeDisplayText(input.label)) errors.push('Libellé article manquant ou invalide');
  if (!validateCommercialQuantity(input.quantity)) errors.push('Quantité doit être supérieure à 0');
  if (!Number.isFinite(input.totalLigne) || input.totalLigne <= 0) {
    errors.push('Montant ligne invalide');
  }
  return errors;
}

/** Taux TVA déduit des totaux HT/TTC (arrondi au dixième). */
export function inferTvaRatePercent(totalHT: number, totalTTC: number): number {
  if (!Number.isFinite(totalHT) || totalHT <= 0) return 0;
  if (!Number.isFinite(totalTTC) || totalTTC <= totalHT) return 0;
  const rate = ((totalTTC / totalHT) - 1) * 100;
  const rounded = Math.round(rate * 10) / 10;
  if (Math.abs(rounded - 20) < 0.6) return 20;
  if (Math.abs(rounded - 8) < 0.6) return 8;
  return rounded;
}
