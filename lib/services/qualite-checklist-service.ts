import { prisma } from '@/lib/prisma';
import {
  buildDefaultChecklist,
  isChecklistComplete,
  normalizeChecklist,
  type QualiteChecklistItem,
  type QualiteStatut,
} from '@/lib/qualite/checklist-definition';
import { processQualiteConforme, processQualiteNonConforme } from '@/lib/services/qualite-service';

type QualiteOpts = { userId?: string; userName?: string };

export async function getOrCreateQualiteControle(commandeId: string) {
  const existing = await prisma.qualiteControle.findUnique({ where: { commandeId } });
  if (existing) {
    return {
      ...existing,
      checklist: normalizeChecklist(existing.checklist),
    };
  }

  const created = await prisma.qualiteControle.create({
    data: {
      commandeId,
      statut: 'En attente contrôle',
      checklist: buildDefaultChecklist(),
    },
  });

  return {
    ...created,
    checklist: normalizeChecklist(created.checklist),
  };
}

export async function saveQualiteChecklist(
  commandeId: string,
  payload: {
    checklist: QualiteChecklistItem[];
    commentaire?: string;
    proofPhotoUrl?: string | null;
    statut?: QualiteStatut;
    cause?: string;
    actionCorrective?: string;
    responsable?: string;
    cout?: number;
  },
  opts?: QualiteOpts,
) {
  const checklist = normalizeChecklist(payload.checklist);
  const controle = await getOrCreateQualiteControle(commandeId);

  const updated = await prisma.qualiteControle.update({
    where: { id: controle.id },
    data: {
      checklist,
      statut: payload.statut ?? controle.statut,
      commentaire: payload.commentaire ?? controle.commentaire,
      proofPhotoUrl: payload.proofPhotoUrl ?? controle.proofPhotoUrl,
      cause: payload.cause ?? controle.cause,
      actionCorrective: payload.actionCorrective ?? controle.actionCorrective,
      responsable: payload.responsable ?? controle.responsable ?? opts?.userName,
      cout: payload.cout ?? controle.cout,
      controlePar: opts?.userName ?? controle.controlePar,
      controleAt: new Date(),
    },
  });

  return {
    ...updated,
    checklist: normalizeChecklist(updated.checklist),
  };
}

export async function submitQualiteDecision(
  commandeId: string,
  action: 'conforme' | 'non_conforme' | 'reserve' | 'refaire',
  payload: {
    checklist: QualiteChecklistItem[];
    motif?: string;
    cause?: string;
    actionCorrective?: string;
    cout?: number;
    proofPhotoUrl?: string | null;
  },
  opts?: QualiteOpts,
) {
  const checklist = normalizeChecklist(payload.checklist);

  if (action === 'conforme' && !isChecklistComplete(checklist)) {
    return { error: 'Complétez toute la checklist avant validation conforme' };
  }

  if ((action === 'non_conforme' || action === 'refaire') && !payload.cause?.trim()) {
    return { error: 'La cause est obligatoire pour une non-conformité' };
  }

  let statut: QualiteStatut;
  if (action === 'conforme') statut = 'Conforme';
  else if (action === 'non_conforme') statut = 'Non conforme';
  else if (action === 'reserve') statut = 'Accepte avec reserve';
  else statut = 'A refaire';

  await saveQualiteChecklist(
    commandeId,
    {
      checklist,
      statut,
      commentaire: payload.motif,
      cause: payload.cause,
      actionCorrective: payload.actionCorrective,
      cout: payload.cout,
      proofPhotoUrl: payload.proofPhotoUrl,
      responsable: opts?.userName,
    },
    opts,
  );

  if (action === 'conforme' || action === 'reserve') {
    return processQualiteConforme(commandeId, { ...opts, motif: payload.motif });
  }

  return processQualiteNonConforme(commandeId, {
    ...opts,
    motif: payload.motif ?? payload.cause ?? 'Non-conformité au contrôle qualité',
  });
}
