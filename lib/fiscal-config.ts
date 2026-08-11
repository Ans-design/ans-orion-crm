export const FISCAL_CONFIG_KEY = 'fiscalite';

/** Taux configurables — Madagascar / imprimerie (valeurs indicatives modifiables admin). */
export type FiscalConfig = {
  cnapsRate: number;
  ostieRate: number;
  fmfpRate: number;
  irsaRate: number;
  tvaRate: number;
  hsRateMGA: number;
  currency: string;
  labelCnaps: string;
  labelOstie: string;
};

export const DEFAULT_FISCAL: FiscalConfig = {
  cnapsRate: 1,
  ostieRate: 1,
  fmfpRate: 0.5,
  irsaRate: 5,
  tvaRate: 20,
  hsRateMGA: 20541,
  currency: 'MGA',
  labelCnaps: 'CNAPS',
  labelOstie: 'OSTIE',
};

export function computeFiscalDeductions(brut: number, config: FiscalConfig) {
  const cnaps = Math.round(brut * (config.cnapsRate / 100));
  const ostie = Math.round(brut * (config.ostieRate / 100));
  const fmfp = Math.round(brut * (config.fmfpRate / 100));
  const cotisations = cnaps + ostie + fmfp;
  const irsa = Math.round(Math.max(0, brut - cotisations) * (config.irsaRate / 100));
  return { cnaps, ostie, fmfp, cotisations, irsa, total: cotisations + irsa };
}
