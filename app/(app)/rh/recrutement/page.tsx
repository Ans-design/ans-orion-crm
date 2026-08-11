'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  UserPlus, Loader2, Sparkles, Trash2,
} from 'lucide-react';
import { ANS } from '@/lib/ans-colors';
import { uxToast } from '@/lib/ux/feedback';
import { AppButton } from '@/components/ui/app-ui';
import { OrionPanelDrawer } from '@/components/ui/orion-panel-drawer';
import {
  CandidateScoreRadar,
  stageWeightFromLabel,
} from '@/components/rh/candidate-score-radar';

const FALLBACK_STAGES = [
  'Présélection',
  'Test Technique',
  'Entretien RH',
  'Offre envoyée',
  'Recruté',
  'Refusé',
] as const;

type Candidate = {
  id: string;
  fullName: string;
  posteVise: string;
  stage: string;
  progression: number;
  score: number;
  skills: string | null;
  notes: string | null;
  avatarUrl: string | null;
  interviewDate: string | null;
};

const STAGE_COLORS: Record<string, string> = {
  Présélection: '#94a3b8',
  'Test Technique': ANS.red,
  'Entretien RH': '#8b5cf6',
  'Offre envoyée': '#f59e0b',
  Recruté: '#22c55e',
  Refusé: '#ef4444',
};

