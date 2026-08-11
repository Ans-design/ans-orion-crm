/**
 * Normalisation & dédoublonnage des options Format POS / Admin.
 * Une seule option canonique par format standard + alias commercial arrondi.
 */
import { normalizeDimensionLabel } from '@/lib/dimensions/petit-format-units';
import { sortFormatChipOptions } from '@/lib/pos/format-chip-sort';
import {
  CANONICAL_ISO_FORMAT_LABELS,
  getCommercialFormatLabel,
  matchCommercialAliasByDims,
  normalizeFormatAlias,
  stripCommercialAliasSuffix,
} from '@/lib/pos/format-commercial-aliases';

export { CANONICAL_ISO_FORMAT_LABELS } from '@/lib/pos/format-commercial-aliases';
export {
  normalizeFormatAlias,
  getCanonicalFormat,
  getCommercialFormatLabel,
  getPriceEquivalentFormat,
  FORMAT_COMMERCIAL_ALIASES,
} from '@/lib/pos/format-commercial-aliases';

const ISO_CODE_RE =
  /\b(A10|A9|A8|A7|A6|A5|A4|A3|A2|A1|A0|DL|B6|B5)\b/i;

export type NormalizeFormatOpts = {
  /**
   * Grand format : conserve les tailles libres en cm/m (hors alias commerciaux ISO).
   * Les codes ISO standards sont toujours canonisés en mm.
   */
  keepCm?: boolean;
  /** Si false, retourne le libellé court sans (≈ … cm). Défaut true. */
  withCommercialAlias?: boolean;
};

function isCustomFormatLabel(label: string): boolean {
  return /personnalis|autres|sur devis/i.test(label);
}

/** Extrait le code ISO (A3+ ≡ SRA3) ou null. */
export function extractIsoFormatCode(format: string): string | null {
  const s = stripCommercialAliasSuffix(String(format ?? '').trim());
  if (!s || isCustomFormatLabel(s)) return null;
  if (/A3\+/i.test(s) || /^SRA3\b/i.test(s) || s.toUpperCase() === 'SRA3') return 'A3+';
  if (/A4\+/i.test(s)) return 'A4+';
  const m = s.match(ISO_CODE_RE);
  if (!m) return null;
  return m[1]!.toUpperCase();
}

/** Dimensions en mm triées (identité physique, orientation ignorée). */
export function extractSortedDimsMm(format: string): [number, number] | null {
  const s = stripCommercialAliasSuffix(String(format ?? '').trim());
  if (!s || isCustomFormatLabel(s)) return null;

  const iso = extractIsoFormatCode(s);
  if (iso && CANONICAL_ISO_FORMAT_LABELS[iso]) {
    const dims = CANONICAL_ISO_FORMAT_LABELS[iso]!.match(/(\d+)\s*[×x]\s*(\d+)/);
    if (dims) {
      const a = Number(dims[1]);
      const b = Number(dims[2]);
      return a <= b ? [a, b] : [b, a];
    }
  }

  const dim = s.match(/(\d+[,.]?\d*)\s*[×x]\s*(\d+[,.]?\d*)\s*(cm|mm|m)?/i);
  if (!dim) return null;
  let w = parseFloat(dim[1]!.replace(',', '.'));
  let h = parseFloat(dim[2]!.replace(',', '.'));
  const unit = (dim[3] || '').toLowerCase();
  if (unit === 'cm' || (!unit && w < 80 && h < 80)) {
    w *= 10;
    h *= 10;
  } else if (unit === 'm') {
    w *= 1000;
    h *= 1000;
  }
  if (!(w > 0 && h > 0)) return null;
  const rw = Math.round(w);
  const rh = Math.round(h);
  return rw <= rh ? [rw, rh] : [rh, rw];
}

/**
 * Clé d’identité : A5 / A5 — 148×210 mm / 15×20 cm / 150×200 mm → iso:A5
 */
export function formatIdentityKey(format: string): string {
  const s = stripCommercialAliasSuffix(String(format ?? '').trim());
  if (!s) return '';
  if (isCustomFormatLabel(s)) return 'custom:personnalise';

  const resolved = normalizeFormatAlias(s);
  if (resolved?.canonicalFormat) return `iso:${resolved.canonicalFormat}`;

  const iso = extractIsoFormatCode(s);
  if (iso) return `iso:${iso}`;

  const dims = extractSortedDimsMm(s);
  if (dims) {
    const commercial = matchCommercialAliasByDims(dims[0], dims[1]);
    if (commercial) return `iso:${commercial}`;

    for (const [code, label] of Object.entries(CANONICAL_ISO_FORMAT_LABELS)) {
      const m = label.match(/(\d+)\s*[×x]\s*(\d+)/);
      if (!m) continue;
      const a = Number(m[1]);
      const b = Number(m[2]);
      const sorted = a <= b ? [a, b] : [b, a];
      if (sorted[0] === dims[0] && sorted[1] === dims[1]) {
        return `iso:${code}`;
      }
    }
    return `mm:${dims[0]}x${dims[1]}`;
  }

  return `label:${s.toLowerCase().replace(/\s+/g, ' ')}`;
}

