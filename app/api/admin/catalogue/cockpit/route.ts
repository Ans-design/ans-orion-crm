export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { requireAnyPermission } from '@/lib/auth-utils';
import { safeErrorMessage } from '@/lib/api-response';
import { prisma } from '@/lib/prisma';
import { countLowStockItems } from '@/lib/services/stock-service';

/**
 * Cockpit KPI Catalogue Prix & Stock — agrège DB (pas de mock).
 * Léger : pas de getPosCatalogue / detect-duplicates (trop lents pour un cockpit).
 */
export async function GET() {
  const auth = await requireAnyPermission('config:view', 'tarifs:read');
  if ('error' in auth) return auth.error;

  try {
    const [
      articlesPos,
      articlesDraft,
      articlesSansPrix,
      matieresActives,
      matieresTotal,
      finitions,
      stockFaible,
      matieresSansPrix,
      optionsActives,
      formulasPublished,
    ] = await Promise.all([
      prisma.articlePricingProfile.count({
        where: { active: true, NOT: { status: 'archived' } },
      }),
      prisma.articlePricingProfile.count({
        where: { status: 'draft' },
      }),
      prisma.articlePricingProfile.count({
        where: {
          active: true,
          NOT: { status: 'archived' },
          AND: [
            { OR: [{ prixBase: null }, { prixBase: { lte: 0 } }] },
            { OR: [{ prixM2: null }, { prixM2: { lte: 0 } }] },
            { discountTiers: { none: { active: true } } },
          ],
        },
      }),
      prisma.baseMaterial.count({ where: { archived: false, active: true } }),
      prisma.baseMaterial.count({ where: { archived: false } }),
      prisma.finishingPrice.count({ where: { active: true } }),
      countLowStockItems(),
      prisma.baseMaterial.count({
        where: {
          archived: false,
          active: true,
          basePrintPrice: null,
        },
      }),
      prisma.productOptionGroup.count({ where: { active: true } }).catch(() => 0),
      prisma.formulaVersion.count({ where: { status: 'published' } }).catch(() => 0),
    ]);

    return NextResponse.json({
      ok: true,
      data: {
        articlesPos,
        articlesDraft,
        articlesSansPrix,
        produitsIncomplets: articlesDraft + articlesSansPrix,
        optionsActives,
        matieres: matieresActives,
        matieresTotal,
        matieresSansPrix,
        stockFaible,
        finitions,
        formulasPublished,
        anomalies: matieresSansPrix + stockFaible + articlesSansPrix + articlesDraft,
        prixManquants: matieresSansPrix,
        syncHint: 'Ne marque « synchronisé » qu’après succès catalogue + matières',
        priorities: [
          {
            id: 'drafts',
            label: 'Brouillons produit à publier',
            count: articlesDraft,
            href: '?studio=articles&tab=articles',
          },
          {
            id: 'no-price',
            label: 'Articles sans tarif utilisable',
            count: articlesSansPrix,
            href: '?studio=prix&tab=articles',
          },
          {
            id: 'mat-price',
            label: 'Matières sans prix d’impression',
            count: matieresSansPrix,
            href: '?studio=matieres&tab=matieres&view=couts',
          },
          {
            id: 'stock-low',
            label: 'Stock sous seuil',
            count: stockFaible,
            href: '?studio=matieres&tab=matieres&view=stock',
          },
          {
            id: 'parity',
            label: 'À diagnostiquer (Admin ↔ POS)',
            count: articlesDraft + articlesSansPrix,
            href: '?studio=matieres&tab=matieres',
          },
        ],
        studios: [
          { id: 'cockpit', label: 'Vue d’ensemble', href: '/administration/vue-ensemble' },
          { id: 'articles', label: 'Produits & publication', href: '?studio=articles&tab=articles' },
          { id: 'matieres', label: 'Matières, formats & coûts', href: '?studio=matieres&tab=matieres' },
          { id: 'prix', label: 'Studio Prix & Calculs', href: '?studio=prix&tab=overview' },
          { id: 'finitions', label: 'Options & finitions', href: '?studio=finitions&tab=chips' },
        ],
      },
    });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: { message: safeErrorMessage(e, 'Cockpit indisponible') } },
      { status: 500 },
    );
  }
}
