'use client';

import { useEffect, useId, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Layers, X } from 'lucide-react';
import {
  FLUX_RESPONSIBLE_ROLES,
  FLUX_STEP_MODULES,
  type ProductionFluxStep,
} from '@/lib/data/production-flux-config';
import { COMMANDE_STATUTS } from '@/lib/data/commande-status';
import { TASK_TYPES } from '@/lib/constants/metier-task';

export type StepFormState = Omit<ProductionFluxStep, 'id' | 'sortOrder'> & {
  id?: string;
  sortOrder?: number;
  activate?: boolean;
  linkFromStepId?: string | null;
  transitionMode?: 'manual' | 'auto';
};

const EMPTY: StepFormState = {
  code: '',
  name: '',
  description: '',
  responsibleRole: 'commercial',
  linkedModules: ['commande'],
  targetDelayHours: 8,
  active: true,
  required: true,
  visiblePlanning: false,
  generatesTask: false,
  requiresValidation: false,
  blocksNext: false,
  commandeStatut: null,
  taskType: null,
  planningResource: null,
  activate: true,
  linkFromStepId: null,
  transitionMode: 'manual',
};

export type StepSaveExtras = {
  linkFromStepId?: string | null;
  transitionMode?: 'manual' | 'auto';
};

type Props = {
  open: boolean;
  initial?: ProductionFluxStep | null;
  roles: { id: string; label: string }[];
  steps: ProductionFluxStep[];
  maxSortOrder: number;
  onClose: () => void;
  onSave: (step: ProductionFluxStep, mode: 'draft' | 'active', extras?: StepSaveExtras) => void;
  onDelete?: (step: ProductionFluxStep) => void;
  saving: boolean;
};

const OPTION_TOGGLES: { key: keyof Pick<StepFormState, 'required' | 'visiblePlanning' | 'generatesTask' | 'requiresValidation' | 'blocksNext'>; label: string; hint: string }[] = [
  { key: 'required', label: 'Obligatoire', hint: 'Étape requise dans le parcours' },
  { key: 'visiblePlanning', label: 'Planning', hint: 'Visible dans le planning' },
  { key: 'generatesTask', label: 'Tâche auto', hint: 'Crée une tâche métier' },
  { key: 'requiresValidation', label: 'Validation', hint: 'Validation avant de continuer' },
  { key: 'blocksNext', label: 'Bloquant', hint: 'Empêche le passage suivant' },
];

