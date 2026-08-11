export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth-utils';
import { apiError } from '@/lib/api-response';
import { getProductionDossier } from '@/lib/services/gpao-dossier-service';
import { renderProductionWorkOrderHtml } from '@/lib/services/DocumentService';
import { runApiHandler } from '@/lib/api-guard';
import { resolveParams } from '@/lib/api/route-params';

export async function GET(_req: NextRequest, ctx: { params: { id: string } | Promise<{ id: string }> }) {
  const { id } = await resolveParams(ctx.params);
  const auth = await requirePermission('production:read');
  if ('error' in auth) return auth.error;

  return runApiHandler('production/fiche-fabrication GET', async () => {
    const dossier = await getProductionDossier(id);
    if (!dossier) return apiError('Dossier introuvable', 404);

    const openIncidents = dossier.incidents
      .filter((i) => i.statut !== 'Résolu')
      .map((i) => ({ title: i.title, severity: i.severity }));

    const html = renderProductionWorkOrderHtml({
      dossierId: dossier.id,
      statutGlobal: dossier.statutGlobal,
      priorite: dossier.priorite,
      avancement: dossier.avancement,
      tempsEstimeMin: dossier.tempsEstimeMin,
      tempsReelMin: dossier.tempsReelMin,
      delai: dossier.delai,
      notes: dossier.notes,
      commande: {
        numero: dossier.commande.numero,
        article: dossier.commande.article,
        statut: dossier.commande.statut,
        qty: dossier.commande.qty,
        client: dossier.commande.client,
        lignes: dossier.commande.lignes.map((l) => ({
          articleId: l.articleId,
          articleLabel: l.articleLabel,
          quantity: l.quantity,
          configSnapshot: l.configSnapshot,
        })),
      },
      etapes: dossier.etapes.map((e) => ({
        ordre: e.ordre,
        nom: e.nom,
        statut: e.statut,
        responsable: e.responsable,
        machine: e.machine,
        dureeMin: e.dureeMin,
      })),
      openIncidents,
    });

    return new NextResponse(html, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-store',
      },
    });
  });
}
