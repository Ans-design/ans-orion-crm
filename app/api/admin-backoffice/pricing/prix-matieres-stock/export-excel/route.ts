export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import { requireAnyPermission } from '@/lib/auth-utils';
import { safeErrorMessage } from '@/lib/api-response';
import { prisma } from '@/lib/prisma';
import { detectPricingDrift } from '@/lib/services/pricing-data-sync.service';
import { listMaterialContextPrices } from '@/lib/pricing/material-context-price';
import { MATERIAL_EXCEL_COLUMNS } from '@/lib/backoffice/material-excel-format';
import {
  GRAND_FORMAT_EXCEL_COLUMNS,
  FINISHING_EXCEL_COLUMNS,
} from '@/lib/backoffice/pricing-tables-excel-format';
import { buildPrixMatieresStockTemplateBuffer } from '@/lib/backoffice/prix-matieres-stock-excel-templates';
import { canViewMargin } from '@/lib/auth/margin-access';

function sheetFromRows(name: string, columns: readonly string[], rows: Record<string, unknown>[]) {
  const ordered = rows.map((row) => {
    const out: Record<string, unknown> = {};
    for (const col of columns) out[col] = row[col] ?? '';
    return out;
  });
  return XLSX.utils.json_to_sheet(ordered.length ? ordered : [{}], {
    header: [...columns],
  });
}