export function ProductionFluxStepModal({
  open,
  initial,
  roles,
  steps,
  maxSortOrder,
  onClose,
  onSave,
  onDelete,
  saving,
}: Props) {
  const titleId = useId();
  const [form, setForm] = useState<StepFormState>(EMPTY);
  const [mounted, setMounted] = useState(false);
  const [section, setSection] = useState<'identite' | 'liaison' | 'options'>('identite');

  const isEdit = Boolean(initial);
  const lastStep = useMemo(
    () => [...steps].sort((a, b) => a.sortOrder - b.sortOrder).at(-1) ?? null,
    [steps],
  );

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    setSection('identite');
    if (initial) {
      setForm({
        ...initial,
        activate: initial.active,
        linkFromStepId: null,
        transitionMode: 'manual',
      });
    } else {
      setForm({
        ...EMPTY,
        sortOrder: maxSortOrder + 1,
        linkFromStepId: lastStep?.id ?? null,
        transitionMode: 'manual',
      });
    }
  }, [open, initial, maxSortOrder, lastStep?.id]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !saving) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, saving, onClose]);

  const set = <K extends keyof StepFormState>(key: K, value: StepFormState[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
  };

  const toggleModule = (mod: (typeof FLUX_STEP_MODULES)[number]) => {
    setForm((f) => {
      const has = f.linkedModules.includes(mod);
      return {
        ...f,
        linkedModules: has ? f.linkedModules.filter((m) => m !== mod) : [...f.linkedModules, mod],
      };
    });
  };

  const previewName = form.name.trim() || 'Nouvelle étape';
  const previewCode = (form.code.trim() || form.name.trim().toLowerCase().replace(/\s+/g, '-') || 'code').toUpperCase();
  const roleLabel = roles.find((r) => r.id === form.responsibleRole)?.label ?? form.responsibleRole;
  const fromStep = steps.find((s) => s.id === form.linkFromStepId) ?? null;
  const canSubmit = Boolean(form.name.trim());

  const buildStep = (active: boolean): ProductionFluxStep => {
    const code = form.code.trim() || form.name.trim().toLowerCase().replace(/\s+/g, '-');
    const id = initial?.id ?? `step-${code}-${Date.now().toString(36)}`;
    return {
      id,
      code,
      name: form.name.trim(),
      description: form.description.trim(),
      responsibleRole: form.responsibleRole,
      linkedModules: form.linkedModules,
      targetDelayHours: Number(form.targetDelayHours) || 0,
      active,
      required: form.required,
      visiblePlanning: form.visiblePlanning,
      generatesTask: form.generatesTask,
      requiresValidation: form.requiresValidation,
      blocksNext: form.blocksNext,
      commandeStatut: form.commandeStatut || null,
      taskType: form.taskType || null,
      planningResource: form.planningResource || null,
      sortOrder: form.sortOrder ?? maxSortOrder + 1,
    };
  };

  const submit = (mode: 'draft' | 'active') => {
    if (!canSubmit || saving) return;
    onSave(buildStep(mode === 'active'), mode, {
      linkFromStepId: isEdit ? null : (form.linkFromStepId ?? null),
      transitionMode: form.transitionMode ?? 'manual',
    });
  };

  if (!open || !mounted) return null;

  const modal = (
    <div
      className="pf-modal-backdrop"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !saving) onClose();
      }}
    >
      <div
        className="pf-modal pf-step-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <header className="pf-step-modal-head">
          <div className="pf-step-modal-head-main">
            <span className="pf-step-modal-icon" aria-hidden>
              <Layers className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <p className="pf-step-modal-eyebrow">{isEdit ? 'Configuration' : 'Chaîne de production'}</p>
              <h3 id={titleId}>{isEdit ? 'Modifier l’étape' : 'Nouvelle étape'}</h3>
            </div>
          </div>
          <button
            type="button"
            className="pf-step-modal-close"
            aria-label="Fermer"
            disabled={saving}
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="pf-step-modal-preview" aria-live="polite">
          <div className="pf-step is-current pf-step-modal-chip" aria-hidden>
            <i>{(form.sortOrder ?? maxSortOrder + 1) || 1}</i>
            <span>
              <b>{previewName}</b>
              <em>{roleLabel}</em>
            </span>
          </div>
          {!isEdit && fromStep ? (
            <div className="pf-step-modal-preview-link">
              <span>Transition</span>
              <strong>{fromStep.name}</strong>
              <em>→</em>
              <strong>{previewName}</strong>
              <span className={`pf-badge-mode ${form.transitionMode === 'auto' ? 'is-auto' : 'is-manual'}`}>
                {form.transitionMode === 'auto' ? '⚡ Auto' : '◷ Manuel'}
              </span>
            </div>
          ) : (
            <p className="pf-step-modal-preview-hint">
              Aperçu live · code <code>{previewCode}</code>
              {form.targetDelayHours ? ` · ${Math.floor(form.targetDelayHours)} h${
                Math.round((form.targetDelayHours % 1) * 60)
                  ? ` ${Math.round((form.targetDelayHours % 1) * 60)} min`
                  : ''
              }` : ''}
            </p>
          )}
        </div>

        <nav className="pf-step-modal-tabs" aria-label="Sections formulaire">
          {(
            [
              ['identite', 'Identité'],
              ['liaison', 'Liaisons'],
              ['options', 'Options'],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              className={section === id ? 'is-active' : undefined}
              onClick={() => setSection(id)}
            >
              {label}
            </button>
          ))}
        </nav>

        <div className="pf-step-modal-body">
          {section === 'identite' ? (
            <div className="pf-step-modal-section">
              <div className="pf-config-grid">
                <div className="pf-field" style={{ gridColumn: '1 / -1' }}>
                  <label htmlFor="pf-step-name">Nom de l’étape</label>
                  <input
                    id="pf-step-name"
                    autoFocus
                    value={form.name}
                    placeholder="Ex. Pré-presse, Contrôle qualité…"
                    onChange={(e) => set('name', e.target.value)}
                  />
                </div>
                <div className="pf-field">
                  <label htmlFor="pf-step-code">Code technique</label>
                  <input
                    id="pf-step-code"
                    value={form.code}
                    onChange={(e) => set('code', e.target.value)}
                    placeholder="auto depuis le nom"
                  />
                </div>
                <div className="pf-field">
                  <label htmlFor="pf-step-delay-h">Durée atelier</label>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <input
                      id="pf-step-delay-h"
                      type="number"
                      min={0}
                      step={1}
                      aria-label="Heures"
                      value={Math.floor(Number(form.targetDelayHours) || 0)}
                      onChange={(e) => {
                        const h = Math.max(0, Number(e.target.value) || 0);
                        const m = Math.round(((Number(form.targetDelayHours) || 0) % 1) * 60);
                        set('targetDelayHours', h + m / 60);
                      }}
                      style={{ flex: 1 }}
                    />
                    <span style={{ fontSize: 12, color: 'var(--muted-foreground, #71809a)' }}>h</span>
                    <input
                      id="pf-step-delay-m"
                      type="number"
                      min={0}
                      max={59}
                      step={5}
                      aria-label="Minutes"
                      value={Math.round(((Number(form.targetDelayHours) || 0) % 1) * 60)}
                      onChange={(e) => {
                        const m = Math.min(59, Math.max(0, Number(e.target.value) || 0));
                        const h = Math.floor(Number(form.targetDelayHours) || 0);
                        set('targetDelayHours', h + m / 60);
                      }}
                      style={{ flex: 1 }}
                    />
                    <span style={{ fontSize: 12, color: 'var(--muted-foreground, #71809a)' }}>min</span>
                  </div>
                  <p className="pf-field-hint">
                    Utilisée par le Planning (durée créneau / reste à planifier).
                  </p>
                </div>
                <div className="pf-field" style={{ gridColumn: '1 / -1' }}>
                  <label htmlFor="pf-step-desc">Description</label>
                  <textarea
                    id="pf-step-desc"
                    rows={3}
                    value={form.description}
                    placeholder="Ce que fait cette étape dans le parcours…"
                    onChange={(e) => set('description', e.target.value)}
                  />
                </div>
                <div className="pf-field" style={{ gridColumn: '1 / -1' }}>
                  <label>Rôle responsable</label>
                  <div className="pf-chip-row" role="listbox" aria-label="Rôle responsable">
                    {FLUX_RESPONSIBLE_ROLES.map((r) => {
                      const label = roles.find((x) => x.id === r)?.label ?? r;
                      const active = form.responsibleRole === r;
                      return (
                        <button
                          key={r}
                          type="button"
                          role="option"
                          aria-selected={active}
                          className={`pf-chip${active ? ' is-active' : ''}`}
                          onClick={() => set('responsibleRole', r)}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          ) : null}

          {section === 'liaison' ? (
            <div className="pf-step-modal-section">
              {!isEdit ? (
                <div className="pf-config-grid" style={{ marginBottom: 14 }}>
                  <div className="pf-field" style={{ gridColumn: '1 / -1' }}>
                    <label htmlFor="pf-link-from">Connecter depuis (transition)</label>
                    <select
                      id="pf-link-from"
                      value={form.linkFromStepId ?? ''}
                      onChange={(e) => set('linkFromStepId', e.target.value || null)}
                    >
                      <option value="">— Sans transition auto —</option>
                      {[...steps]
                        .sort((a, b) => a.sortOrder - b.sortOrder)
                        .map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name}
                          </option>
                        ))}
                    </select>
                    <p className="pf-field-hint">
                      La nouvelle étape apparaîtra aussi dans le tableau Transitions.
                    </p>
                  </div>
                  {form.linkFromStepId ? (
                    <div className="pf-field" style={{ gridColumn: '1 / -1' }}>
                      <label>Mode de transition</label>
                      <div className="pf-chip-row">
                        <button
                          type="button"
                          className={`pf-chip${form.transitionMode === 'manual' ? ' is-active' : ''}`}
                          onClick={() => set('transitionMode', 'manual')}
                        >
                          ◷ Manuel
                        </button>
                        <button
                          type="button"
                          className={`pf-chip${form.transitionMode === 'auto' ? ' is-active' : ''}`}
                          onClick={() => set('transitionMode', 'auto')}
                        >
                          ⚡ Automatique
                        </button>
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : null}

              <div className="pf-config-grid">
                <div className="pf-field">
                  <label htmlFor="pf-cmd-status">Statut commande lié</label>
                  <select
                    id="pf-cmd-status"
                    value={form.commandeStatut ?? ''}
                    onChange={(e) => set('commandeStatut', e.target.value || null)}
                  >
                    <option value="">— Aucun —</option>
                    {COMMANDE_STATUTS.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
                <div className="pf-field">
                  <label htmlFor="pf-task-type">Type tâche</label>
                  <select
                    id="pf-task-type"
                    value={form.taskType ?? ''}
                    onChange={(e) => set('taskType', e.target.value || null)}
                  >
                    <option value="">— Aucun —</option>
                    {TASK_TYPES.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
                <div className="pf-field" style={{ gridColumn: '1 / -1' }}>
                  <label htmlFor="pf-planning">Ressource planning</label>
                  <input
                    id="pf-planning"
                    value={form.planningResource ?? ''}
                    onChange={(e) => set('planningResource', e.target.value || null)}
                    placeholder="machine, graphiste…"
                  />
                </div>
                <div className="pf-field" style={{ gridColumn: '1 / -1' }}>
                  <label>Modules liés</label>
                  <div className="pf-chip-row">
                    {FLUX_STEP_MODULES.map((m) => {
                      const active = form.linkedModules.includes(m);
                      return (
                        <button
                          key={m}
                          type="button"
                          className={`pf-chip${active ? ' is-active' : ''}`}
                          aria-pressed={active}
                          onClick={() => toggleModule(m)}
                        >
                          {m}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          ) : null}

          {section === 'options' ? (
            <div className="pf-step-modal-section">
              <div className="pf-option-cards">
                {OPTION_TOGGLES.map((opt) => {
                  const on = Boolean(form[opt.key]);
                  return (
                    <button
                      key={opt.key}
                      type="button"
                      className={`pf-option-card${on ? ' is-on' : ''}`}
                      aria-pressed={on}
                      onClick={() => set(opt.key, !on as never)}
                    >
                      <span className="pf-option-card-top">
                        <strong>{opt.label}</strong>
                        <span className={`pf-switch${on ? ' is-on' : ''}`} aria-hidden>
                          <i />
                        </span>
                      </span>
                      <em>{opt.hint}</em>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}
        </div>

        <footer className="pf-modal-footer pf-step-modal-footer">
          {isEdit && onDelete && initial ? (
            <button
              type="button"
              className="pf-btn-ghost pf-btn-danger"
              style={{ marginRight: 'auto' }}
              disabled={saving}
              onClick={() => onDelete(initial)}
            >
              Supprimer
            </button>
          ) : null}
          <button type="button" className="pf-btn-ghost" onClick={onClose} disabled={saving}>
            Annuler
          </button>
          <button
            type="button"
            className="pf-btn-ghost"
            disabled={saving || !canSubmit}
            onClick={() => submit('draft')}
          >
            Brouillon
          </button>
          <button
            type="button"
            className="pf-btn-primary"
            disabled={saving || !canSubmit}
            onClick={() => submit('active')}
          >
            {saving ? 'Enregistrement…' : isEdit ? 'Enregistrer' : 'Ajouter à la chaîne'}
          </button>
        </footer>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}
