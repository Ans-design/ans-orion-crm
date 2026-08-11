import {
  extractIsoFormatCode,
  normalizeFormatOption,
} from '@/lib/pos/normalize-format-options';
import { getCommercialFormatSubtitle } from '@/lib/pos/format-commercial-aliases';

/** Libellé utilisateur — ISO + dims mm + alias commercial (≈ cm — tarif). */
export function displayFormatChipLabel(
  raw: string,
  opts?: { keepCm?: boolean; withCommercialAlias?: boolean },
): string {
  const s = raw.trim();
  if (!s) return s;
  return normalizeFormatOption(s, {
    keepCm: opts?.keepCm,
    withCommercialAlias: opts?.withCommercialAlias,
  });
}

/** Sous-texte optionnel sous le chip (UI compacte). */
export function displayFormatChipSubtitle(raw: string): string | null {
  return getCommercialFormatSubtitle(raw);
}

/** Clé technique pour règles métier / tarifs (A3+ ≡ SRA3). */
export function canonicalFormatKey(raw: string): string {
  const iso = extractIsoFormatCode(raw);
  return iso ?? raw.trim();
}
