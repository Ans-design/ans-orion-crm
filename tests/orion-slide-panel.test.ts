import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('orion slide panel v29', () => {
  it('defaults OrionPanelDrawer to 440px width', () => {
    const src = readFileSync(
      join(process.cwd(), 'components/ui/orion-panel-drawer.tsx'),
      'utf8',
    );
    expect(src).toContain("widthClass = 'w-full max-w-[440px]'");
    expect(src).toContain('orion-sp-overlay');
    expect(src).toContain('orion-sp');
  });

  it('Sheet right side uses 440px', () => {
    const src = readFileSync(join(process.cwd(), 'components/ui/sheet.tsx'), 'utf8');
    expect(src).toContain('sm:max-w-[440px]');
    expect(src).toContain('orion-sheet-sp');
  });
});
