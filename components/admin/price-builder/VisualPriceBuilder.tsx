'use client';

/**
 * Compatibilité — l’éditeur complet est FormulaEditorCore / FormulaWorkspace.
 * Conservé pour les imports existants (fiche article, etc.).
 */
import { FormulaEditorCore } from '@/components/admin/formula-workspace/FormulaEditorCore';
import '@/components/admin/formula-workspace/formula-workspace.css';

type Props = {
  articleId: string;
  calculationType?: string | null;
  formulaVariables?: unknown;
  formulaExpression?: string | null;
  formulaStatus?: string | null;
  formulaVersion?: number | null;
  canEdit: boolean;
  onSaved: () => void;
  onDirtyChange?: (dirty: boolean) => void;
  articleLabel?: string;
};

export function VisualPriceBuilder({
  articleId,
  calculationType,
  formulaVariables,
  formulaStatus,
  formulaVersion,
  canEdit,
  onSaved,
  articleLabel,
}: Props) {
  return (
    <FormulaEditorCore
      articleId={articleId}
      articleLabel={articleLabel ?? articleId}
      calculationType={calculationType}
      canEdit={canEdit}
      formulaVersions={
        formulaVersion != null
          ? [
              {
                version: formulaVersion,
                status: formulaStatus ?? 'draft',
                variables: formulaVariables,
              },
            ]
          : []
      }
      onSaved={onSaved}
      onPublished={onSaved}
    />
  );
}
