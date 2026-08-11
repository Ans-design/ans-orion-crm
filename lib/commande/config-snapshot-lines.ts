import { formatClientDimensionsCm } from '@/lib/dimensions/grand-format-units';
import { formatClientDimensionsMm } from '@/lib/dimensions/petit-format-units';
import { readCalendarSnapshotFromConfig } from '@/lib/calendar/calendar-snapshot';
import { isCalendarArticleId } from '@/lib/calendar/calendar-material-policy';
import { readPackagingSnapshotFromConfig, isPackagingArticleId } from '@/lib/packaging/packaging-snapshot';
import { readCustomSurfaceSnapshotFromConfig } from '@/lib/pos/surface-snapshot';
import { readBindingSnapshotFromConfig } from '@/lib/print/binding-snapshot';
import { isCustomFormatChipValue, resolveDisplayFormatLabel } from '@/lib/pos/generated-format-label';

export type ConfigLineSummary = {
  label: string;
  articleLabel: string;
  quantity: number;
  lines: { key: string; value: string }[];
};

function asRecord(v: unknown): Record<string, unknown> {
  return v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
}

function pick(config: Record<string, unknown>, keys: string[]): string | null {
  for (const k of keys) {
    const val = config[k];
    if (val !== undefined && val !== null && String(val).trim() !== '') return String(val);
  }
  return null;
}

/** Résumé technique lisible depuis configSnapshot d'une ligne commande/devis. */
export function summarizeConfigSnapshot(
  articleLabel: string,
  quantity: number,
  snapshot: unknown,
  articleId?: string | null,
): ConfigLineSummary {
  const config = asRecord(snapshot);
  const lines: { key: string; value: string }[] = [];
  const isGf = articleId?.startsWith('gf-') || pick(config, ['format', 'famille'])?.toLowerCase().includes('grand');
  const calSnap = isCalendarArticleId(articleId ?? '') ? readCalendarSnapshotFromConfig(config) : null;
  const pkgSnap = isPackagingArticleId(articleId ?? '') ? readPackagingSnapshotFromConfig(config) : null;
  const surfSnap = !calSnap && !pkgSnap ? readCustomSurfaceSnapshotFromConfig(config) : null;
  const bindSnap = readBindingSnapshotFromConfig(config);

  if (calSnap) {
    const banner = pick(config, ['product_banner']);
    if (banner) lines.push({ key: 'Remarque produit', value: banner });
    lines.push({ key: 'Format', value: calSnap.formatLabel });
    lines.push({ key: 'Dimensions', value: `${calSnap.widthMm} × ${calSnap.heightMm} mm` });
    if (calSnap.material) lines.push({ key: 'Matière', value: `${calSnap.material} ${calSnap.grammage}`.trim() });
    if (calSnap.numberOfSheets > 1) {
      lines.push({ key: 'Feuillets', value: String(calSnap.numberOfSheets) });
    }
    lines.push({ key: 'Surface brute tot.', value: `${calSnap.totalGrossSurfaceM2} m²` });
    lines.push({ key: 'Impression', value: calSnap.printMode });
    if (calSnap.alert) lines.push({ key: 'Alerte', value: calSnap.alert });
  }

  if (pkgSnap) {
    lines.push({ key: 'Développé', value: pkgSnap.formatDeveloppe });
    lines.push({ key: 'Format brut', value: pkgSnap.formatBrut });
    lines.push({ key: 'Surface brute', value: `${pkgSnap.surfaceBruteM2} m²` });
    if (pkgSnap.margeRule) lines.push({ key: 'Marge matière', value: pkgSnap.margeRule });
  }

  if (surfSnap) {
    lines.push({ key: 'Format', value: surfSnap.formatLabel });
    lines.push({ key: 'Dimensions', value: `${surfSnap.widthMm} × ${surfSnap.heightMm} mm` });
    lines.push({ key: 'Surface réelle', value: `${surfSnap.realSurfaceM2} m²` });
    lines.push({ key: 'Surface brute tot.', value: `${surfSnap.totalGrossSurfaceM2} m²` });
  }

  if (bindSnap?.summaryLine) {
    lines.push({ key: 'Reliure', value: bindSnap.summaryLine });
    if (bindSnap.spineMmCalculated != null) {
      lines.push({ key: 'Épaisseur dos', value: `${bindSnap.spineMmCalculated} mm` });
    }
    if (bindSnap.priceAr != null) {
      lines.push({ key: 'Prix reliure', value: `${bindSnap.priceAr.toLocaleString('fr-FR')} Ar` });
    }
  }

  const formatRaw = pick(config, ['format', 'dimension', 'format_marquage']);
  if (formatRaw && isCustomFormatChipValue(formatRaw)) {
    lines.push({ key: 'Format', value: resolveDisplayFormatLabel(config) });
  } else if (formatRaw && !calSnap) {
    lines.push({ key: 'Format', value: formatRaw });
  }

  const longueur = pick(config, ['longueur_cm', 'longueur', 'longueurCm', 'largeur_mm']);
  const largeur = pick(config, ['largeur_cm', 'largeur', 'largeurCm', 'hauteur_mm']);
  if (longueur && largeur && !calSnap && !pkgSnap && !surfSnap) {
    const dim = isGf
      ? formatClientDimensionsCm(Number(longueur), Number(largeur))
      : formatClientDimensionsMm(Number(longueur), Number(largeur));
    lines.push({ key: 'Dimensions', value: dim });
  }

  const surface = pick(config, ['surface_m2', 'surfaceM2', 'surface_facturable_m2', 'surfaceFacturableM2']);
  if (surface) lines.push({ key: 'Surface', value: `${surface} m²` });

  const matiere = pick(config, ['matiere', 'material', 'matiere_label']);
  if (matiere) lines.push({ key: 'Matière', value: matiere });

  const grammage = pick(config, ['grammage', 'grammage_label']);
  if (grammage) lines.push({ key: 'Grammage', value: grammage });

  const finition = pick(config, ['finition', 'finition_label']);
  if (finition) lines.push({ key: 'Finition', value: finition });

  const impression = pick(config, ['impression', 'recto_verso', 'faces']);
  if (impression) lines.push({ key: 'Impression', value: impression });

  const laize = pick(config, ['laize_cm', 'laize']);
  if (laize) lines.push({ key: 'Laize', value: `${laize} cm` });

  const eyelets = pick(config, ['oeillets_mode', 'eyeletsMode', 'oeillets_count']);
  if (eyelets) lines.push({ key: 'Œillets', value: eyelets });

  return {
    label: articleLabel,
    articleLabel,
    quantity,
    lines,
  };
}
