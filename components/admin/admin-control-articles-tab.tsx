'use client';

import { CAT_LABELS } from '@/lib/data/catalogue';
import type { ArticleAdminEntry, VisibilityMode } from '@/lib/admin-config/types';
import { VIS_COLORS, VIS_LABELS } from '@/components/admin/admin-control-constants';

type Props = {
  articles: ArticleAdminEntry[];
  canEdit: boolean;
  onSetVisibility: (id: string, visibility: VisibilityMode) => void;
};

export function AdminControlArticlesTab({ articles, canEdit, onSetVisibility }: Props) {
  return (
    <section className="pta-data-section" aria-label="Articles catalogue">
      <div className="pta-data-scroll">
        <table className="pta-admin-table">
          <thead>
            <tr>
              <th>Article</th>
              <th>Catégorie</th>
              <th>Statut</th>
              {canEdit && <th>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {articles.map((art) => (
              <tr key={art.id}>
                <td>
                  <div className="font-semibold">{art.name}</div>
                  <div className="orion-text-code text-muted-foreground">{art.id}</div>
                </td>
                <td>{CAT_LABELS[art.category as keyof typeof CAT_LABELS] ?? art.category}</td>
                <td>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${VIS_COLORS[art.visibility]}`}>
                    {VIS_LABELS[art.visibility]}
                  </span>
                </td>
                {canEdit && (
                  <td>
                    <select
                      value={art.visibility}
                      onChange={(e) => onSetVisibility(art.id, e.target.value as VisibilityMode)}
                      className="pta-toolbar-select !text-[11px]"
                    >
                      {Object.entries(VIS_LABELS).map(([k, v]) => (
                        <option key={k} value={k}>{v}</option>
                      ))}
                    </select>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
