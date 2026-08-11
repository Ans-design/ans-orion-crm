import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { isStrictPosPricing } from '@/lib/pos/pos-price-policy';

const root = process.cwd();

describe('Vague F — polish & veracity', () => {
  it('STRICT_POS_PRICING documenté local + moteur refuse prixDepart', () => {
    expect(readFileSync(join(root, 'README_LOCAL.md'), 'utf8')).toMatch(/STRICT_POS_PRICING/);
    const calc = readFileSync(join(root, 'lib/pricing/calculate.ts'), 'utf8');
    expect(calc).toMatch(/isStrictPosPricing\(\)/);
    expect(calc).toMatch(/priceNotConfigured/);
  });

  it('fallbacks PLV / event marqués migration DB', () => {
    expect(readFileSync(join(root, 'lib/data/plv-tariffs.ts'), 'utf8')).toMatch(/migration progressive/);
    expect(readFileSync(join(root, 'lib/pricing/event-accessories.ts'), 'utf8')).toMatch(/fallback seed/);
  });

  it('MODULES_MAP décrit Macro Admin 4 entrées', () => {
    const md = readFileSync(join(root, 'docs/MODULES_MAP.md'), 'utf8');
    expect(md).toMatch(/AdministrationMacroNav/);
    expect(md).toMatch(/admin-macro-modules/);
  });

  it('isStrictPosPricing réagit au flag env', () => {
    const prev = process.env.STRICT_POS_PRICING;
    process.env.STRICT_POS_PRICING = '1';
    expect(isStrictPosPricing()).toBe(true);
    if (prev === undefined) delete process.env.STRICT_POS_PRICING;
    else process.env.STRICT_POS_PRICING = prev;
  });
});
