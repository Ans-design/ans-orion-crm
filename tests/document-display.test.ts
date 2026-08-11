import { describe, expect, it, afterEach, vi } from 'vitest';
import { formatAmountInWordsAr } from '@/lib/documents/amount-in-words-fr';
import {
  inferTvaRatePercent,
  sanitizeDisplayLine,
  sanitizeDisplayLines,
  sanitizeDisplayText,
  validateCommercialLine,
} from '@/lib/documents/display-sanitize';
import {
  isDemoLoginFeaturesEnabled,
  isV29MatriculeAuthEnabled,
  isV29PasswordHintEnabled,
} from '@/lib/auth-environment';
import { renderDevisHtml, renderFactureHtml, renderProformaHtml } from '@/lib/services/DocumentService';

describe('display-sanitize', () => {
  it('supprime undefined, invalide et valeurs vides', () => {
    expect(sanitizeDisplayText('undefined')).toBeNull();
    expect(sanitizeDisplayText('invalide')).toBeNull();
    expect(sanitizeDisplayText('  ')).toBeNull();
    expect(sanitizeDisplayText('Recto-verso')).toBe('Recto-verso');
    expect(sanitizeDisplayText('recto-veso')).toBe('Recto-verso');
  });

  it('nettoie les lignes label:valeur', () => {
    const lines = sanitizeDisplayLines([
      'Format : A4',
      'Pages : 0',
      'Finition : undefined',
      'Finition : Pelliculage',
      'Format : A4',
    ]);
    expect(lines).toEqual(['Format : A4', 'Finition : Pelliculage']);
  });

  it('valide quantité et montant ligne', () => {
    expect(validateCommercialLine({ label: 'Flyer', quantity: 100, totalLigne: 50000 })).toEqual([]);
    expect(validateCommercialLine({ label: 'undefined', quantity: 0, totalLigne: 0 }).length).toBeGreaterThan(0);
  });

  it('déduit le taux TVA', () => {
    expect(inferTvaRatePercent(100000, 120000)).toBe(20);
    expect(inferTvaRatePercent(0, 120000)).toBe(0);
  });

  it('sanitizeDisplayLine retourne null si valeur bloquée', () => {
    expect(sanitizeDisplayLine('Couleur : invalide')).toBeNull();
    expect(sanitizeDisplayLine('Couleur : Bleu')).toBe('Couleur : Bleu');
  });
});

describe('amount-in-words-fr', () => {
  it('convertit montants en ariary', () => {
    expect(formatAmountInWordsAr(0)).toBe('zéro ariary');
    expect(formatAmountInWordsAr(1)).toBe('un ariary');
    expect(formatAmountInWordsAr(125000)).toContain('ariary');
    expect(formatAmountInWordsAr(125000)).not.toContain('undefined');
  });
});

