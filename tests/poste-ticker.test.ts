import { describe, expect, it } from 'vitest';
import {
  formatBroadcastTickerLabel,
  formatPosteTickerAlert,
  posteStudioHref,
  rankPosteTickerTask,
} from '@/lib/metier/poste-ticker';

describe('bandeau Live poste', () => {
  it('route chaque type de tâche vers le studio du poste', () => {
    expect(posteStudioHref('graphisme')).toBe('/workspace/studio');
    expect(posteStudioHref('production', 'conducteur')).toBe('/workspace/conducteur');
    expect(posteStudioHref('finition')).toBe('/workspace/faconnage');
    expect(posteStudioHref('logistique')).toBe('/workspace/logistique');
    expect(posteStudioHref('commercial')).toBe('/workspace/commercial');
  });

  it('préfixe Moi pour une tâche du graphiste', () => {
    const a = formatPosteTickerAlert({
      id: 't1',
      title: 'Conception affiche',
      type: 'graphisme',
      status: 'À faire',
      dueDate: new Date(),
      commande: { numero: 'CMD-12', article: 'Kakemono' },
    });
    expect(a.type).toBe('task-mine');
    expect(a.href).toBe('/workspace/studio');
    expect(a.label).toContain('Moi ·');
    expect(a.label).toContain('À faire');
    expect(a.label).toContain('CMD-12');
  });

  it('signale pause, retard et bloquée', () => {
    const pause = formatPosteTickerAlert({
      id: 'p',
      title: 'Prépa fichier',
      type: 'graphisme',
      status: 'En pause',
      timerStatus: 'paused',
    });
    expect(pause.severity).toBe('warn');
    expect(pause.label).toContain('Pause');

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const late = formatPosteTickerAlert({
      id: 'l',
      title: 'BAT',
      type: 'graphisme',
      status: 'À faire',
      dueDate: yesterday,
    });
    expect(late.severity).toBe('critical');
    expect(late.label).toContain('Retard');

    const blocked = formatPosteTickerAlert({
      id: 'b',
      title: 'Impression',
      type: 'production',
      status: 'Bloquée',
    });
    expect(blocked.severity).toBe('critical');
    expect(rankPosteTickerTask(blocked as never) >= 0).toBe(true);
    expect(rankPosteTickerTask({ id: 'b', title: 'x', type: 'production', status: 'Bloquée' })).toBe(0);
  });

  it('marque les messages équipe comme Tous', () => {
    expect(formatBroadcastTickerLabel("ℹ Réunion d'équipe")).toBe("Tous · ℹ Réunion d'équipe");
    expect(formatBroadcastTickerLabel('Tous · Déjà préfixé')).toBe('Tous · Déjà préfixé');
  });
});
