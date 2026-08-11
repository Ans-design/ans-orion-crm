import { normalizeFormatId } from '@/lib/finition/finition-formats';
import { cornerRoundingFromLegacy } from '@/lib/finition/corner-rounding';

const FACE_RECTO_VERSO = 'Recto-Verso';
const FACE_RECTO_VERSO_AUTO = 'Recto-Verso automatique';

function mapFace(raw: unknown): string {
  const s = String(raw ?? '').trim().toLowerCase();
  if (s.includes('verso seul') || s === 'verso') return 'Recto seul';
  if (s.includes('recto-verso') || s.includes('recto verso')) return FACE_RECTO_VERSO;
  if (s.includes('recto seul') || s === 'recto') return 'Recto seul';
  return String(raw ?? '');
}

/** Normalise une config finition selon l'article (legacy → règles métier). */
export function normalizeFinitionConfig(
  articleId: string,
  config: Record<string, unknown>,
): Record<string, unknown> {
  const next = { ...config };

  if (articleId === 'fin-dorure') {
    next.face = mapFace(next.face);
    if (String(next.face).toLowerCase().includes('verso seul')) {
      next.face = 'Recto seul';
    }
    delete next.zone;
    if (next.dim) next.dim = normalizeFormatId(next.dim);
  }

  if (articleId === 'fin-pelliculage') {
    const t = String(next.type ?? '');
    if (/soft[- ]?touch/i.test(t)) {
      next.type = 'Pelliculage personnalisé';
    }
    if (next.dim) {
      const dim = normalizeFormatId(next.dim);
      next.dim = dim === 'A3_PLUS' ? 'A3+' : dim.replace('A3_PLUS', 'A3+');
    }
    if (t === 'Mat' || String(next.type) === 'Mat') {
      next.sous_type = 'Pelliculage à chaud';
    }
  }

  if (articleId === 'fin-plastification') {
    delete next.type;
    delete next.epaisseur;
    next.face = FACE_RECTO_VERSO_AUTO;
    if (next.dim) {
      const dim = normalizeFormatId(next.dim);
      next.dim = ['A3_PLUS', 'SRA3'].includes(dim) ? 'A3' : dim.replace('A3_PLUS', 'A3');
    }
  }

  if (articleId === 'fin-vernis') {
    delete next.zone;
    if (next.dim) {
      const dim = normalizeFormatId(next.dim);
      next.dim = dim === 'A3_PLUS' || dim === 'SRA3' ? 'A3' : dim;
    }
  }

  if (articleId === 'fin-rainage') {
    // Conserver dim + plis pour tarification format × nb plis
    if (next.dim) next.dim = normalizeFormatId(next.dim);
  }

  if (articleId === 'fin-autocollant') {
    const t = String(next.type ?? '');
    if (/renforc/i.test(t)) {
      next.type = 'Pose petit format';
    }
    if (/simple/i.test(t) && !/grand format/i.test(t)) {
      next.type = 'Pose petit format';
    }
  }

  if (articleId === 'fin-coins') {
    next.cornerRounding = cornerRoundingFromLegacy(next);
    delete next.nb_coins;
    delete next.coins_arrondir;
  }

  if (articleId === 'fin-reliure') {
    next.face = mapFace(next.face) || next.face;
    if (!next.nb_pages && next.pages) next.nb_pages = next.pages;
  }

  return next;
}

export function normalizeArticleLabel(label: string): string {
  if (label === 'Vernis UV') return 'Vernis';
  return label;
}
