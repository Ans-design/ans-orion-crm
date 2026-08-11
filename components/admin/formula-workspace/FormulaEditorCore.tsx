'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { uxToast } from '@/lib/ux/feedback';
import { getApiErrorMessage } from '@/lib/api-client';
import {
  blocksFromFormulaVariables,
  blocksToExpression,
  blocksToNaturalLanguage,
  createBlock,
  validatePriceBlocks,
  type PriceBlock,
} from '@/lib/pricing/price-builder-blocks';
import {
  SIMPLE_FORMULA_TOKENS,
  parseSimpleFormula,
  resolveSimpleFormulaDraft,
} from '@/lib/pricing/simple-formula';
import { calculationLabelFr, displayProfileLabel } from '@/lib/pricing/formula-display';
import {
  FormulaCanvasHead,
  FormulaFooterActions,
  type FormulaBusinessState,
} from './FormulaToolbar';
import { FormulaSummary } from './FormulaSummary';
import { FormulaCanvas } from './FormulaCanvas';
/* FormulaBlockInspector / FormulaBlockPalette : conservés (zéro suppression), panneau masqué. */

type FormulaVersionLike = {
  version: number;
  status: string;
  expression?: string | null;
  variables?: unknown;
  label?: string | null;
};

type Props = {
  articleId: string;
  articleLabel: string;
  family?: string | null;
  calculationType?: string | null;
  profileStatus?: string | null;
  updatedAt?: string | null;
  formulaVersions?: FormulaVersionLike[];
  canEdit: boolean;
  onSaved: () => void;
  onPublished: () => void;
  /** En-tête titre/statut (masqué dans Formules & moteurs — déjà dans la section). */
  showCanvasHead?: boolean;
  /** Après activation : sync catalogue / matières POS automatiquement. */
  autoSyncPosOnActivate?: boolean;
  /** Affiche l’éditeur de formule simple (variables + opérateurs) — étape 10. */
  expressionEditorOpen?: boolean;
};

function resolveBusinessState(opts: {
  profileStatus?: string | null;
  hasPublished: boolean;
  hasAny: boolean;
  validationError: string | null;
  syncFailed: boolean;
  justSynced: boolean;
}): FormulaBusinessState {
  if (opts.syncFailed) return 'sync_failed';
  if (opts.validationError) return 'erreur';
  if (!opts.hasAny) return 'a_completer';
  if (opts.profileStatus === 'archived') return 'inactif';
  if (opts.justSynced) return 'synchronise';
  if (opts.hasPublished || opts.profileStatus === 'published') return 'actif';
  return 'a_completer';
}

