import { describe, expect, it } from 'vitest';
import { ORION_COLORS, ORION_RADIUS, ORION_Z } from '@/lib/design/tokens';
import { getStatusMeta } from '@/lib/design/status-meta';

describe('design tokens', () => {
  it('expose la palette ANS officielle', () => {
    expect(ORION_COLORS.red500).toBe('#FF174D');
    expect(ORION_COLORS.pink500).toBe('#FF174D');
    expect(ORION_COLORS.gold500).toBe('#FACC15');
    expect(ORION_RADIUS.DEFAULT).toMatch(/^\d+px$/);
  });

  it('V11: info ≠ brand et rayons sémantiques', () => {
    expect(ORION_COLORS.info).toBe('#2563EB');
    expect(ORION_COLORS.info).not.toBe(ORION_COLORS.red500);
    expect(ORION_RADIUS.control).toBe('8px');
    expect(ORION_RADIUS.card).toBe('12px');
    expect(ORION_RADIUS.overlay).toBe('16px');
  });

  it('définit les couches z-index chat', () => {
    expect(ORION_Z.talkPanel).toBeGreaterThan(ORION_Z.modal);
    expect(ORION_Z.talkBubble).toBeGreaterThan(ORION_Z.toast);
  });
});

describe('status meta', () => {
  it('fournit une description pour les statuts commande', () => {
    const m = getStatusMeta('En production');
    expect(m.label).toBe('En production');
    expect(m.description.length).toBeGreaterThan(10);
  });

  it('fallback sur statut inconnu', () => {
    const m = getStatusMeta('StatutCustom');
    expect(m.label).toBe('StatutCustom');
  });
});
