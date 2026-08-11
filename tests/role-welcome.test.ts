import { describe, expect, it } from 'vitest';
import { buildRoleWelcome } from '@/lib/cockpit/role-welcome';

describe('role-welcome', () => {
  it('message commercial avec devis en attente', () => {
    const w = buildRoleWelcome({ role: 'commercial', userName: 'Jean Dupont', devisEnAttente: 8 });
    expect(w.greeting).toContain('Jean');
    expect(w.message).toContain('8 devis');
    expect(w.shortcuts.some((s) => s.href === '/devis')).toBe(true);
  });

  it('message graphiste avec BAT', () => {
    const w = buildRoleWelcome({ role: 'designer', batEnAttente: 3 });
    expect(w.message).toContain('3 BAT');
  });

  it('message direction admin', () => {
    const w = buildRoleWelcome({ role: 'admin', userName: 'Admin' });
    expect(w.message).toContain('CA du jour');
  });
});
