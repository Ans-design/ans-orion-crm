/**
 * Règles recto / verso par support — Admin/Excel, consommées par POS + moteur ISF.
 */

export type SupportFaceRuleLike = {
  supportKey: string;
  supportLabel: string;
  rectoAllowed: boolean;
  versoAllowed: boolean;
  rectoVersoAllowed: boolean;
  reason?: string | null;
  active?: boolean;
};

export const DEFAULT_SUPPORT_FACE_RULES: SupportFaceRuleLike[] = [
  {
    supportKey: 'autocollant',
    supportLabel: 'Papier autocollant / Adestor / collant glossy',
    rectoAllowed: true,
    versoAllowed: false,
    rectoVersoAllowed: false,
    reason: 'Supports autocollants : recto uniquement',
  },
  {
    supportKey: 'adestor',
    supportLabel: 'Adestor',
    rectoAllowed: true,
    versoAllowed: false,
    rectoVersoAllowed: false,
    reason: 'Adestor : recto uniquement',
  },
  {
    supportKey: 'collant_glossy',
    supportLabel: 'Papier collant glossy',
    rectoAllowed: true,
    versoAllowed: false,
    rectoVersoAllowed: false,
    reason: 'Autocollant glossy : recto uniquement',
  },
  {
    supportKey: 'vinyle',
    supportLabel: 'Vinyle / vinyle blanc / transparent',
    rectoAllowed: true,
    versoAllowed: false,
    rectoVersoAllowed: false,
    reason: 'Vinyle : recto uniquement',
  },
  {
    supportKey: 'pvc_transl',
    supportLabel: 'PVC translucide',
    rectoAllowed: true,
    versoAllowed: false,
    rectoVersoAllowed: false,
    reason: 'PVC translucide : recto uniquement',
  },
  {
    supportKey: 'sublimation',
    supportLabel: 'Papier sublimation',
    rectoAllowed: true,
    versoAllowed: false,
    rectoVersoAllowed: false,
    reason: 'Sublimation : recto uniquement',
  },
];

const KEY_ALIASES: Record<string, string> = {
  autocollant: 'autocollant',
  adestor: 'adestor',
  collant_glossy: 'collant_glossy',
  'papier autocollant': 'autocollant',
  'papier collant glossy': 'collant_glossy',
  vinyle: 'vinyle',
  'vinyle blanc': 'vinyle',
  'vinyle transparent': 'vinyle',
  pvc_transl: 'pvc_transl',
  'pvc translucide': 'pvc_transl',
  sublimation: 'sublimation',
  'papier sublimation': 'sublimation',
};

export function normalizeSupportKey(raw: string): string {
  const s = String(raw ?? '').trim().toLowerCase();
  if (!s) return '';
  if (KEY_ALIASES[s]) return KEY_ALIASES[s];
  if (s.includes('autocoll') || s.includes('adestor') || s.includes('collant')) return 'autocollant';
  if (s.includes('vinyle')) return 'vinyle';
  if (s.includes('pvc') && s.includes('transluc')) return 'pvc_transl';
  if (s.includes('sublim')) return 'sublimation';
  return s.replace(/\s+/g, '_');
}

export function findSupportFaceRule(
  materialOrSupport: string,
  rules: SupportFaceRuleLike[] = DEFAULT_SUPPORT_FACE_RULES,
): SupportFaceRuleLike | null {
  const key = normalizeSupportKey(materialOrSupport);
  if (!key) return null;
  const active = rules.filter((r) => r.active !== false);
  return (
    active.find((r) => r.supportKey === key)
    ?? active.find((r) => normalizeSupportKey(r.supportLabel) === key)
    ?? active.find((r) => materialOrSupport.toLowerCase().includes(r.supportKey.replace(/_/g, ' ')))
    ?? null
  );
}

export function isRectoVersoAllowedForSupport(
  materialOrSupport: string,
  rules: SupportFaceRuleLike[] = DEFAULT_SUPPORT_FACE_RULES,
): boolean {
  const rule = findSupportFaceRule(materialOrSupport, rules);
  if (!rule) return true;
  return rule.rectoVersoAllowed && rule.versoAllowed;
}

export function filterFaceOptionsForSupport(
  materialOrSupport: string,
  options: string[],
  rules: SupportFaceRuleLike[] = DEFAULT_SUPPORT_FACE_RULES,
): string[] {
  if (isRectoVersoAllowedForSupport(materialOrSupport, rules)) return options;
  return options.filter((o) => {
    const v = o.toLowerCase();
    return !v.includes('verso') && !v.includes('r/v') && !v.includes('recto-verso') && !v.includes('recto verso');
  });
}
