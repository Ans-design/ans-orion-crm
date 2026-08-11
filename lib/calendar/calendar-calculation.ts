import { BOX_ADMIN_DEFAULTS } from '@/lib/packaging/box-admin-defaults';
import { PACKAGING_CHUTE_MM } from '@/lib/packaging/material-recap';
import {
  fmtMm,
  resolveCalendarDimensionsMm,
} from '@/lib/calendar/calendar-formats';
import { isForbiddenMarquepageMaterial } from '@/lib/calendar/calendar-material-policy';

export type CalendarComponentSurface = {
  name: string;
  widthMm: number;
  heightMm: number;
  realSurfaceM2: number;
  grossSurfaceM2: number;
  sheetCount: number;
};

export type CalendarMaterialRecap = {
  kind: 'calendar';
  articleId: string;
  formatLabel: string;
  widthMm: number;
  heightMm: number;
  material: string;
  grammage: string;
  printMode: string;
  qty: number;
  sheetCount: number;
  formatDeveloppe: string;
  formatBrut: string;
  realSurfaceM2: number;
  grossSurfaceM2: number;
  totalRealSurfaceM2: number;
  totalGrossSurfaceM2: number;
  supportSurfaceM2?: number;
  sheetsSurfaceM2?: number;
  wasteMarginMm: number;
  grossWidthMm: number;
  grossHeightMm: number;
  margeRule: string;
  components: CalendarComponentSurface[];
  alert?: string;
  incomplete?: boolean;
};

function parseQty(config: Record<string, unknown>): number {
  const n = Number(config.qty);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 1;
}

function parseSheetCount(config: Record<string, unknown>): number {
  const customRaw = config.feuillets_custom ?? config.nombre_feuillets_custom;
  const customN = typeof customRaw === 'number' ? customRaw : parseInt(String(customRaw ?? ''), 10);
  if (Number.isFinite(customN) && customN > 0) return Math.max(1, Math.floor(customN));

  const raw = String(config.feuillets ?? config.nombre_feuillets ?? config.nb_feuillets ?? '');
  const m = raw.match(/(\d+)/);
  if (m) return Math.max(1, parseInt(m[1], 10));
  if (/12\s*mois|12\s*feuillets/i.test(raw)) return 12;
  if (/13/i.test(raw)) return 13;
  return 1;
}

function withGrossMargin(
  widthMm: number,
  heightMm: number,
  isCustom: boolean,
  margeMm = PACKAGING_CHUTE_MM,
): {
  grossW: number;
  grossH: number;
  realM2: number;
  grossM2: number;
} {
  const realM2 = (widthMm * heightMm) / 1_000_000;
  if (!isCustom) {
    return {
      grossW: widthMm,
      grossH: heightMm,
      realM2,
      grossM2: realM2,
    };
  }
  const extra = BOX_ADMIN_DEFAULTS.surface_brute_extra_mm;
  const grossW = widthMm + extra;
  const grossH = heightMm + extra;
  return {
    grossW,
    grossH,
    realM2,
    grossM2: (grossW * grossH) / 1_000_000,
  };
}

function componentSurface(
  name: string,
  widthMm: number,
  heightMm: number,
  sheetCount: number,
  isCustom: boolean,
): CalendarComponentSurface {
  const { grossW, grossH, realM2, grossM2 } = withGrossMargin(widthMm, heightMm, isCustom);
  return {
    name,
    widthMm,
    heightMm,
    realSurfaceM2: parseFloat((realM2 * sheetCount).toFixed(6)),
    grossSurfaceM2: parseFloat((grossM2 * sheetCount).toFixed(6)),
    sheetCount,
  };
}

