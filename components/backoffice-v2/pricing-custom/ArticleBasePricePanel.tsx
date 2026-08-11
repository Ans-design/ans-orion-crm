'use client';

import { useState } from 'react';
import { Rocket } from 'lucide-react';
import { AppButton } from '@/components/ui/app-ui';
import { uxToast } from '@/lib/ux/feedback';
import { getApiErrorMessage } from '@/lib/api-client';
import { FormulaAuditPanel } from './FormulaAuditPanel';
import { BasePrintingPriceTable } from './BasePrintingPriceTable';

type Props = {
  articleId: string;
  canEdit: boolean;
  prixBase?: number | null;
  onUpdated?: () => void;
};

export function ArticleBasePricePanel({ articleId, canEdit, prixBase, onUpdated }: Props) {
  const [publishing, setPublishing] = useState(false);

  const publishArticleBase = async () => {
    if (!canEdit) return;
    setPublishing(true);
    try {
      const r = await fetch(`/api/admin-backoffice/pricing/articles/${encodeURIComponent(articleId)}/base-price`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ publicationStatus: 'published' }),
      });
      const d = await r.json();
      if (r.ok && d.ok) {
        uxToast.success('Prix base publié pour POS');
        onUpdated?.();
      } else uxToast.error(getApiErrorMessage(d, 'Publication échouée'));
    } finally {
      setPublishing(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h4 className="font-medium">Prix base impression sans finition</h4>
          {prixBase != null && (
            <p className="text-sm text-muted-foreground">Profil prixBase : {Math.round(prixBase)} Ar</p>
          )}
        </div>
        {canEdit && (
          <AppButton type="button" variant="default" className="text-sm" disabled={publishing} onClick={publishArticleBase}>
            <Rocket className="h-4 w-4" /> Publier prix base POS
          </AppButton>
        )}
      </div>
      <BasePrintingPriceTable canEdit={canEdit} articleId={articleId} />
      <FormulaAuditPanel articleId={articleId} />
    </div>
  );
}