describe('DocumentService — HTML commercial', () => {
  const baseDevis = {
    numero: 'DEV-2026-001',
    statut: 'Envoyé',
    createdAt: new Date('2026-06-01'),
    validUntil: new Date('2026-07-01'),
    sousTotal: 100000,
    remise: 5000,
    totalHT: 95000,
    totalTTC: 114000,
    client: { name: 'Client Test', email: 'client@test.mg' },
    lignes: [
      {
        articleId: 'fly-std',
        articleLabel: 'Flyer',
        quantity: 500,
        unite: 'ex.',
        prixUnitaireAuto: 200,
        totalLigne: 100000,
        configSnapshot: { format: 'A6', face: 'Recto seul' },
      },
    ],
  };

  it('devis sans undefined ni invalide', () => {
    const html = renderDevisHtml({
      ...baseDevis,
      lignes: [
        {
          ...baseDevis.lignes[0],
          remarks: 'undefined',
        },
      ],
    });
    expect(html).not.toMatch(/\bundefined\b/i);
    expect(html).not.toMatch(/\binvalide\b/i);
    expect(html).toContain('Arrêté à :');
    expect(html).toContain('ariary');
    expect(html).toContain('Total TTC');
  });

  it('proforma avec titre adapté', () => {
    const html = renderProformaHtml(baseDevis);
    expect(html).toContain('PROFORMA');
    expect(html).toContain('proforma');
  });

  it('template preprinted masque en-tête société', () => {
    const html = renderDevisHtml(baseDevis, { template: 'preprinted' });
    expect(html).toContain('template-preprinted');
    expect(html).not.toContain('ans.designprint.annexe@gmail.com');
    expect(html).toContain('doc-footer--preprinted');
    expect(html).not.toMatch(/doc-footer(?!--preprinted)[\s\S]*NIF 5 007/);
  });

  it('facture intègre NIF STAT RCS et modalités de paiement', () => {
    const html = renderFactureHtml({
      numero: 'FAC-2026-001',
      statut: 'Émise',
      createdAt: new Date('2026-06-15'),
      echeance: new Date('2026-07-15'),
      sousTotal: 80000,
      remise: 0,
      tva: 20,
      totalHT: 80000,
      totalTTC: 96000,
      montantPaye: 0,
      reste: 96000,
      lignes: [{ description: 'Flyer A6', qty: 400, pu: 200, total: 80000 }],
      client: { name: 'Client Test' },
      commande: { id: 'cmd1', numero: 'CMD-2026-001', article: 'Flyer' },
      scanQrHtml: '<aside class="doc-qr"><img class="doc-qr__img" src="data:image/svg+xml;charset=utf-8,%3Csvg/%" alt="QR" /></aside>',
    });
    expect(html).toContain('5 007 757 659');
    expect(html).toContain('13135 11 2023 0 05107');
    expect(html).toContain('Antananarivo 2024 A 00838');
    expect(html).toContain('033 11 328 66');
    expect(html).toContain('00006 | 00001 | 00000840327 82');
    expect(html).toContain('A. Nambinintsoa Sarobidy');
    expect(html).toContain('A.N.S Design Print');
    expect(html).toContain('Responsable');
    expect(html).toMatch(/NIF[\s\S]*STAT[\s\S]*RCS/);
    expect(html).toContain('doc-qr');
  });

  it('facture avec lignes JSON et TTC en lettres', () => {
    const html = renderFactureHtml({
      numero: 'FAC-2026-001',
      statut: 'Émise',
      createdAt: new Date('2026-06-15'),
      echeance: new Date('2026-07-15'),
      sousTotal: 80000,
      remise: 0,
      tva: 20,
      totalHT: 80000,
      totalTTC: 96000,
      montantPaye: 48000,
      reste: 48000,
      lignes: [
        { description: 'Flyer A6', qty: 400, pu: 200, total: 80000 },
        { description: 'undefined', qty: 1, pu: 0, total: 0 },
      ],
      client: { name: 'Client Facture' },
      commande: { numero: 'CMD-001', article: 'Flyer' },
    });
    expect(html).not.toMatch(/\bundefined\b/i);
    expect(html).toContain('Flyer A6');
    expect(html).toContain('Arrêté à :');
    expect(html).toContain('Reste à payer');
    expect(html).toContain('quatre-vingt');
  });
});

describe('auth-environment', () => {
  const env = { ...process.env };

  afterEach(() => {
    vi.unstubAllEnvs();
    process.env = { ...env };
  });

  it('preview Vercel sans opt-in explicite → démo désactivée (fail-closed)', () => {
    vi.stubEnv('DEMO_MODE', '');
    vi.stubEnv('VERCEL', '1');
    vi.stubEnv('USE_PRODUCTION_DB', 'false');
    vi.stubEnv('E2E_MODE', 'false');
    vi.stubEnv('NEXT_PUBLIC_SHOW_DEMO_ACCOUNTS', 'false');
    vi.stubEnv('NODE_ENV', 'production');

    expect(isDemoLoginFeaturesEnabled()).toBe(false);
  });

  it('preview Vercel avec DEMO_MODE=true → démo activée (opt-in)', () => {
    vi.stubEnv('DEMO_MODE', 'true');
    vi.stubEnv('VERCEL', '1');
    vi.stubEnv('NODE_ENV', 'production');

    expect(isDemoLoginFeaturesEnabled()).toBe(true);
  });

  it('désactive démo et v29 en prod réelle', () => {
    vi.stubEnv('DEMO_MODE', 'false');
    vi.stubEnv('VERCEL', '');
    vi.stubEnv('USE_PRODUCTION_DB', 'true');
    vi.stubEnv('E2E_MODE', 'false');
    vi.stubEnv('NEXT_PUBLIC_SHOW_DEMO_ACCOUNTS', 'false');
    vi.stubEnv('NODE_ENV', 'production');
    delete process.env.ALLOW_V29_AUTH;

    expect(isDemoLoginFeaturesEnabled()).toBe(false);
    expect(isV29MatriculeAuthEnabled()).toBe(false);
    expect(isV29PasswordHintEnabled()).toBe(false);
  });

  it('active v29 si ALLOW_V29_AUTH=true', () => {
    vi.stubEnv('DEMO_MODE', 'false');
    vi.stubEnv('E2E_MODE', 'false');
    vi.stubEnv('NEXT_PUBLIC_SHOW_DEMO_ACCOUNTS', 'false');
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('ALLOW_V29_AUTH', 'true');

    expect(isV29MatriculeAuthEnabled()).toBe(true);
  });
});
