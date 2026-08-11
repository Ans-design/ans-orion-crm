import { describe, expect, it } from 'vitest';

describe('resolve-assignee-from-role aliases', () => {
  it('maps task roles to known auth roles', async () => {
    const { TASK_TYPE_ROLES } = await import('@/lib/constants/metier-task');
    expect(TASK_TYPE_ROLES.production).toBe('production');
    expect(TASK_TYPE_ROLES.graphisme).toBe('designer');
    expect(TASK_TYPE_ROLES.logistique).toBe('livraison');
  });
});
