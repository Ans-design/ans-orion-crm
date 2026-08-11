'use client';

import Link from 'next/link';
import { ClipboardCheck, Palette, Recycle, Settings2 } from 'lucide-react';
import { summarizeConfigSnapshot } from '@/lib/commande/config-snapshot-lines';
import { checklistProgress, type QualiteChecklistItem } from '@/lib/qualite/checklist-definition';

type StudioBrief = { id: string; titre: string; statut: string };
type MaterialWaste = { id: string; matiere: string; quantity: number; unite: string; cause: string };
type Ligne = { articleLabel: string; quantity: number; configSnapshot?: unknown; articleId?: string | null };
type Qualite = {
  statut: string;
  checklist?: QualiteChecklistItem[];
  commentaire?: string | null;
  cause?: string | null;
} | null;

type Props = {
  commandeId: string;
  lignes?: Ligne[];
  studioBriefs?: StudioBrief[];
  materialWastes?: MaterialWaste[];
  qualiteControle?: Qualite;
};

export function CommandeDossierExtraPanels({
  commandeId,
  lignes = [],
  studioBriefs = [],
  materialWastes = [],
  qualiteControle,
}: Props) {
  const technicalLines = lignes
    .map((l) => summarizeConfigSnapshot(l.articleLabel, l.quantity, l.configSnapshot, l.articleId))
    .filter((s) => s.lines.length > 0);

  return (
    <div className="space-y-3">
      {technicalLines.length > 0 && (
        <div className="dashboard-chart-card">
          <h3 className="font-semibold text-sm mb-2 flex items-center gap-2">
            <Settings2 size={14} /> Options techniques
          </h3>
          <div className="space-y-3">
            {technicalLines.map((t, i) => (
              <div key={i} className="text-xs border-b border-border/50 pb-2 last:border-0">
                <p className="font-semibold">{t.articleLabel} ×{t.quantity}</p>
                <dl className="mt-1 grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1">
                  {t.lines.map((row) => (
                    <div key={row.key} className="flex justify-between gap-2">
                      <dt className="text-muted-foreground">{row.key}</dt>
                      <dd className="font-medium text-right">{row.value}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="dashboard-chart-card">
        <div className="flex items-center justify-between gap-2 mb-2">
          <h3 className="font-semibold text-sm flex items-center gap-2">
            <ClipboardCheck size={14} /> Contrôle qualité
          </h3>
          <Link href={`/production/qualite?commande=${commandeId}`} className="text-[10px] text-[var(--ans-cyan)] hover:underline">
            Ouvrir module →
          </Link>
        </div>
        {qualiteControle ? (
          <div className="text-xs space-y-1">
            <p>Statut : <span className="font-semibold">{qualiteControle.statut}</span></p>
            {Array.isArray(qualiteControle.checklist) && qualiteControle.checklist.length > 0 && (
              <p className="text-muted-foreground">
                Checklist : {checklistProgress(qualiteControle.checklist).checked}/{checklistProgress(qualiteControle.checklist).total} ({checklistProgress(qualiteControle.checklist).percent}%)
              </p>
            )}
            {qualiteControle.commentaire && (
              <p className="text-muted-foreground">Commentaire : {qualiteControle.commentaire}</p>
            )}
            {qualiteControle.cause && (
              <p className="text-red-600">Cause NC : {qualiteControle.cause}</p>
            )}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">Aucun contrôle enregistré — lancez la checklist avant livraison.</p>
        )}
      </div>

      <div className="dashboard-chart-card">
        <div className="flex items-center justify-between gap-2 mb-2">
          <h3 className="font-semibold text-sm flex items-center gap-2">
            <Palette size={14} /> Briefs studio
          </h3>
          <Link href={`/studio?commande=${commandeId}`} className="text-[10px] text-[var(--ans-cyan)] hover:underline">
            Studio →
          </Link>
        </div>
        {studioBriefs.length === 0 ? (
          <p className="text-xs text-muted-foreground">Aucun brief — créez-en un depuis le module Studio.</p>
        ) : (
          studioBriefs.map((b) => (
            <div key={b.id} className="flex justify-between text-xs py-1.5 border-b border-border/50">
              <span>{b.titre}</span>
              <span className="badge badge-out text-[9px]">{b.statut}</span>
            </div>
          ))
        )}
      </div>

      {materialWastes.length > 0 && (
        <div className="dashboard-chart-card">
          <h3 className="font-semibold text-sm mb-2 flex items-center gap-2">
            <Recycle size={14} /> Matières & chutes
          </h3>
          {materialWastes.map((w) => (
            <div key={w.id} className="flex justify-between text-xs py-1.5 border-b border-border/50 gap-2">
              <span>{w.matiere} — {w.cause}</span>
              <span className="font-mono shrink-0">{w.quantity} {w.unite}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
