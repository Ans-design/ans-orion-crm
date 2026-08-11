import {
  formatCornerRoundingSummary,
  parseCornerRounding,
  type CornerRoundingState,
} from '@/lib/finition/corner-rounding';
import { normalizeArticleLabel } from '@/lib/finition/finition-normalize';
import {
  computeSurfaceM2,
  isPoseGrandFormat,
} from '@/lib/finition/finition-field-policy';
import {
  getPhysicalSheetsFromConfig,
  parsePagesFromConfig,
  printModeFromConfig,
} from '@/lib/data/binding-catalog';
import {
  articleUsesBindingEngine,
  bindingCartSummaryLine,
  evaluateBindingFromConfig,
} from '@/lib/print/binding-rules';

/** Lignes récap finition pour panier / devis / bon de travail. */
export function finitionSummaryLines(
  articleId: string,
  config: Record<string, unknown>,
): string[] {
  const lines: string[] = [];

  if (articleId === 'fin-coins') {
    const cr = parseCornerRounding(config.cornerRounding);
    if (cr.selected.length > 0) {
      lines.push(`Coins arrondis — ${formatCornerRoundingSummary(cr)}`);
    }
    const type = String(config.type ?? '');
    if (type) lines.push(`Rayon : ${type}`);
  }

  if (articleId === 'fin-dorure') {
    const parts = [config.type, config.procede, config.dim, config.face].filter(Boolean);
    if (parts.length) lines.push(`Dorure — ${parts.join(' — ')}`);
  }

  if (articleId === 'fin-pelliculage') {
    const parts = [config.type, config.sous_type, config.dim, config.face].filter(Boolean);
    if (parts.length) lines.push(`Pelliculage ${parts.join(' — ')}`);
  }

  if (articleId === 'fin-vernis') {
    const parts = [`Vernis ${config.type ?? ''}`.trim(), config.dim, config.face].filter(Boolean);
    if (parts.length) lines.push(parts.join(' — '));
  }

  if (articleId === 'fin-plastification') {
    lines.push(`Plastification — ${config.dim ?? '?'} — Recto-Verso automatique`);
  }

  if (articleId === 'fin-rainage') {
    lines.push(`Rainage / pliage — ${config.plis ?? '?'} — Qté ${config.qty ?? '?'}`);
  }

  if (articleId === 'fin-reliure') {
    const ev = evaluateBindingFromConfig(config);
    if (ev?.summaryLines.length) {
      lines.push(...ev.summaryLines);
    } else {
      const pages = parsePagesFromConfig(config);
      const sheets = getPhysicalSheetsFromConfig(config);
      const mode = printModeFromConfig(config) === 'recto_verso' ? 'Recto-Verso' : 'Recto';
      if (pages) {
        lines.push(
          `Pages document : ${pages} · ${mode}${sheets != null ? ` · ${sheets} feuilles physiques` : ''}`,
        );
      }
      if (config.type) lines.push(`Reliure : ${config.type}`);
      if (config.grammage) lines.push(`Grammage : ${config.grammage}`);
    }
  }

  if (articleUsesBindingEngine(articleId) && articleId !== 'fin-reliure') {
    const cartLine = bindingCartSummaryLine(config);
    if (cartLine) lines.push(cartLine);
    else {
      const ev = evaluateBindingFromConfig(config);
      if (ev?.summaryLines.length) lines.push(...ev.summaryLines);
    }
  }

  if (articleId === 'fin-autocollant') {
    const t = String(config.type ?? '');
    if (isPoseGrandFormat(t)) {
      const l = parseFloat(String(config.longueur_pose ?? 0)) || 0;
      const w = parseFloat(String(config.largeur_pose ?? 0)) || 0;
      const qty = Number(config.qty) || 1;
      const unit = computeSurfaceM2(l, w);
      const total = Math.round(unit * qty * 100) / 100;
      lines.push(
        `Pose vinyle grand format — ${l.toFixed(2)} × ${w.toFixed(2)} m — ${total.toFixed(2)} m² — ${config.hauteur_pose ?? ''}`,
      );
    } else if (t) {
      lines.push(`Pose autocollant — ${t} — Qté ${config.qty ?? '?'}`);
    }
  }

  return lines;
}

export function displayArticleName(name: string): string {
  return normalizeArticleLabel(name);
}

export { parseCornerRounding, type CornerRoundingState };
