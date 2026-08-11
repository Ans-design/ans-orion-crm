import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = join(process.cwd());

describe('tokens accessibilité & design system', () => {
  it('design-tokens.css — statuts sémantiques et palette chart', () => {
    const css = readFileSync(join(root, 'styles/design-tokens.css'), 'utf8');
    expect(css).toContain('--status-success');
    expect(css).toContain('--status-warning');
    expect(css).toContain('--status-error');
    expect(css).toContain('--status-info');
    expect(css).toContain('--chart-1');
    expect(css).toContain('--chart-5');
  });

  it('globals.css — radius scale unifié 7px', () => {
    const css = readFileSync(join(root, 'app/globals.css'), 'utf8');
    expect(css).toMatch(/--orion-radius:\s*7px/);
    expect(css).toMatch(/--muted-foreground:/);
  });

  it('design-tokens.css — info ≠ brand + radius unifié 7px', () => {
    const tokens = readFileSync(join(root, 'styles/design-tokens.css'), 'utf8');
    expect(tokens).toMatch(/--info:\s*#2563EB/);
    expect(tokens).toMatch(/--radius-control:\s*7px/);
    expect(tokens).toMatch(/--radius-card:\s*7px/);
    expect(tokens).toMatch(/--orion-radius:\s*7px/);
  });

  it('radius-unify.css — couche finale 7px', () => {
    const css = readFileSync(join(root, 'styles/radius-unify.css'), 'utf8');
    expect(css).toMatch(/--orion-radius:\s*7px/);
    expect(css).toMatch(/--sb-shell-radius:\s*7px/);
  });

  it('orion-ui-ux-complete.css — spacing + focus a11y', () => {
    const css = readFileSync(join(root, 'styles/orion-ui-ux-complete.css'), 'utf8');
    expect(css).toContain('--space-4');
    expect(css).toContain('--touch-min: 44px');
    expect(css).toContain(':focus-visible');
    expect(css).toMatch(/--radius-ui:\s*\d+px/);
  });

  it('chart-widgets — palette chart-theme hex (Recharts SVG)', () => {
    const src = readFileSync(join(root, 'components/dashboard/chart-widgets.tsx'), 'utf8');
    expect(src).toContain('@/lib/dashboard/chart-theme');
    expect(src).toContain('CHART_SERIES');
    expect(src).not.toContain("var(--chart-1)");
  });
});
