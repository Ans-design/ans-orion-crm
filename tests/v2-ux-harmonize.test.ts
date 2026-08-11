import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();

describe('Vague E — UX harmonisation', () => {
  it('SearchInput debounce défaut 250 ms', () => {
    const src = readFileSync(join(root, 'components/ui/search-input.tsx'), 'utf8');
    expect(src).toMatch(/debounceMs = 250/);
  });

  it('Tailwind radius fallback = 7px (design system maître)', () => {
    const src = readFileSync(join(root, 'tailwind.config.ts'), 'utf8');
    expect(src).toMatch(/--radius-ui, 7px/);
    expect(src).not.toMatch(/--radius-ui, 12px/);
    expect(src).not.toMatch(/--radius-ui, 10px/);
  });

  it('ANS Talk badge ouvre /messagerie (pas mini-panel)', () => {
    const src = readFileSync(join(root, 'components/ans-talk/floating-messenger-bubble.tsx'), 'utf8');
    expect(src).toMatch(/router\.push\('\/messagerie'\)/);
    expect(src).not.toMatch(/talk-floating-panel/);
  });

  it('BAT et CQ ont FlowPageBanner', () => {
    expect(readFileSync(join(root, 'app/(app)/bat/page.tsx'), 'utf8')).toMatch(/FlowPageBanner/);
    expect(readFileSync(join(root, 'app/(app)/production/qualite/page.tsx'), 'utf8')).toMatch(/FlowPageBanner/);
  });
});