function looksLikeFreeformCm(label: string): boolean {
  if (extractIsoFormatCode(label)) return false;
  if (normalizeFormatAlias(label)?.canonicalFormat) return false;
  return /\d+\s*[×x]\s*\d+\s*cm\b/i.test(label) || /\d+\s*[×x]\s*\d+\s*m\b/i.test(label);
}

/**
 * Prefère le libellé le plus riche (ISO + mm + alias commercial).
 */
export function preferCanonicalFormatLabel(a: string, b: string): string {
  const score = (s: string) => {
    let n = 0;
    if (/\(≈/.test(s)) n += 12;
    if (/—/.test(s) || /–/.test(s)) n += 4;
    if (/\d+\s*[×x]\s*\d+\s*mm/i.test(s)) n += 8;
    if (extractIsoFormatCode(s)) n += 2;
    if (/\d+\s*[×x]\s*\d+\s*cm/i.test(s) && !/\(≈/.test(s)) n += 1;
    n += Math.min(s.length, 80) / 80;
    return n;
  };
  return score(b) > score(a) ? b : a;
}

function toDisplayLabel(shortOrAny: string, withCommercialAlias: boolean): string {
  if (!withCommercialAlias) {
    const resolved = normalizeFormatAlias(shortOrAny);
    return resolved?.shortLabel ?? stripCommercialAliasSuffix(shortOrAny);
  }
  const resolved = normalizeFormatAlias(shortOrAny);
  if (resolved && resolved.commercialAlias) return resolved.displayLabel;
  if (resolved) return resolved.shortLabel;
  return shortOrAny;
}

/**
 * Reconnaît comme identiques : A5 / 15×20 cm / 148×210 mm / A5 — …
 * Retourne le libellé canonique (+ alias commercial par défaut).
 */
export function normalizeFormatOption(
  format: string,
  opts?: NormalizeFormatOpts,
): string {
  const raw = String(format ?? '').trim();
  if (!raw) return raw;
  const withCommercialAlias = opts?.withCommercialAlias !== false;

  if (isCustomFormatLabel(raw)) {
    if (/^autres$/i.test(raw)) return 'Autres';
    if (/personnalis/i.test(raw) && !/format/i.test(raw) && raw.length < 20) {
      return 'Format personnalisé';
    }
    return raw;
  }

  // Alias commercial / ISO d’abord (y compris 20×30 cm → A4)
  const alias = normalizeFormatAlias(raw);
  if (alias) {
    return toDisplayLabel(alias.shortLabel, withCommercialAlias);
  }

  // SRA3 → A3+
  let s = stripCommercialAliasSuffix(raw).replace(/\bSRA3\b/gi, 'A3+');
  if (s.toUpperCase() === 'SRA3') s = 'A3+';

  const iso = extractIsoFormatCode(s);
  if (iso && CANONICAL_ISO_FORMAT_LABELS[iso]) {
    return toDisplayLabel(CANONICAL_ISO_FORMAT_LABELS[iso]!, withCommercialAlias);
  }

  const dims = extractSortedDimsMm(s);
  if (dims) {
    const commercial = matchCommercialAliasByDims(dims[0], dims[1]);
    if (commercial && CANONICAL_ISO_FORMAT_LABELS[commercial]) {
      return toDisplayLabel(CANONICAL_ISO_FORMAT_LABELS[commercial]!, withCommercialAlias);
    }
    for (const [code, label] of Object.entries(CANONICAL_ISO_FORMAT_LABELS)) {
      const m = label.match(/(\d+)\s*[×x]\s*(\d+)/);
      if (!m) continue;
      const a = Number(m[1]);
      const b = Number(m[2]);
      const sorted = a <= b ? [a, b] : [b, a];
      if (sorted[0] === dims[0] && sorted[1] === dims[1]) {
        return toDisplayLabel(label, withCommercialAlias);
      }
    }
  }

  if (opts?.keepCm && looksLikeFreeformCm(s)) {
    return s.replace(/\s+/g, ' ').replace(/\s*[x×]\s*/gi, '×');
  }

  return normalizeDimensionLabel(s);
}

/**
 * Supprime les doublons / équivalents, trie du plus petit au plus grand.
 */
export function dedupeFormatOptions(
  options: string[],
  opts?: NormalizeFormatOpts,
): string[] {
  if (!options?.length) return options ?? [];
  if (options.length === 1) {
    return [normalizeFormatOption(options[0]!, opts)];
  }

  const byKey = new Map<string, string>();
  for (const raw of options) {
    const label = normalizeFormatOption(raw, opts);
    if (!label) continue;
    const key = formatIdentityKey(label);
    const existing = byKey.get(key);
    if (!existing) {
      byKey.set(key, label);
    } else {
      byKey.set(key, preferCanonicalFormatLabel(existing, label));
    }
  }

  // Tri sur libellé court pour surfaces ISO correctes
  const values = [...byKey.values()];
  const sortedShort = sortFormatChipOptions(
    values.map((v) => stripCommercialAliasSuffix(v)),
  );
  const byShort = new Map(
    values.map((v) => [stripCommercialAliasSuffix(v), v] as const),
  );
  return sortedShort.map((s) => byShort.get(s) ?? getCommercialFormatLabel(s));
}

export type FormatOptionRecord = {
  id?: string;
  label: string;
  valueKey?: string;
  active?: boolean;
  sortOrder?: number;
  priceModifier?: number;
  forcePrice?: boolean;
  metadata?: Record<string, unknown> | null;
};

export type DedupeFormatRecordsResult<T extends FormatOptionRecord> = {
  kept: T[];
  archived: T[];
  merges: Array<{ keep: T; archive: T; identityKey: string }>;
};

/**
 * Fusion intelligente de records Admin (chips) — garde le canonique, archive les doublons.
 */
export function dedupeFormatOptionRecords<T extends FormatOptionRecord>(
  records: T[],
  opts?: NormalizeFormatOpts,
): DedupeFormatRecordsResult<T> {
  const active = records.filter((r) => r.active !== false);
  const alreadyArchived = records.filter((r) => r.active === false);

  type Bucket = { keep: T; extras: T[] };
  const buckets = new Map<string, Bucket>();

  for (const rec of active) {
    const normalizedLabel = normalizeFormatOption(rec.label, opts);
    const key = formatIdentityKey(normalizedLabel);
    const enriched = { ...rec, label: normalizedLabel } as T;
    const bucket = buckets.get(key);
    if (!bucket) {
      buckets.set(key, { keep: enriched, extras: [] });
      continue;
    }
    const preferredLabel = preferCanonicalFormatLabel(bucket.keep.label, enriched.label);
    const keepIsPreferred = preferredLabel === bucket.keep.label;
    const scoreRec = (r: T) =>
      (Math.abs(r.priceModifier ?? 0) > 0 ? 10 : 0)
      + (r.forcePrice ? 5 : 0)
      + (/\d+\s*[×x]\s*\d+\s*mm/i.test(r.label) ? 8 : 0)
      + (/\(≈/.test(r.label) ? 12 : 0)
      + (r.label.includes('—') ? 4 : 0);

    if (!keepIsPreferred || scoreRec(enriched) > scoreRec(bucket.keep)) {
      bucket.extras.push(bucket.keep);
      bucket.keep = { ...enriched, label: preferredLabel } as T;
    } else {
      bucket.extras.push(enriched);
    }
  }

  const kept: T[] = [];
  const archived: T[] = [...alreadyArchived];
  const merges: DedupeFormatRecordsResult<T>['merges'] = [];

  const sortedKeys = sortFormatChipOptions(
    [...buckets.values()].map((b) => stripCommercialAliasSuffix(b.keep.label)),
  );
  const keyOrder = new Map(sortedKeys.map((l, i) => [formatIdentityKey(l), i]));

  const orderedBuckets = [...buckets.entries()].sort(
    (a, b) => (keyOrder.get(a[0]) ?? 999) - (keyOrder.get(b[0]) ?? 999),
  );

  for (const [identityKey, bucket] of orderedBuckets) {
    let keep = bucket.keep;
    for (const extra of bucket.extras) {
      if (Math.abs(extra.priceModifier ?? 0) > Math.abs(keep.priceModifier ?? 0)) {
        keep = { ...keep, priceModifier: extra.priceModifier } as T;
      }
      if (extra.forcePrice) {
        keep = { ...keep, forcePrice: true } as T;
      }
      merges.push({ keep, archive: extra, identityKey });
      archived.push({
        ...extra,
        active: false,
        metadata: {
          ...(extra.metadata ?? {}),
          archivedReason: 'format-duplicate-merge',
          mergedIntoLabel: keep.label,
          mergedIntoId: keep.id ?? null,
          archivedAt: new Date().toISOString(),
        },
      } as T);
    }
    kept.push(keep);
  }

  return { kept, archived, merges };
}

/** Détecte s’il reste des libellés distincts équivalents (doublons). */
export function findFormatDuplicateGroups(options: string[]): string[][] {
  const groups = new Map<string, string[]>();
  for (const raw of options) {
    const key = formatIdentityKey(normalizeFormatOption(raw));
    if (!key || key === 'custom:personnalise') continue;
    const list = groups.get(key) ?? [];
    list.push(raw);
    groups.set(key, list);
  }
  return [...groups.values()].filter(
    (g) => new Set(g.map((x) => stripCommercialAliasSuffix(x).toLowerCase())).size > 1
      || new Set(g.map((x) => x.trim().toLowerCase())).size > 1,
  );
}