export function FormulaEditorCore({
  articleId,
  articleLabel,
  family,
  calculationType,
  profileStatus,
  updatedAt,
  formulaVersions = [],
  canEdit,
  onSaved,
  onPublished,
  showCanvasHead = true,
  autoSyncPosOnActivate = false,
  expressionEditorOpen = false,
}: Props) {
  const latest = formulaVersions[0];
  const published = formulaVersions.find((v) => v.status === 'published');

  const [blocks, setBlocks] = useState<PriceBlock[]>(() =>
    blocksFromFormulaVariables(latest?.variables, calculationType),
  );
  const [baseline, setBaseline] = useState(() =>
    JSON.stringify(blocksFromFormulaVariables(latest?.variables, calculationType)),
  );
  const initialSimple = resolveSimpleFormulaDraft(
    latest?.variables,
    calculationType,
    blocksFromFormulaVariables(latest?.variables, calculationType),
  );
  const [expressionDraft, setExpressionDraft] = useState(() =>
    expressionEditorOpen ? initialSimple : String(latest?.expression ?? '').trim(),
  );
  const [expressionBaseline, setExpressionBaseline] = useState(() =>
    expressionEditorOpen ? initialSimple : String(latest?.expression ?? '').trim(),
  );
  const [expressionManual, setExpressionManual] = useState(false);
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [savingDraft, setSavingDraft] = useState(false);
  const [applying, setApplying] = useState(false);
  const [syncFailed, setSyncFailed] = useState(false);
  const [justSynced, setJustSynced] = useState(false);
  const [syncingPos, setSyncingPos] = useState(false);
  const exprTextareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const next = blocksFromFormulaVariables(latest?.variables, calculationType);
    setBlocks(next);
    setBaseline(JSON.stringify(next));
    setSelectedBlockId(next[0]?.id ?? null);
    if (expressionEditorOpen) {
      const simple = resolveSimpleFormulaDraft(latest?.variables, calculationType, next);
      setExpressionDraft(simple);
      setExpressionBaseline(simple);
    } else {
      const expr = String(latest?.expression ?? '').trim();
      setExpressionDraft(expr);
      setExpressionBaseline(expr);
    }
    setExpressionManual(false);
    setJustSynced(false);
    setSyncFailed(false);
  }, [articleId, latest?.variables, calculationType, latest?.version, latest?.expression, expressionEditorOpen]);

  const simpleParsed = useMemo(
    () => (expressionEditorOpen ? parseSimpleFormula(expressionDraft) : null),
    [expressionEditorOpen, expressionDraft],
  );

  const dirtyBlocks = JSON.stringify(blocks) !== baseline;
  const dirtyExpression = expressionDraft.trim() !== expressionBaseline.trim();
  const dirty = expressionEditorOpen ? dirtyExpression : dirtyBlocks || dirtyExpression;
  const natural = useMemo(() => blocksToNaturalLanguage(blocks), [blocks]);
  const expressionFromBlocks = useMemo(() => blocksToExpression(blocks), [blocks]);
  const expression = expressionManual
    ? expressionDraft
    : dirtyBlocks
      ? expressionFromBlocks
      : expressionDraft || expressionFromBlocks;
  const validationError = useMemo(() => {
    if (expressionEditorOpen) {
      if (!expressionDraft.trim()) return 'Formule vide';
      if (simpleParsed && !simpleParsed.ok) return simpleParsed.error;
      if (simpleParsed?.ok) return validatePriceBlocks(simpleParsed.blocks);
      return null;
    }
    if (expressionManual && !expressionDraft.trim()) return 'Expression vide';
    // Édition expression seule : ne pas bloquer sur les blocs.
    if (expressionManual && !dirtyBlocks) return null;
    if (!blocks.length && expressionDraft.trim()) return null;
    return validatePriceBlocks(blocks);
  }, [
    blocks,
    expressionManual,
    expressionDraft,
    dirtyBlocks,
    expressionEditorOpen,
    simpleParsed,
  ]);

  const businessState = resolveBusinessState({
    profileStatus,
    hasPublished: Boolean(published),
    hasAny: Boolean(latest),
    validationError,
    syncFailed,
    justSynced,
  });

  const syncLabel =
    syncFailed
      ? 'Synchronisation échouée'
      : justSynced
        ? 'Synchronisé (parité vérifiée)'
        : dirty
          ? 'Brouillon local'
          : published
            ? 'Actif — parité à vérifier'
            : 'Non synchronisé';

  const updateBlock = (next: PriceBlock) => {
    setBlocks((prev) => prev.map((b) => (b.id === next.id ? next : b)));
    setExpressionManual(false);
    setJustSynced(false);
  };

  const move = (id: string, dir: -1 | 1) => {
    setBlocks((prev) => {
      const i = prev.findIndex((b) => b.id === id);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= prev.length) return prev;
      const copy = [...prev];
      [copy[i], copy[j]] = [copy[j]!, copy[i]!];
      return copy;
    });
    setExpressionManual(false);
    setJustSynced(false);
  };

  const discard = () => {
    setBlocks(JSON.parse(baseline) as PriceBlock[]);
    setExpressionDraft(expressionBaseline);
    setExpressionManual(false);
  };

  const persistDraft = async (): Promise<boolean> => {
    if (expressionEditorOpen) {
      const parsed = parseSimpleFormula(expressionDraft);
      if (!parsed.ok) {
        uxToast.error(parsed.error);
        return false;
      }
      const r = await fetch(`/api/dynamic-pricing/${articleId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          section: 'formula',
          blocks: parsed.blocks,
          simpleFormula: parsed.normalized,
          source: 'simple-formula-editor',
          label: 'Formule simple',
        }),
      });
      const d = await r.json();
      if (!r.ok) {
        uxToast.error(getApiErrorMessage(d, 'Enregistrement impossible'));
        return false;
      }
      setBlocks(parsed.blocks);
      setBaseline(JSON.stringify(parsed.blocks));
      setExpressionDraft(parsed.normalized);
      setExpressionBaseline(parsed.normalized);
      setExpressionManual(false);
      onSaved();
      return true;
    }

    if (expressionManual && dirtyExpression && !dirtyBlocks) {
      const r = await fetch(`/api/dynamic-pricing/${articleId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          section: 'formulaExpression',
          expression: (expressionManual ? expressionDraft : expression).trim(),
          label: 'Expression éditeur',
        }),
      });
      const d = await r.json();
      if (!r.ok) {
        uxToast.error(getApiErrorMessage(d, 'Enregistrement impossible'));
        return false;
      }
      const saved = (expressionManual ? expressionDraft : expression).trim();
      setExpressionDraft(saved);
      setExpressionBaseline(saved);
      setExpressionManual(true);
      onSaved();
      return true;
    }

    const r = await fetch(`/api/dynamic-pricing/${articleId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ section: 'formula', blocks, label: 'Constructeur visuel' }),
    });
    const d = await r.json();
    if (!r.ok) {
      uxToast.error(getApiErrorMessage(d, 'Enregistrement impossible'));
      return false;
    }
    setBaseline(JSON.stringify(blocks));
    if (expressionManual && dirtyExpression) {
      const r2 = await fetch(`/api/dynamic-pricing/${articleId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          section: 'formulaExpression',
          expression: expressionDraft.trim(),
          label: 'Expression éditeur',
        }),
      });
      const d2 = await r2.json();
      if (!r2.ok) {
        uxToast.error(getApiErrorMessage(d2, 'Expression non enregistrée'));
        return false;
      }
      setExpressionBaseline(expressionDraft.trim());
    } else {
      setExpressionDraft(expressionFromBlocks);
      setExpressionBaseline(expressionFromBlocks);
      setExpressionManual(false);
    }
    onSaved();
    return true;
  };

  const publishFormula = async (): Promise<boolean> => {
    const r = await fetch(`/api/dynamic-pricing/${articleId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'publish' }),
    });
    const d = await r.json();
    if (!r.ok) {
      uxToast.error(getApiErrorMessage(d, 'Activation impossible'));
      return false;
    }
    onPublished();
    return true;
  };

  const syncPos = async (): Promise<boolean> => {
    const r = await fetch('/api/admin-backoffice/pricing/sync-pos', { method: 'POST' });
    const d = await r.json().catch(() => ({}));
    if (!r.ok || !d.ok) {
      uxToast.error(getApiErrorMessage(d, 'Sync POS échouée'));
      return false;
    }
    return true;
  };

  const saveWithoutActivate = async () => {
    if (!canEdit) return;
    if (validationError) {
      uxToast.error(validationError);
      return;
    }
    setSavingDraft(true);
    setSyncFailed(false);
    try {
      const ok = await persistDraft();
      if (ok) uxToast.success('Brouillon enregistré — POS inchangé');
    } catch {
      uxToast.error('Erreur réseau');
    }
    setSavingDraft(false);
  };

  const activateOnly = async () => {
    if (!canEdit) return;
    if (validationError) {
      uxToast.error(validationError);
      return;
    }
    setApplying(true);
    setSyncFailed(false);
    try {
      if (dirty) {
        const saved = await persistDraft();
        if (!saved) {
          setApplying(false);
          return;
        }
      }
      const publishedOk = await publishFormula();
      if (!publishedOk) {
        setSyncFailed(true);
        setApplying(false);
        return;
      }
      if (autoSyncPosOnActivate) {
        const synced = await syncPos();
        if (!synced) {
          setSyncFailed(true);
          uxToast.success('Formule activée — sync POS à relancer');
          setApplying(false);
          return;
        }
        setJustSynced(true);
        uxToast.success('Formule appliquée — POS commercial mis à jour');
      } else {
        uxToast.success('Formule activée — synchronisez le POS séparément pour projeter');
      }
    } catch {
      setSyncFailed(true);
      uxToast.error('Erreur réseau');
    }
    setApplying(false);
  };

  const syncPosOnly = async () => {
    if (!canEdit) return;
    setSyncingPos(true);
    setSyncFailed(false);
    try {
      const synced = await syncPos();
      if (!synced) {
        setSyncFailed(true);
        uxToast.error('Sync POS échouée — la formule active n’a pas été annulée');
      } else {
        setJustSynced(true);
        uxToast.success('Catalogue synchronisé — vérifiez la parité Admin↔POS');
      }
    } catch {
      setSyncFailed(true);
      uxToast.error('Erreur réseau');
    }
    setSyncingPos(false);
  };

  const openInspector = (id: string) => {
    setSelectedBlockId(id);
  };

  const addBlock = () => {
    if (!canEdit) return;
    const b = createBlock('surcharge_fixed');
    setBlocks((prev) => [...prev, b]);
    setSelectedBlockId(b.id);
    setJustSynced(false);
  };

  const metaLine = [family, calculationLabelFr(calculationType)]
    .filter(Boolean)
    .join(' · ');

  return (
    <div className="fw-editor fw-editor--no-inspector">
      <div className="fw-editor__body fw-editor__body--full">
        <div className="fw-editor__canvas-wrap">
          {showCanvasHead ? (
            <FormulaCanvasHead
              title={displayProfileLabel(articleLabel)}
              meta={metaLine || articleId}
              businessState={businessState}
              syncLabel={syncLabel}
              lastModified={updatedAt}
              dirty={dirty}
            />
          ) : null}

          {!expressionEditorOpen ? (
            <>
              <FormulaSummary naturalLanguage={natural} />

              {validationError ? (
                <div className="fw-alert fw-alert--error" role="alert">
                  {validationError}
                </div>
              ) : null}

              <FormulaCanvas
                blocks={blocks}
                selectedId={selectedBlockId}
                canEdit={canEdit}
                onSelect={openInspector}
                onToggle={(id) => {
                  const b = blocks.find((x) => x.id === id);
                  if (b) updateBlock({ ...b, enabled: !b.enabled });
                }}
                onRemove={(id) => {
                  setBlocks((prev) => prev.filter((b) => b.id !== id));
                  setExpressionManual(false);
                  if (selectedBlockId === id) setSelectedBlockId(null);
                }}
                onMove={move}
                onAddRequest={addBlock}
              />
            </>
          ) : null}

          {expressionEditorOpen ? (
            <div className="fw-tech-expr fw-tech-expr--editable fw-simple-formula">
              <label htmlFor={`fw-expr-${articleId}`}>
                Formule simple — variables + opérateurs (+, ×), puis Appliquer &amp; sync POS
              </label>
              <div className="fw-simple-formula__chips" role="group" aria-label="Variables">
                {SIMPLE_FORMULA_TOKENS.map((tok) => (
                  <button
                    key={tok.code}
                    type="button"
                    className="fw-simple-formula__chip"
                    title={tok.hint ?? tok.label}
                    disabled={!canEdit}
                    onClick={() => {
                      const el = exprTextareaRef.current;
                      const cur = expressionDraft;
                      const start = el?.selectionStart ?? cur.length;
                      const end = el?.selectionEnd ?? start;
                      const ins = cur.trim() ? ` + ${tok.insert}` : tok.insert;
                      const next = cur.slice(0, start) + ins + cur.slice(end);
                      const newPos = start + ins.length;
                      setExpressionDraft(next);
                      setExpressionManual(true);
                      setJustSynced(false);
                      requestAnimationFrame(() => {
                        el?.focus();
                        el?.setSelectionRange(newPos, newPos);
                      });
                    }}
                  >
                    {tok.label}
                  </button>
                ))}
              </div>
              <div className="fw-simple-formula__ops" role="group" aria-label="Opérateurs mathématiques">
                {([
                  { label: '+', insert: ' + ', title: 'Addition' },
                  { label: '−', insert: ' - ', title: 'Soustraction' },
                  { label: '×', insert: ' * ', title: 'Multiplication' },
                  { label: '÷', insert: ' / ', title: 'Division' },
                  { label: '(', insert: '(', title: 'Parenthèse ouvrante' },
                  { label: ')', insert: ')', title: 'Parenthèse fermante' },
                  { label: '.', insert: '.', title: 'Séparateur décimal' },
                ] as { label: string; insert: string; title: string }[]).map((op) => (
                  <button
                    key={op.label}
                    type="button"
                    className="fw-simple-formula__op-btn"
                    title={op.title}
                    disabled={!canEdit}
                    onClick={() => {
                      const el = exprTextareaRef.current;
                      const cur = expressionDraft;
                      const start = el?.selectionStart ?? cur.length;
                      const end = el?.selectionEnd ?? start;
                      const next = cur.slice(0, start) + op.insert + cur.slice(end);
                      const newPos = start + op.insert.length;
                      setExpressionDraft(next);
                      setExpressionManual(true);
                      setJustSynced(false);
                      requestAnimationFrame(() => {
                        el?.focus();
                        el?.setSelectionRange(newPos, newPos);
                      });
                    }}
                  >
                    {op.label}
                  </button>
                ))}
              </div>
              {validationError ? (
                <div className="fw-alert fw-alert--error" role="alert">
                  {validationError}
                </div>
              ) : null}
              <textarea
                ref={exprTextareaRef}
                id={`fw-expr-${articleId}`}
                className="fm-refonte-flow-expr fw-simple-formula__input"
                value={expressionDraft}
                disabled={!canEdit}
                rows={2}
                spellCheck={false}
                placeholder="Ex. prixBase + options + finitions + marge%25 + arrondi(50)"
                onChange={(e) => {
                  setExpressionDraft(e.target.value);
                  setExpressionManual(true);
                  setJustSynced(false);
                }}
              />
              {simpleParsed?.ok ? (
                <p className="fw-simple-formula__preview">
                  Calcul POS : {blocksToNaturalLanguage(simpleParsed.blocks)}
                </p>
              ) : null}
            </div>
          ) : (
            <details className="fw-tech-expr">
              <summary>Expression technique (éditable)</summary>
              <textarea
                className="fm-refonte-flow-expr"
                value={expression}
                disabled={!canEdit}
                rows={4}
                spellCheck={false}
                onChange={(e) => {
                  setExpressionDraft(e.target.value);
                  setExpressionManual(true);
                  setJustSynced(false);
                }}
              />
            </details>
          )}

          <FormulaFooterActions
            dirty={dirty}
            canEdit={canEdit}
            applying={applying}
            savingDraft={savingDraft}
            syncing={syncingPos}
            applyBlockedReason={validationError}
            onDiscard={discard}
            onSaveWithoutActivate={() => void saveWithoutActivate()}
            onActivate={() => void activateOnly()}
            onSyncPos={() => void syncPosOnly()}
            activateLabel={
              autoSyncPosOnActivate ? 'Appliquer & sync POS' : 'Enregistrer et activer'
            }
            activateTitle={
              autoSyncPosOnActivate
                ? 'Enregistre, publie la formule et synchronise le POS commercial'
                : 'Enregistre puis active la version Admin — sans sync POS automatique'
            }
          />
        </div>
      </div>
    </div>
  );
}