export function calculateCalendarMaterialRecap(
  articleId: string,
  config: Record<string, unknown>,
): CalendarMaterialRecap | null {
  const dims = resolveCalendarDimensionsMm(config);
  const formatRaw = String(config.format ?? config.dim ?? '');

  if (!dims) {
    return {
      kind: 'calendar',
      articleId,
      formatLabel: formatRaw || '—',
      widthMm: 0,
      heightMm: 0,
      material: String(config.matiere ?? config.matiere_support ?? '—'),
      grammage: String(config.grammage ?? config.grammage_support ?? '—'),
      printMode: String(config.face ?? config.face_impression ?? 'Recto seul'),
      qty: parseQty(config),
      sheetCount: parseSheetCount(config),
      formatDeveloppe: '—',
      formatBrut: '—',
      realSurfaceM2: 0,
      grossSurfaceM2: 0,
      totalRealSurfaceM2: 0,
      totalGrossSurfaceM2: 0,
      wasteMarginMm: PACKAGING_CHUTE_MM,
      grossWidthMm: 0,
      grossHeightMm: 0,
      margeRule: `Chute +${PACKAGING_CHUTE_MM} mm/côté`,
      components: [],
      alert: 'Complétez le format pour le calcul matière détaillé.',
      incomplete: true,
    };
  }

  const isCustom = /personnalis/i.test(formatRaw);
  const qty = parseQty(config);
  const material = String(config.matiere ?? config.matiere_support ?? '');
  const grammage = String(config.grammage ?? config.grammage_support ?? '');
  const printMode = String(config.face ?? config.face_impression ?? 'Recto seul');

  if (articleId === 'cal-marquepage' && material && isForbiddenMarquepageMaterial(material)) {
    return {
      kind: 'calendar',
      articleId,
      formatLabel: dims.formatLabel,
      widthMm: dims.widthMm,
      heightMm: dims.heightMm,
      material,
      grammage,
      printMode,
      qty,
      sheetCount: 1,
      formatDeveloppe: fmtMm(dims.widthMm, dims.heightMm),
      formatBrut: fmtMm(dims.widthMm, dims.heightMm),
      realSurfaceM2: 0,
      grossSurfaceM2: 0,
      totalRealSurfaceM2: 0,
      totalGrossSurfaceM2: 0,
      wasteMarginMm: PACKAGING_CHUTE_MM,
      grossWidthMm: dims.widthMm,
      grossHeightMm: dims.heightMm,
      margeRule: '',
      components: [],
      alert: 'Matière Offset interdite pour le marque-page calendrier.',
    };
  }

  const components: CalendarComponentSurface[] = [];
  const hasSheetProduct =
    articleId === 'cal-chevalet'
    || articleId === 'cal-sousmain'
    || articleId === 'cal-mural';

  const sheetCount = hasSheetProduct ? parseSheetCount(config) : 1;

  if (articleId === 'cal-chevalet' || articleId === 'cal-sousmain') {
    const support = componentSurface('Support', dims.widthMm, dims.heightMm, 1, isCustom);
    const feuillets = componentSurface('Feuillets', dims.widthMm, dims.heightMm, sheetCount, isCustom);
    components.push(support, feuillets);
  } else if (hasSheetProduct && sheetCount > 1) {
    components.push(
      componentSurface('Support', dims.widthMm, dims.heightMm, 1, isCustom),
      componentSurface('Feuillets', dims.widthMm, dims.heightMm, sheetCount, isCustom),
    );
  } else {
    components.push(componentSurface('Calendrier', dims.widthMm, dims.heightMm, 1, isCustom));
  }

  const realSurfaceM2 = components.reduce((s, c) => s + c.realSurfaceM2, 0);
  const grossSurfaceM2 = components.reduce((s, c) => s + c.grossSurfaceM2, 0);
  const { grossW, grossH } = withGrossMargin(dims.widthMm, dims.heightMm, isCustom);

  const supportSurfaceM2 = components.find((c) => c.name === 'Support')?.grossSurfaceM2;
  const sheetsSurfaceM2 = components.find((c) => c.name === 'Feuillets')?.grossSurfaceM2;

  const margeRule = isCustom
    ? `Format personnalisé — marge matière +${BOX_ADMIN_DEFAULTS.surface_brute_extra_mm} mm — chute +${PACKAGING_CHUTE_MM} mm/côté`
    : `Format standard — surface format × quantité`;

  return {
    kind: 'calendar',
    articleId,
    formatLabel: dims.formatLabel,
    widthMm: dims.widthMm,
    heightMm: dims.heightMm,
    material,
    grammage,
    printMode,
    qty,
    sheetCount,
    formatDeveloppe: fmtMm(dims.widthMm, dims.heightMm),
    formatBrut: fmtMm(grossW, grossH),
    realSurfaceM2: parseFloat(realSurfaceM2.toFixed(6)),
    grossSurfaceM2: parseFloat(grossSurfaceM2.toFixed(6)),
    totalRealSurfaceM2: parseFloat((realSurfaceM2 * qty).toFixed(6)),
    totalGrossSurfaceM2: parseFloat((grossSurfaceM2 * qty).toFixed(6)),
    supportSurfaceM2,
    sheetsSurfaceM2,
    wasteMarginMm: isCustom ? PACKAGING_CHUTE_MM : 0,
    grossWidthMm: grossW,
    grossHeightMm: grossH,
    margeRule,
    components,
  };
}
