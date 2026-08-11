'use client';

import { useEffect, useState } from 'react';
import { Loader2, Timer, AlertTriangle, Save, Play, Pause, CheckCircle2, Paperclip, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { ANS } from '@/lib/ans-colors';
import {
  TASK_PRIORITIES, TASK_STATUSES, TASK_TYPE_LABELS, type TaskType,
} from '@/lib/constants/metier-task';
import {
  checklistProgress,
  parseTaskChecklist,
  parseTaskComments,
  type MetierTaskCheckItem,
  type MetierTaskComment,
} from '@/lib/metier/task-checklist';
import { formatFileSize } from '@/lib/constants/file-assets';

type TaskFile = {
  id: string;
  name: string;
  mimeType: string;
  sizeBytes: number;
  uploadedBy: string | null;
  createdAt: string;
};

export type TaskDetail = {
  id: string;
  title: string;
  description: string | null;
  type: string;
  status: string;
  priorite: string;
  elapsedSec: number;
  timerStatus: string;
  timerStartedAt: string | null;
  estimatedMin: number | null;
  problemNote: string | null;
  checklist?: unknown;
  comments?: unknown;
  assigneeName: string | null;
  commande: { id: string; numero: string; article: string } | null;
};

type Props = {
  taskId: string | null;
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  onTimerAction?: (
    taskId: string,
    action: string,
    problemNote?: string,
    evaluation?: { quality: number; delay: number; comment?: string; problemEncountered?: string },
  ) => Promise<void>;
  liveElapsed?: number;
};

export function TaskDetailModal({ taskId, open, onClose, onSaved, onTimerAction, liveElapsed = 0 }: Props) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [task, setTask] = useState<TaskDetail | null>(null);
  const [form, setForm] = useState({ title: '', description: '', status: '', priorite: '', estimatedMin: '', assigneeName: '' });
  const [problemNote, setProblemNote] = useState('');
  const [showProblem, setShowProblem] = useState(false);
  const [checklist, setChecklist] = useState<MetierTaskCheckItem[]>([]);
  const [comments, setComments] = useState<MetierTaskComment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [files, setFiles] = useState<TaskFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [showEvaluation, setShowEvaluation] = useState(false);
  const [evalForm, setEvalForm] = useState({ quality: 4, delay: 4, comment: '', problemEncountered: '' });
  const [finishing, setFinishing] = useState(false);

  useEffect(() => {
    if (!open || !taskId) return;
    setLoading(true);
    Promise.all([
      fetch(`/api/equipe/taches`).then((r) => (r.ok ? r.json() : [])),
      fetch(`/api/equipe/taches/${taskId}/fichiers`).then((r) => (r.ok ? r.json() : [])),
    ])
      .then(([list, taskFiles]: [TaskDetail[], TaskFile[]]) => {
        const t = list.find((x) => x.id === taskId) ?? null;
        setTask(t);
        setFiles(taskFiles);
        if (t) {
          setForm({
            title: t.title,
            description: t.description ?? '',
            status: t.status,
            priorite: t.priorite,
            estimatedMin: t.estimatedMin ? String(t.estimatedMin) : '',
            assigneeName: t.assigneeName ?? '',
          });
          setProblemNote(t.problemNote ?? '');
          setChecklist(parseTaskChecklist(t.checklist));
          setComments(parseTaskComments(t.comments));
        }
      })
      .finally(() => setLoading(false));
  }, [open, taskId]);

  const uploadFile = async (file: File) => {
    if (!taskId) return;
    setUploading(true);
    try {
      const form = new FormData();
      form.append('file', file);
      form.append('category', 'tache');
      const res = await fetch(`/api/equipe/taches/${taskId}/fichiers`, { method: 'POST', body: form });
      if (res.ok) {
        const asset = await res.json();
        setFiles((prev) => [asset, ...prev]);
      }
    } finally {
      setUploading(false);
    }
  };

  const finishWithEvaluation = async () => {
    if (!taskId || !onTimerAction) return;
    setFinishing(true);
    try {
      await onTimerAction(taskId, 'finish', undefined, {
        quality: evalForm.quality,
        delay: evalForm.delay,
        comment: evalForm.comment || undefined,
        problemEncountered: evalForm.problemEncountered || undefined,
      });
      setShowEvaluation(false);
      onSaved();
      onClose();
    } finally {
      setFinishing(false);
    }
  };

  const save = async () => {
    if (!taskId) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/equipe/taches/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: form.title,
          description: form.description || null,
          status: form.status,
          priorite: form.priorite,
          estimatedMin: form.estimatedMin ? Number(form.estimatedMin) : null,
          assigneeName: form.assigneeName || null,
          problemNote: problemNote || null,
          checklist,
          comments,
          ...(newComment.trim() ? { addComment: newComment.trim() } : {}),
        }),
      });
      if (res.ok) { onSaved(); onClose(); }
    } finally {
      setSaving(false);
    }
  };

  const isClosed = task && ['Terminée', 'Annulée'].includes(task.status);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Timer size={18} style={{ color: ANS.orange }} />
            Détail tâche production
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center py-8"><Loader2 className="animate-spin" /></div>
        ) : task ? (
          <div className="space-y-4 text-sm">
            <div className="flex flex-wrap gap-2 text-[10px] font-bold uppercase">
              <span className="px-2 py-0.5 rounded" style={{ background: `${ANS.cyan}22`, color: ANS.cyan }}>
                {TASK_TYPE_LABELS[task.type as TaskType] ?? task.type}
              </span>
              <span className="px-2 py-0.5 rounded bg-muted text-muted-foreground">{task.status}</span>
            </div>

            {task.commande && (
              <p className="text-xs font-semibold" style={{ color: ANS.cyan }}>
                CMD {task.commande.numero} — {task.commande.article}
              </p>
            )}

            <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 font-mono text-lg font-bold" style={{ color: ANS.orange }}>
              <Timer size={18} />
              {Math.floor(liveElapsed / 3600) > 0
                ? `${Math.floor(liveElapsed / 3600)}h ${String(Math.floor((liveElapsed % 3600) / 60)).padStart(2, '0')}m`
                : `${String(Math.floor(liveElapsed / 60)).padStart(2, '0')}:${String(liveElapsed % 60).padStart(2, '0')}`}
              {task.estimatedMin && (
                <span className="text-xs font-normal text-muted-foreground ml-auto">Prévu {task.estimatedMin} min</span>
              )}
            </div>

            <label className="block text-xs font-bold">Intitulé
              <input className="fc mt-1" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </label>
            <label className="block text-xs font-bold">Description
              <textarea className="fc mt-1 min-h-[80px]" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="block text-xs font-bold">Statut
                <select className="fc mt-1" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                  {TASK_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </label>
              <label className="block text-xs font-bold">Priorité
                <select className="fc mt-1" value={form.priorite} onChange={(e) => setForm({ ...form, priorite: e.target.value })}>
                  {TASK_PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              </label>
              <label className="block text-xs font-bold">Durée prévue (min)
                <input type="number" min={1} className="fc mt-1" value={form.estimatedMin} onChange={(e) => setForm({ ...form, estimatedMin: e.target.value })} />
              </label>
              <label className="block text-xs font-bold">Assigné à
                <input className="fc mt-1" value={form.assigneeName} onChange={(e) => setForm({ ...form, assigneeName: e.target.value })} placeholder="Nom opérateur" />
              </label>
            </div>

            {checklist.length > 0 && (
              <div className="rounded-lg border border-border p-3 space-y-2">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span>Checklist production</span>
                  <span style={{ color: ANS.cyan }}>{checklistProgress(checklist).pct}%</span>
                </div>
                {checklist.map((item) => (
                  <label key={item.id} className="flex items-center gap-2 text-xs cursor-pointer">
                    <input
                      type="checkbox"
                      checked={item.done}
                      onChange={(e) => setChecklist((prev) =>
                        prev.map((x) => x.id === item.id ? { ...x, done: e.target.checked } : x),
                      )}
                      className="rounded border-border"
                    />
                    <span className={item.done ? 'line-through text-muted-foreground' : ''}>{item.label}</span>
                  </label>
                ))}
              </div>
            )}

            {comments.length > 0 && (
              <div className="rounded-lg bg-muted/40 p-3 space-y-2 max-h-32 overflow-y-auto">
                <p className="text-xs font-bold">Commentaires</p>
                {comments.map((c) => (
                  <div key={c.id} className="text-xs">
                    <span className="font-semibold">{c.author}</span>
                    <span className="text-muted-foreground ml-1">{new Date(c.at).toLocaleString('fr-FR')}</span>
                    <p className="text-muted-foreground mt-0.5">{c.body}</p>
                  </div>
                ))}
              </div>
            )}
            <label className="block text-xs font-bold">Ajouter un commentaire
              <input
                className="fc mt-1"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Note d'avancement…"
              />
            </label>

            <div className="rounded-lg border border-border p-3 space-y-2">
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="flex items-center gap-1"><Paperclip size={12} /> Pièces jointes</span>
                <label className="cursor-pointer text-[10px] font-semibold" style={{ color: ANS.cyan }}>
                  {uploading ? 'Envoi…' : '+ Ajouter'}
                  <input
                    type="file"
                    className="hidden"
                    disabled={uploading}
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) uploadFile(f);
                      e.target.value = '';
                    }}
                  />
                </label>
              </div>
              {files.length === 0 ? (
                <p className="text-[10px] text-muted-foreground">Aucun fichier attaché</p>
              ) : (
                files.map((f) => (
                  <a
                    key={f.id}
                    href={`/api/files/${f.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-xs hover:underline"
                    style={{ color: ANS.cyan }}
                  >
                    <Download size={12} />
                    <span className="truncate flex-1">{f.name}</span>
                    <span className="text-muted-foreground shrink-0">{formatFileSize(f.sizeBytes)}</span>
                  </a>
                ))
              )}
            </div>

            {(problemNote || showProblem) && (
              <label className="block text-xs font-bold text-red-600">
                <AlertTriangle size={12} className="inline mr-1" />
                Note problème
                <textarea className="fc mt-1 min-h-[50px] border-red-500/30" value={problemNote} onChange={(e) => setProblemNote(e.target.value)} />
              </label>
            )}

            {showEvaluation && (
              <div className="rounded-lg border border-border p-3 space-y-3 bg-muted/30">
                <p className="text-xs font-bold">Évaluation de la tâche</p>
                <div className="grid grid-cols-2 gap-3">
                  <label className="text-xs font-semibold">Qualité (1-5)
                    <input type="range" min={1} max={5} value={evalForm.quality} onChange={(e) => setEvalForm({ ...evalForm, quality: Number(e.target.value) })} className="w-full" />
                    <span className="text-muted-foreground">{evalForm.quality}/5</span>
                  </label>
                  <label className="text-xs font-semibold">Respect délai (1-5)
                    <input type="range" min={1} max={5} value={evalForm.delay} onChange={(e) => setEvalForm({ ...evalForm, delay: Number(e.target.value) })} className="w-full" />
                    <span className="text-muted-foreground">{evalForm.delay}/5</span>
                  </label>
                </div>
                <label className="block text-xs font-bold">Commentaire
                  <input className="fc mt-1" value={evalForm.comment} onChange={(e) => setEvalForm({ ...evalForm, comment: e.target.value })} placeholder="Réussite, progrès…" />
                </label>
                <label className="block text-xs font-bold">Problème rencontré (optionnel)
                  <input className="fc mt-1" value={evalForm.problemEncountered} onChange={(e) => setEvalForm({ ...evalForm, problemEncountered: e.target.value })} />
                </label>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => setShowEvaluation(false)}>Annuler</Button>
                  <Button size="sm" className="ans-btn-primary gap-1" disabled={finishing} onClick={finishWithEvaluation}>
                    <CheckCircle2 size={14} /> Valider et terminer
                  </Button>
                </div>
              </div>
            )}

            {!isClosed && onTimerAction && taskId && !showEvaluation && (
              <div className="flex flex-wrap gap-2 pt-2 border-t border-border">
                {task.timerStatus === 'idle' && task.status !== 'Bloquée' && (
                  <Button size="sm" className="ans-btn-primary gap-1" onClick={() => onTimerAction(taskId, 'start')}>
                    <Play size={14} /> Démarrer
                  </Button>
                )}
                {task.timerStatus === 'running' && (
                  <>
                    <Button size="sm" variant="outline" className="gap-1" onClick={() => onTimerAction(taskId, 'pause')}>
                      <Pause size={14} /> Pause
                    </Button>
                    <Button size="sm" className="gap-1 btn-task-done" style={{ background: '#27ae60', color: '#fff' }} onClick={() => setShowEvaluation(true)}>
                      <CheckCircle2 size={14} /> Finie
                    </Button>
                  </>
                )}
                {(task.timerStatus === 'paused' || task.status === 'En pause') && (
                  <>
                    <Button size="sm" className="ans-btn-primary gap-1" onClick={() => onTimerAction(taskId, 'resume')}>
                      <Play size={14} /> Reprendre
                    </Button>
                    <Button size="sm" className="gap-1 btn-task-done" style={{ background: '#27ae60', color: '#fff' }} onClick={() => setShowEvaluation(true)}>
                      <CheckCircle2 size={14} /> Finie
                    </Button>
                  </>
                )}
                {task.status !== 'Bloquée' && (
                  <Button size="sm" variant="outline" className="gap-1 text-red-600" onClick={() => setShowProblem(true)}>
                    <AlertTriangle size={14} /> Signaler problème
                  </Button>
                )}
                {showProblem && (
                  <Button size="sm" variant="destructive" className="gap-1" onClick={() => {
                    if (problemNote.trim()) onTimerAction(taskId, 'problem', problemNote);
                  }}>
                    Bloquer la tâche
                  </Button>
                )}
              </div>
            )}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Tâche introuvable</p>
        )}

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>Fermer</Button>
          <Button className="ans-btn-primary gap-1" disabled={saving || loading} onClick={save}>
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            Enregistrer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