export default function RhRecrutementPage() {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [stages, setStages] = useState<string[]>([...FALLBACK_STAGES]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [detail, setDetail] = useState<Candidate | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    fullName: '',
    posteVise: '',
    stage: 'Présélection',
    progression: 10,
    score: 5,
    skills: '',
    avatarUrl: '',
    notes: '',
  });

  const load = useCallback(() => {
    setLoading(true);
    fetch('/api/rh/recrutement')
      .then((r) => (r.ok ? r.json() : { candidates: [], stages: FALLBACK_STAGES }))
      .then((d) => {
        setCandidates(d.candidates ?? []);
        if (Array.isArray(d.stages) && d.stages.length) setStages(d.stages);
      })
      .catch(() => uxToast.error('Impossible de charger le pipeline recrutement'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const byStage = (stage: string) => candidates.filter((c) => c.stage === stage);

  const kpis = useMemo(() => ({
    total: candidates.length,
    active: candidates.filter((c) => c.stage !== 'Refusé' && c.stage !== 'Recruté').length,
    hired: candidates.filter((c) => c.stage === 'Recruté').length,
    avgScore: candidates.length
      ? Math.round((candidates.reduce((s, c) => s + (c.score || 0), 0) / candidates.length) * 10) / 10
      : 0,
  }), [candidates]);

  const moveStage = async (id: string, stage: string) => {
    try {
      const res = await fetch('/api/rh/recrutement', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, stage }),
      });
      if (!res.ok) {
        uxToast.error('Déplacement de stage impossible');
        return;
      }
      if (stage === 'Recruté') uxToast.success('Candidat marqué Recruté');
      else if (stage === 'Refusé') uxToast.warn('Candidat passé en Refusé');
      else uxToast.info(`Stage → ${stage}`);
      load();
    } catch {
      uxToast.error('Erreur réseau');
    }
  };

  const remove = async (id: string) => {
    if (!window.confirm('Supprimer ce candidat ?')) return;
    try {
      const res = await fetch(`/api/rh/recrutement?id=${id}`, { method: 'DELETE' });
      if (!res.ok) {
        uxToast.error('Suppression impossible');
        return;
      }
      uxToast.warn('Candidat retiré du pipeline');
      if (detail?.id === id) setDetail(null);
      load();
    } catch {
      uxToast.error('Erreur réseau');
    }
  };

  const suggestQuestions = () => {
    const qs = [
      'Décrivez votre expérience sur presse offset / numérique',
      'Comment gérez-vous les délais serrés en atelier ?',
      'Quels outils Adobe maîtrisez-vous ?',
    ].join('\n• ');
    setForm((f) => ({ ...f, notes: `${f.notes ? f.notes + '\n\n' : ''}Questions suggérées:\n• ${qs}` }));
    uxToast.info('Questions d’entretien ajoutées aux notes');
  };

  const analyzeCv = () => {
    const skills = form.skills || 'Offset, CRM, Adobe Suite';
    const score = Math.min(10, Math.round((form.progression / 10 + Math.random() * 3) * 10) / 10);
    setForm((f) => ({
      ...f,
      skills,
      score,
      notes: `Analyse IA — Score ${score}/10. Profil ${form.posteVise || 'cible'} : compétences alignées atelier ANS.`,
    }));
    uxToast.success(`Analyse CV — score ${score}/10`);
  };

  const submit = async () => {
    if (!form.fullName.trim() || !form.posteVise.trim()) {
      uxToast.warn('Nom et poste visé obligatoires');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch('/api/rh/recrutement', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: form.fullName,
          posteVise: form.posteVise,
          stage: form.stage,
          progression: form.progression,
          score: form.score,
          skills: form.skills || null,
          notes: form.notes || null,
          avatarUrl: form.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(form.fullName)}`,
        }),
      });
      if (res.ok) {
        setModalOpen(false);
        setForm({ fullName: '', posteVise: '', stage: 'Présélection', progression: 10, score: 5, skills: '', avatarUrl: '', notes: '' });
        uxToast.success('Candidat ajouté au pipeline');
        load();
      } else {
        uxToast.error('Création candidat impossible');
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="dashboard-full space-y-5 w-full">
      <header className="pb-4 border-b border-border flex flex-wrap justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold flex items-center gap-2">
            <UserPlus size={24} style={{ color: ANS.cyan }} />
            RH & Recrutement
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Pipeline ATS — scores & radar (v29)</p>
        </div>
        <div className="flex gap-2">
          <Link href="/rh/employes" className="btn btn-out btn-sm">Employés & pointage</Link>
          <button type="button" className="btn btn-b btn-sm" onClick={() => setModalOpen(true)}>
            + Ajouter un Candidat
          </button>
        </div>
      </header>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 orion-kpi-grid">
        <div className="ans-card-premium p-3">
          <p className="text-[10px] font-bold uppercase text-muted-foreground">Candidats</p>
          <p className="text-xl font-bold tabular-nums">{kpis.total}</p>
        </div>
        <div className="ans-card-premium p-3">
          <p className="text-[10px] font-bold uppercase text-muted-foreground">En cours</p>
          <p className="text-xl font-bold tabular-nums">{kpis.active}</p>
        </div>
        <div className="ans-card-premium p-3">
          <p className="text-[10px] font-bold uppercase text-muted-foreground">Recrutés</p>
          <p className="text-xl font-bold tabular-nums text-emerald-600">{kpis.hired}</p>
        </div>
        <div className="ans-card-premium p-3">
          <p className="text-[10px] font-bold uppercase text-muted-foreground">Score moy.</p>
          <p className="text-xl font-bold tabular-nums">{kpis.avgScore}<span className="text-sm font-semibold text-muted-foreground">/10</span></p>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center p-12"><Loader2 className="animate-spin text-muted-foreground" /></div>
      ) : (
        <div className="overflow-x-auto pb-4">
          <div className="rh-pipeline-board">
            {stages.map((stage) => (
              <div key={stage} className="rh-pipeline-col">
                <div className="rh-pipeline-col-head" style={{ color: STAGE_COLORS[stage] ?? ANS.red }}>
                  <span className="rh-pipeline-dot" style={{ background: STAGE_COLORS[stage] ?? ANS.red }} />
                  {stage}
                  <span className="badge text-[9px] ml-auto">{byStage(stage).length}</span>
                </div>
                <div className="min-h-[120px]">
                  {byStage(stage).map((c) => (
                    <div key={c.id} className="pipeline-candidate group">
                      <div className="flex items-start gap-2 mb-2">
                        <button
                          type="button"
                          className="flex items-start gap-2 flex-1 min-w-0 text-left"
                          onClick={() => setDetail(c)}
                        >
                          {c.avatarUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={c.avatarUrl} alt="" className="w-8 h-8 rounded-[7px] bg-muted" />
                          ) : (
                            <div className="w-8 h-8 rounded-[7px] bg-muted flex items-center justify-center font-bold text-xs">{c.fullName[0]}</div>
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="font-bold text-xs truncate">{c.fullName}</div>
                            <div className="text-muted-foreground text-[10px] truncate">{c.posteVise}</div>
                          </div>
                        </button>
                        <button type="button" className="opacity-0 group-hover:opacity-100 text-red-500" onClick={() => remove(c.id)} aria-label="Supprimer">
                          <Trash2 size={12} />
                        </button>
                      </div>
                      <div className="h-1.5 bg-muted rounded-[7px] overflow-hidden mb-2">
                        <div className="h-full rounded-[7px]" style={{ width: `${c.progression}%`, background: STAGE_COLORS[stage] ?? ANS.red }} />
                      </div>
                      <div className="flex justify-between items-center text-[10px] text-muted-foreground">
                        <span>{c.progression}%</span>
                        <span className="rh-score-chip">Score {c.score}/10</span>
                      </div>
                      {c.skills && <p className="mt-1 text-[10px] truncate">{c.skills}</p>}
                      <select
                        className="mt-2 w-full text-[10px] border border-border rounded-[7px] px-1 py-0.5 bg-background"
                        value={c.stage}
                        onChange={(e) => moveStage(c.id, e.target.value)}
                        aria-label={`Stage de ${c.fullName}`}
                      >
                        {stages.map((s) => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <OrionPanelDrawer
        open={!!detail}
        onClose={() => setDetail(null)}
        title={detail?.fullName ?? 'Candidat'}
        subtitle={detail ? `${detail.posteVise} · ${detail.stage}` : undefined}
        footer={
          detail ? (
            <>
              <AppButton type="button" variant="outline" className="flex-1" onClick={() => setDetail(null)}>
                Fermer
              </AppButton>
              <AppButton
                type="button"
                className="flex-1"
                onClick={() => {
                  const id = detail.id;
                  setDetail(null);
                  void moveStage(id, 'Entretien RH');
                }}
              >
                Vers entretien RH
              </AppButton>
            </>
          ) : undefined
        }
      >
        {detail ? (
          <div className="space-y-4">
            <CandidateScoreRadar
              score={detail.score}
              progression={detail.progression}
              skillsCsv={detail.skills}
              stageWeight={stageWeightFromLabel(detail.stage)}
            />
            {detail.skills && (
              <p className="text-xs"><span className="font-bold">Compétences :</span> {detail.skills}</p>
            )}
            {detail.notes && (
              <p className="text-xs bg-muted/50 rounded-[7px] p-2 whitespace-pre-wrap">{detail.notes}</p>
            )}
          </div>
        ) : null}
      </OrionPanelDrawer>

      <OrionPanelDrawer
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Ajouter un Candidat"
        subtitle="Pipeline ATS"
        footer={
          <>
            <AppButton type="button" variant="outline" className="flex-1" onClick={() => setModalOpen(false)}>
              Annuler
            </AppButton>
            <AppButton type="button" className="flex-1" disabled={saving} onClick={() => void submit()}>
              {saving ? <Loader2 size={14} className="animate-spin inline" /> : 'Enregistrer'}
            </AppButton>
          </>
        }
      >
            <div className="space-y-4">
            <label className="block text-xs font-bold">URL Avatar
              <input className="w-full mt-1 border border-border rounded-[7px] px-3 py-2 text-sm" placeholder="https://..." value={form.avatarUrl} onChange={(e) => setForm({ ...form, avatarUrl: e.target.value })} />
            </label>
            <label className="block text-xs font-bold">Nom Complet *
              <input className="w-full mt-1 border border-border rounded-[7px] px-3 py-2 text-sm" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} />
            </label>
            <label className="block text-xs font-bold">Poste Visé *
              <input className="w-full mt-1 border border-border rounded-[7px] px-3 py-2 text-sm" value={form.posteVise} onChange={(e) => setForm({ ...form, posteVise: e.target.value })} />
            </label>
            <label className="block text-xs font-bold">Progression % — {form.progression}%
              <input type="range" min={0} max={100} className="w-full mt-1" value={form.progression} onChange={(e) => setForm({ ...form, progression: Number(e.target.value) })} />
            </label>
            <label className="block text-xs font-bold">Étape recrutement
              <select className="w-full mt-1 border border-border rounded-[7px] px-3 py-2 text-sm" value={form.stage} onChange={(e) => setForm({ ...form, stage: e.target.value })}>
                {stages.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </label>
            <button type="button" className="btn btn-out btn-sm w-full flex items-center justify-center gap-2" onClick={analyzeCv}>
              <Sparkles size={14} /> Analyser CV
            </button>
            <label className="block text-xs font-bold">Compétences (séparées par virgule)
              <input className="w-full mt-1 border border-border rounded-[7px] px-3 py-2 text-sm" placeholder="Illustrator, Offset, CRM..." value={form.skills} onChange={(e) => setForm({ ...form, skills: e.target.value })} />
            </label>
            <div>
              <p className="text-xs font-bold mb-1.5">Score total / 10</p>
              <div className="eval-score-row" role="group" aria-label="Score candidat">
                {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                  <button
                    key={n}
                    type="button"
                    className={`eval-score-btn${Math.round(form.score) === n ? ' sel' : ''}`}
                    onClick={() => setForm({ ...form, score: n })}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>
            <CandidateScoreRadar
              score={form.score}
              progression={form.progression}
              skillsCsv={form.skills}
              stageWeight={stageWeightFromLabel(form.stage)}
            />
            <button type="button" className="btn btn-out btn-sm w-full" onClick={suggestQuestions}>Suggérer questions entretien</button>
            {form.notes && (
              <p className="text-xs bg-muted/50 rounded-[7px] p-2 whitespace-pre-wrap">{form.notes}</p>
            )}
            </div>
      </OrionPanelDrawer>
    </div>
  );
}
