'use client';

/**
 * Workspace Formules & règles — 3 zones (bibliothèque / canvas / inspecteur).
 * Données réelles FormulaVersion + pricingResolver.
 */
import { useCallback, useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { useSearchParams } from 'next/navigation';
import { LoadingState } from '@/components/ui/loading-state';
import { ErrorState } from '@/components/ui/error-state';
import { getApiErrorMessage } from '@/lib/api-client';
import { PricingProfileLibrary } from './PricingProfileLibrary';
import { FormulaEditorCore } from './FormulaEditorCore';
import './formula-workspace.css';

const MaterialRulesWorkspace = dynamic(
  () =>
    import('@/components/administration/pricing-rules/MaterialRulesWorkspace').then(
      (m) => m.MaterialRulesWorkspace,
    ),
  {
    ssr: false,
    loading: () => <LoadingState message="Chargement des règles…" size="sm" />,
  },
);

type ProfileRow = {
  articleId: string;
  articleLabel: string;
  family: string | null;
  calculationType: string | null;
  status: string;
  updatedAt?: string;
  formulaVersions?: { version: number; status: string }[];
  _count?: { formulaVersions?: number };
};

type ProfileDetail = {
  articleId: string;
  articleLabel?: string;
  family?: string | null;
  calculationType: string | null;
  status: string;
  updatedAt?: string;
  formulaVersions?: Array<{
    version: number;
    status: string;
    expression?: string | null;
    variables?: unknown;
    label?: string | null;
  }>;
};

type Props = {
  canEdit: boolean;
};

type Mode = 'builder' | 'rules';

export function FormulaWorkspace({ canEdit }: Props) {
  const searchParams = useSearchParams();
  const articleFromUrl = searchParams.get('article');
  const [mode, setMode] = useState<Mode>('builder');
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(articleFromUrl);
  const [detail, setDetail] = useState<ProfileDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [libCollapsed, setLibCollapsed] = useState(false);

  const loadProfiles = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await fetch('/api/dynamic-pricing', { cache: 'no-store' });
      const d = await r.json();
      if (!r.ok) throw new Error(getApiErrorMessage(d, 'Chargement impossible'));
      const list = (d.profiles ?? []) as ProfileRow[];
      setProfiles(list);
      setSelectedId((prev) => {
        if (articleFromUrl && list.some((p) => p.articleId === articleFromUrl)) {
          return articleFromUrl;
        }
        return prev ?? list[0]?.articleId ?? null;
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur');
      setProfiles([]);
    } finally {
      setLoading(false);
    }
  }, [articleFromUrl]);

  const loadDetail = useCallback(async (articleId: string) => {
    setDetailLoading(true);
    try {
      const r = await fetch(`/api/dynamic-pricing/${articleId}`, { cache: 'no-store' });
      const d = await r.json();
      if (!r.ok) throw new Error(getApiErrorMessage(d, 'Profil introuvable'));
      setDetail(d.profile as ProfileDetail);
    } catch {
      setDetail(null);
    } finally {
      setDetailLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadProfiles();
  }, [loadProfiles]);

  useEffect(() => {
    if (articleFromUrl) setSelectedId(articleFromUrl);
  }, [articleFromUrl]);

  useEffect(() => {
    if (selectedId && mode === 'builder') void loadDetail(selectedId);
  }, [selectedId, loadDetail, mode]);

  if (loading && mode === 'builder') {
    return <LoadingState message="Chargement des formules…" size="sm" />;
  }
  if (error && mode === 'builder') {
    return <ErrorState message={error} onRetry={() => void loadProfiles()} className="py-8" />;
  }

  const selectedProfile = profiles.find((p) => p.articleId === selectedId);

  return (
    <div className="fw-root">
      <div className="fw-mode-switch">
        <button
          type="button"
          className={mode === 'builder' ? 'fw-chip is-active' : 'fw-chip'}
          onClick={() => setMode('builder')}
        >
          Formules & règles
        </button>
        <button
          type="button"
          className={mode === 'rules' ? 'fw-chip is-active' : 'fw-chip'}
          onClick={() => setMode('rules')}
        >
          Équivalences matières
        </button>
      </div>

      {mode === 'rules' ? (
        <MaterialRulesWorkspace canEdit={canEdit} initialKind="equivalences" />
      ) : (
        <div className={`fw-grid${libCollapsed ? ' is-lib-collapsed' : ''}`}>
          <PricingProfileLibrary
            profiles={profiles}
            selectedId={selectedId}
            onSelect={setSelectedId}
            collapsed={libCollapsed}
            onToggleCollapse={() => setLibCollapsed((v) => !v)}
          />

          <div className="fw-main min-w-0">
            {!selectedId ? (
              <p className="fw-muted p-6">Sélectionnez un profil dans la bibliothèque.</p>
            ) : detailLoading ? (
              <LoadingState message="Chargement de la formule…" size="sm" />
            ) : !detail ? (
              <ErrorState
                message="Profil introuvable."
                onRetry={() => selectedId && void loadDetail(selectedId)}
              />
            ) : (
              <FormulaEditorCore
                articleId={selectedId}
                articleLabel={
                  selectedProfile?.articleLabel
                  ?? detail.articleLabel
                  ?? selectedId
                }
                family={selectedProfile?.family ?? detail.family}
                calculationType={detail.calculationType}
                profileStatus={detail.status}
                updatedAt={detail.updatedAt ?? selectedProfile?.updatedAt}
                formulaVersions={detail.formulaVersions}
                canEdit={canEdit}
                onSaved={() => {
                  void loadDetail(selectedId);
                  void loadProfiles();
                }}
                onPublished={() => {
                  void loadDetail(selectedId);
                  void loadProfiles();
                }}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