/** Export multi-feuilles — ou ?template=1 pour modèle exemple. */
export async function GET(req: NextRequest) {
  const auth = await requireAnyPermission('config:view', 'tarifs:read');
  if ('error' in auth) return auth.error;

  try {
    const template = new URL(req.url).searchParams.get('template') === '1'
      || new URL(req.url).searchParams.get('modele') === '1';
    if (template) {
      const buf = buildPrixMatieresStockTemplateBuffer();
      return new NextResponse(buf, {
        status: 200,
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': `attachment; filename="modele-prix-matieres-stock-${new Date().toISOString().slice(0, 10)}.xlsx"`,
        },
      });
    }

    const [materials, ctxPrices, bpp, gf, avd, finishing, drifts] = await Promise.all([
      prisma.baseMaterial.findMany({ where: { archived: false }, take: 5000, orderBy: { label: 'asc' } }),
      listMaterialContextPrices(),
      prisma.basePrintingPrice.findMany({ where: { active: true }, take: 5000 }),
      prisma.grandFormatPricing.findMany({ where: { active: true }, take: 2000 }),
      prisma.directSaleArticle.findMany({ where: { status: 'published' }, take: 2000 }),
      prisma.finishingPrice.findMany({ where: { active: true }, take: 2000 }).catch(() => []),
      detectPricingDrift(),
    ]);

    const wb = XLSX.utils.book_new();
    const showPurchase = canViewMargin(auth.role ?? 'user');

    const matRows = materials.map((m) => {
      const row: Record<string, unknown> = {
        ID: m.excelRowId ?? m.id,
        MATIÈRE: m.label,
        FAMILLE: m.family,
        GRAMMAGE: m.grammage ?? '',
        ÉPAISSEUR: m.thickness ?? '',
        UNITÉ: m.saleUnit,
        'PRIX BASE': m.basePrintPrice ?? '',
        'VISIBLE POS': m.visiblePos ? 'oui' : 'non',
        STATUT: m.publicationStatus,
        DÉTAIL: m.anomalyNotes ?? '',
      };
      if (showPurchase) row['PRIX ACHAT'] = m.purchasePrice ?? '';
      return row;
    });
    const matCols = showPurchase
      ? ['ID', 'MATIÈRE', 'FAMILLE', 'GRAMMAGE', 'ÉPAISSEUR', 'UNITÉ', 'PRIX ACHAT', 'PRIX BASE', 'VISIBLE POS', 'STATUT', 'DÉTAIL']
      : ['ID', 'MATIÈRE', 'FAMILLE', 'GRAMMAGE', 'ÉPAISSEUR', 'UNITÉ', 'PRIX BASE', 'VISIBLE POS', 'STATUT', 'DÉTAIL'];
    XLSX.utils.book_append_sheet(
      wb,
      sheetFromRows('01_Matieres_Stock', matCols, matRows),
      '01_Matieres_Stock',
    );

    const prixBaseRows = (ctxPrices as Array<Record<string, unknown>>).map((r) => {
      const row: Record<string, unknown> = {
        ID: r.id,
        MATIÈRE: r.materialKey,
        'CONTEXTE PRIX': r.priceContext,
        'FORMAT BASE': r.baseFormat ?? '',
        'UNITÉ PRIX': r.priceUnit,
        'PRIX HT': r.priceHT,
        ACTIF: r.active ? 'oui' : 'non',
      };
      if (showPurchase) row['COÛT HT'] = r.costHT ?? '';
      return row;
    });
    const prixCols = showPurchase
      ? ['ID', 'MATIÈRE', 'CONTEXTE PRIX', 'FORMAT BASE', 'UNITÉ PRIX', 'PRIX HT', 'COÛT HT', 'ACTIF']
      : ['ID', 'MATIÈRE', 'CONTEXTE PRIX', 'FORMAT BASE', 'UNITÉ PRIX', 'PRIX HT', 'ACTIF'];
    XLSX.utils.book_append_sheet(
      wb,
      sheetFromRows('02_Prix_Base', prixCols, prixBaseRows),
      '02_Prix_Base',
    );

    const isfRows = bpp.map((r) => ({
      ID: r.id,
      MATIÈRE: r.materialKey,
      GRAMMAGE: r.grammage,
      'FORMAT BASE': r.formatLabel || 'A4',
      'PRIX A4': r.basePrice,
      RECTO: r.face === 'recto' ? 'oui' : '',
      VERSO: r.face.includes('verso') ? 'oui' : '',
      UNITÉ: r.saleUnit,
      'VISIBLE POS': r.active ? 'oui' : 'non',
      STATUT: r.publicationStatus,
    }));
    XLSX.utils.book_append_sheet(
      wb,
      sheetFromRows('03_Impression_Sans_Finition', [
        'ID', 'MATIÈRE', 'GRAMMAGE', 'FORMAT BASE', 'PRIX A4', 'RECTO', 'VERSO', 'UNITÉ', 'VISIBLE POS', 'STATUT',
      ], isfRows),
      '03_Impression_Sans_Finition',
    );

    const gfRows = gf.map((r) => ({
      ID: r.excelId ?? r.id,
      MATIÈRE: r.materialName ?? r.name,
      'PRIX M2': r.pricePerM2 ?? '',
      'PRIX ML': r.pricePerLinearMeter ?? '',
      LAIZE: r.laize ?? '',
      'VISIBLE POS': r.visiblePOS ? 'oui' : 'non',
      STATUT: r.status,
      DÉTAIL: r.details ?? '',
    }));
    XLSX.utils.book_append_sheet(
      wb,
      sheetFromRows('04_Grand_Format', ['ID', 'MATIÈRE', 'PRIX M2', 'PRIX ML', 'LAIZE', 'VISIBLE POS', 'STATUT', 'DÉTAIL'], gfRows),
      '04_Grand_Format',
    );

    const avdRows = avd.map((r) => ({
      ID: r.excelId ?? r.id,
      ARTICLE: r.name,
      CATÉGORIE: r.category ?? '',
      'PRIX DIRECT': r.unitPrice ?? '',
      'MATIÈRE LIÉE': r.materialKey ?? '',
      'VISIBLE POS': r.visiblePOS ? 'oui' : 'non',
      STATUT: r.status,
    }));
    XLSX.utils.book_append_sheet(
      wb,
      sheetFromRows('05_Articles_Vente_Directe', [
        'ID', 'ARTICLE', 'CATÉGORIE', 'PRIX DIRECT', 'MATIÈRE LIÉE', 'VISIBLE POS', 'STATUT',
      ], avdRows),
      '05_Articles_Vente_Directe',
    );

    const finRows = (Array.isArray(finishing) ? finishing : []).map((r: any) => ({
      ID: r.excelId ?? r.id,
      NOM: r.name,
      PRIX: r.unitPrice ?? r.price ?? '',
      ACTIF: r.active ? 'oui' : 'non',
    }));
    XLSX.utils.book_append_sheet(
      wb,
      sheetFromRows('06_Finitions_Faconnage', ['ID', 'NOM', 'PRIX', 'ACTIF'], finRows),
      '06_Finitions_Faconnage',
    );

    const anomalyRows = drifts.map((d) => ({
      TYPE: d.kind,
      SÉVÉRITÉ: d.severity,
      MESSAGE: d.message,
      'PRIX GAUCHE': d.leftPrice ?? '',
      'PRIX DROITE': d.rightPrice ?? '',
      SOURCE_G: d.leftSource ?? '',
      SOURCE_D: d.rightSource ?? '',
    }));
    XLSX.utils.book_append_sheet(
      wb,
      sheetFromRows('10_Anomalies', [
        'TYPE', 'SÉVÉRITÉ', 'MESSAGE', 'PRIX GAUCHE', 'PRIX DROITE', 'SOURCE_G', 'SOURCE_D',
      ], anomalyRows),
      '10_Anomalies',
    );

    // Feuilles schéma complet (brief Admin)
    for (const name of [
      '07_Paliers_Remises',
      '08_Regles_Formules',
      '09_Limites_Matieres',
      '11_Options_Chips',
      '12_Categories_POS',
      '13_Anomalies_Catalogue',
    ] as const) {
      XLSX.utils.book_append_sheet(wb, sheetFromRows(name, ['ID', 'DÉTAIL'], []), name);
    }

    // Alias noms brief (02_Prix_Par_Contexte)
    XLSX.utils.book_append_sheet(
      wb,
      sheetFromRows('02_Prix_Par_Contexte', [
        'ID', 'MATIÈRE', 'CONTEXTE PRIX', 'FORMAT BASE', 'UNITÉ PRIX', 'PRIX HT', 'COÛT HT', 'ACTIF',
      ], prixBaseRows),
      '02_Prix_Par_Contexte',
    );

    void MATERIAL_EXCEL_COLUMNS;
    void GRAND_FORMAT_EXCEL_COLUMNS;
    void FINISHING_EXCEL_COLUMNS;

    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
    return new NextResponse(buf, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="prix-matieres-stock-${new Date().toISOString().slice(0, 10)}.xlsx"`,
      },
    });
  } catch (e) {
    return NextResponse.json({ ok: false, error: safeErrorMessage(e) }, { status: 500 });
  }
}
