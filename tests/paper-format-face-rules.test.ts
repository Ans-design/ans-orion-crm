import { describe, expect, it } from 'vitest';
import {
  DEFAULT_PAPER_FORMAT_RULES,
  computePaperFormatPrice,
  resolvePaperFormatForCustomSize,
} from '@/lib/pricing/paper-format-rules';
import {
  DEFAULT_SUPPORT_FACE_RULES,
  filterFaceOptionsForSupport,
  isRectoVersoAllowedForSupport,
} from '@/lib/pricing/support-face-rules';
import {
  DEFAULT_ISF_VOLUME_DISCOUNT_TIERS,
  volumeRemiseRateFromTiers,
} from '@/lib/pricing/published-volume-tiers';
import { impressionSfVolumeRemiseRate } from '@/lib/pricing/impression-sf-pricing';
import { volumeRemiseRate } from '@/lib/pricing/volume-remise';

describe('paper-format-rules', () => {
  it('A4=1000 → A5=500 (sans découpe), A6=300, A3=2000, A3+=2200', () => {
    const a4 = 1000;
    expect(computePaperFormatPrice(a4, 'A5').price).toBe(500);
    expect(computePaperFormatPrice(a4, 'A5').rule?.cutAr).toBe(0);
    expect(computePaperFormatPrice(a4, 'A6').price).toBe(300);
    expect(computePaperFormatPrice(a4, 'A3').price).toBe(2000);
    expect(computePaperFormatPrice(a4, 'A3+').price).toBe(2200);
  });

  it('custom 200×250 → A4 ; 300×440 → A3+', () => {
    const r1 = resolvePaperFormatForCustomSize(200, 250, DEFAULT_PAPER_FORMAT_RULES);
    expect(r1.formatUsed).toBe('A4');
    const r2 = resolvePaperFormatForCustomSize(300, 440, DEFAULT_PAPER_FORMAT_RULES);
    expect(r2.formatUsed).toBe('A3+');
  });

  it('orientation-free (250×200 = A4)', () => {
    const r = resolvePaperFormatForCustomSize(250, 200, DEFAULT_PAPER_FORMAT_RULES);
    expect(r.formatUsed).toBe('A4');
  });
});

describe('support-face-rules', () => {
  it('interdit recto-verso sur autocollant / PVC / sublimation', () => {
    expect(isRectoVersoAllowedForSupport('Papier autocollant', DEFAULT_SUPPORT_FACE_RULES)).toBe(false);
    expect(isRectoVersoAllowedForSupport('PVC translucide', DEFAULT_SUPPORT_FACE_RULES)).toBe(false);
    expect(isRectoVersoAllowedForSupport('Papier sublimation', DEFAULT_SUPPORT_FACE_RULES)).toBe(false);
    expect(isRectoVersoAllowedForSupport('Standard / Offset', DEFAULT_SUPPORT_FACE_RULES)).toBe(true);
  });

  it('filtre les options face', () => {
    const opts = ['Recto', 'Verso', 'Recto-verso'];
    const filtered = filterFaceOptionsForSupport('Adestor', opts, DEFAULT_SUPPORT_FACE_RULES);
    expect(filtered).toEqual(['Recto']);
  });
});

describe('published-volume-tiers', () => {
  it('unifie remises ISF sous DiscountTier (discountPercent)', () => {
    expect(volumeRemiseRateFromTiers(1, DEFAULT_ISF_VOLUME_DISCOUNT_TIERS)).toBe(0);
    expect(volumeRemiseRateFromTiers(10, DEFAULT_ISF_VOLUME_DISCOUNT_TIERS)).toBe(0.1);
    expect(volumeRemiseRateFromTiers(40, DEFAULT_ISF_VOLUME_DISCOUNT_TIERS)).toBe(0.18);
    expect(volumeRemiseRateFromTiers(130, DEFAULT_ISF_VOLUME_DISCOUNT_TIERS)).toBe(0.33);
  });

  it('impressionSfVolumeRemiseRate lit les paliers publiés (runtime)', () => {
    expect(impressionSfVolumeRemiseRate(10)).toBe(0.1);
  });

  it('volumeRemiseRate générique lit paliers publiés', () => {
    expect(volumeRemiseRate(100)).toBe(0.05);
    expect(volumeRemiseRate(1000)).toBe(0.15);
  });
});
