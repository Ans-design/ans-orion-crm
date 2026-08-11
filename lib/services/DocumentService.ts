import { readFileSync } from 'fs';
import { join } from 'path';
import { formatPrice } from '@/lib/data/catalogue';
import { formatAmountInWordsAr } from '@/lib/documents/amount-in-words-fr';
import {
  inferTvaRatePercent,
  sanitizeDisplayLines,
  sanitizeDisplayText,
  validateCommercialLine,
} from '@/lib/documents/display-sanitize';
import { buildWorkOrderLines, buildProductionLineSpec } from '@/lib/production/work-order-lines';
import { formatCommercialQtyCell } from '@/lib/documents/commercial-line-units';
import { summarizeCommercialTechLines } from '@/lib/documents/commercial-tech-summary';
import { parseDevisNotes } from '@/lib/devis-meta';
import { ANS_DESIGN_PRINT } from '@/lib/company/ans-design-print';

const COMPANY = ANS_DESIGN_PRINT;

const BRAND = '#FF174D';
const BRAND_DEEP = '#DF0D3D';
const INK = '#172033';
const INK_SOFT = '#24304A';
const BODY = '#475166';
const MUTED = '#7B8496';
const LINE = '#DDE2EA';
const SOFT = '#F4F6F9';
const PAPER = '#FFFEFD';

export type CommercialDocKind = 'devis' | 'proforma' | 'facture' | 'recu';
export type DocumentTemplateMode = 'full' | 'preprinted';

/** Logos ANS (PNG) en data-URI pour PDF / aperçu hors Next. */
let _ansMarkDataUri: string | null | undefined;
let _ansWatermarkDataUri: string | null | undefined;

function loadBrandingPng(fileName: string): string | null {
  try {
    const file = join(process.cwd(), 'public', 'branding', fileName);
    return `data:image/png;base64,${readFileSync(file).toString('base64')}`;
  } catch {
    return null;
  }
}

function ansMarkDataUri(): string {
  if (_ansMarkDataUri !== undefined) return _ansMarkDataUri ?? '';
  _ansMarkDataUri =
    loadBrandingPng('ans-logo-mark.png')
    || loadBrandingPng('ans-logo-wordmark.png');
  return _ansMarkDataUri ?? '';
}

function ansWatermarkDataUri(): string {
  if (_ansWatermarkDataUri !== undefined) return _ansWatermarkDataUri ?? '';
  _ansWatermarkDataUri =
    loadBrandingPng('ans-logo-wordmark-grey.png')
    || loadBrandingPng('ans-logo-wordmark.png')
    || ansMarkDataUri();
  return _ansWatermarkDataUri ?? '';
}

function ansLogoHtml(_forPdf: boolean): string {
  const src = ansMarkDataUri() || '/branding/ans-logo-mark.png';
  return `<img class="brand-logo" src="${src}" alt="ANS.com" width="72" height="72" />`;
}

function renderSheetChrome(template: DocumentTemplateMode): string {
  if (template === 'preprinted') return '';
  const wm = ansWatermarkDataUri() || '/branding/ans-logo-wordmark-grey.png';
  return `<div class="sheet-watermark" aria-hidden="true"><img src="${wm}" alt="" /></div>`;
}

function renderCommercialHero(opts: {
  template: DocumentTemplateMode;
  forPdf: boolean;
  kindLabel: string;
  numero: string;
  statut: string;
  metaRows: Array<{ label: string; value: string }>;
  /** Bloc QR commande (HTML déjà échappé / data-URI). */
  qrHtml?: string;
}): string {
  const brand =
    opts.template === 'full'
      ? `<div class="lh-brand">
          ${ansLogoHtml(opts.forPdf)}
          <div class="lh-legal">
            <p>NIF : ${escapeHtml(COMPANY.nif)} — STAT : ${escapeHtml(COMPANY.stat)}</p>
            <p>RCS ${escapeHtml(COMPANY.rcs)}</p>
            <p class="lh-contact"><span class="ico ico-phone" aria-hidden="true"></span>${escapeHtml(COMPANY.tel)}</p>
            <p class="lh-contact"><span class="ico ico-wa" aria-hidden="true"></span>${escapeHtml(COMPANY.whatsapp)}</p>
            <p class="lh-contact"><span class="ico ico-mail" aria-hidden="true"></span>${escapeHtml(COMPANY.email)}</p>
          </div>
        </div>`
      : '<div class="lh-brand lh-brand--empty" aria-hidden="true"></div>';

  const rows = opts.metaRows
    .map(
      (r) =>
        `<div class="hero-meta-line"><span>${escapeHtml(r.label)}</span><b>${escapeHtml(r.value)}</b></div>`,
    )
    .join('');

  return `<header class="hero">
    ${brand}
    <div class="doc-band${opts.qrHtml ? ' doc-band--with-qr' : ''}">
      <div class="doc-band-main">
        <div class="kind">${escapeHtml(opts.kindLabel)}</div>
        <span class="doc-ref">${escapeHtml(opts.numero)}</span>
        <span class="badge">${escapeHtml(formatDocStatut(opts.statut))}</span>
      </div>
      <div class="doc-band-side">
        <div class="hero-meta">${rows}</div>
        ${opts.qrHtml ?? ''}
      </div>
    </div>
  </header>`;
}

function fmtDate(d: Date | string | null | undefined): string {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
}

function fmtAr(n: number): string {
  return formatPrice(n);
}

/** Styles legacy (fiche fabrication). */
function baseStyles(): string {
  return `
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Segoe UI', system-ui, sans-serif; color: ${INK}; background: #fff; padding: 40px; font-size: 13px; line-height: 1.5; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 32px; border-bottom: 3px solid ${BRAND}; padding-bottom: 20px; }
    .logo { font-size: 22px; font-weight: 800; color: ${BRAND}; letter-spacing: -0.5px; }
    .logo-sub { font-size: 11px; color: ${MUTED}; margin-top: 4px; }
    .doc-title { text-align: right; }
    .doc-title h1 { font-size: 28px; font-weight: 700; color: ${INK}; }
    .doc-title p { color: ${MUTED}; font-size: 12px; margin-top: 4px; }
    .parties { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 28px; }
    .box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; }
    .box h3 { font-size: 10px; text-transform: uppercase; letter-spacing: 0.08em; color: ${MUTED}; margin-bottom: 8px; }
    .box p { font-size: 13px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
    th { background: ${BRAND}; color: #fff; text-align: left; padding: 10px 12px; font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; }
    td { padding: 10px 12px; border-bottom: 1px solid #e2e8f0; vertical-align: top; }
    tr:nth-child(even) td { background: #f8fafc; }
    .totals { margin-left: auto; width: 280px; }
    .totals tr td { border: none; padding: 6px 0; }
    .totals .total-row td { font-size: 16px; font-weight: 700; color: ${BRAND}; border-top: 2px solid ${BRAND}; padding-top: 12px; }
    .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #e2e8f0; color: ${MUTED}; font-size: 11px; }
    .badge { display: inline-block; padding: 4px 10px; border-radius: 20px; font-size: 11px; font-weight: 600; background: #ffe4ec; color: ${BRAND}; }
    @media print { body { padding: 20px; } .no-print { display: none; } }
    .print-btn { position: fixed; top: 16px; right: 16px; background: ${BRAND}; color: #fff; border: none; padding: 10px 20px; border-radius: 8px; cursor: pointer; font-weight: 600; }
    .amount-words { margin-top: 8px; font-size: 12px; color: #334155; font-style: italic; }
    .page-footer { margin-top: 24px; font-size: 10px; color: #94a3b8; text-align: right; }
    .template-preprinted .header { border-bottom: none; min-height: 120px; }
    .template-preprinted .footer { border-top: none; min-height: 80px; }
  `;
}

/** Design éditorial facture / devis / proforma — inspiré maquettes premium A4 ANS. */
function commercialDocStyles(): string {
  return `
    * { box-sizing: border-box; margin: 0; padding: 0; }
    @page { size: A4; margin: 8mm; }
    body {
      font-family: Inter, 'Segoe UI', system-ui, -apple-system, sans-serif;
      color: ${INK};
      background: #e9edf3;
      font-size: 11px;
      line-height: 1.4;
      padding: 16px 10px 28px;
      -webkit-font-smoothing: antialiased;
    }
    .sheet {
      position: relative;
      max-width: 210mm;
      margin: 0 auto;
      background: ${PAPER};
      overflow: hidden;
      isolation: isolate;
      box-shadow: 0 24px 70px rgba(23, 32, 51, 0.18);
      min-height: 297mm;
    }
    .sheet-watermark {
      position: absolute; inset: 0; z-index: 0;
      display: flex; align-items: center; justify-content: center;
      pointer-events: none;
    }
    .sheet-watermark img {
      width: min(58%, 300px); opacity: 0.07; filter: grayscale(1);
    }
    .hero, .body { position: relative; z-index: 1; }
    .hero { background: transparent; color: ${INK}; padding: 18px 22px 0 26px; }
    .lh-brand {
      display: grid; grid-template-columns: 72px minmax(0, 1fr); gap: 16px;
      align-items: start; margin-bottom: 14px;
    }
    .lh-brand--empty { min-height: 72px; }
    .brand-logo {
      width: 72px; height: 72px; object-fit: cover;
      border-radius: 6px; flex-shrink: 0;
      box-shadow: 0 6px 16px rgba(227, 30, 36, 0.22);
    }
    .lh-legal {
      text-align: right; justify-self: end; max-width: 100%;
      font-size: 10px; color: ${INK}; line-height: 1.45; font-weight: 600;
    }
    .lh-legal p { margin: 0; }
    .lh-contact {
      display: flex; align-items: center; justify-content: flex-end; gap: 7px;
      margin-top: 2px !important; font-weight: 550; color: ${BODY};
    }
    .ico {
      width: 12px; height: 12px; border-radius: 50%; flex-shrink: 0;
      display: inline-block; position: relative;
    }
    .ico-phone { background: ${BRAND}; }
    .ico-phone::after {
      content: ""; position: absolute; inset: 2.5px;
      border: 1.4px solid #fff; border-radius: 2px; transform: rotate(-20deg);
    }
    .ico-wa { background: #25D366; }
    .ico-wa::after {
      content: ""; position: absolute; inset: 3px;
      border: 1.5px solid #fff; border-radius: 50%;
    }
    .ico-mail { background: ${BRAND}; border-radius: 2px; }
    .ico-mail::after {
      content: ""; position: absolute; left: 2px; right: 2px; top: 3px; height: 5px;
      border: 1.2px solid #fff; border-top: 0; border-radius: 0 0 1px 1px;
    }
    .doc-band {
      display: flex; justify-content: space-between; align-items: flex-end; gap: 12px;
      padding: 10px 12px; margin-bottom: 2px;
      border: 1px solid ${LINE}; border-radius: 8px; background: #fff;
    }
    .doc-band--with-qr { align-items: center; }
    .doc-band-main {
      display: flex; flex-wrap: wrap; align-items: center; gap: 8px 10px;
    }
    .doc-band-side {
      display: flex; align-items: center; gap: 12px; flex-shrink: 0;
    }
    .doc-qr {
      display: flex; flex-direction: column; align-items: center; gap: 4px;
      min-width: 96px; text-align: center;
    }
    .doc-qr__img {
      width: 96px; height: 96px; object-fit: contain;
      border: 1px solid ${LINE}; border-radius: 7px; background: #fff;
      padding: 4px;
    }
    .doc-qr__meta { display: grid; gap: 1px; max-width: 110px; }
    .doc-qr__meta strong {
      font-size: 8px; font-weight: 900; letter-spacing: 0.06em;
      text-transform: uppercase; color: ${INK}; line-height: 1.2;
    }
    .doc-qr__meta span {
      font-size: 8px; color: ${MUTED}; font-weight: 600; line-height: 1.2;
    }
    .doc-band .kind {
      font-size: 22px; font-weight: 950; letter-spacing: -0.04em; line-height: 1;
      text-transform: uppercase; color: ${INK};
    }
    .doc-ref {
      display: inline-flex; align-items: center; min-height: 22px;
      border-radius: 999px; padding: 0 10px;
      color: #fff; background: ${BRAND};
      font-family: ui-monospace, Consolas, monospace;
      font-size: 10px; font-weight: 800; letter-spacing: 0.04em; white-space: nowrap;
    }
    .hero-meta {
      display: grid; gap: 2px; text-align: right;
      color: ${MUTED}; font-size: 9px;
    }
    .hero-meta-line {
      display: flex; align-items: baseline; justify-content: flex-end; gap: 6px;
    }
    .hero-meta-line span { font-weight: 650; opacity: 0.9; }
    .hero-meta-line b { color: ${INK}; font-weight: 800; }
    .badge {
      display: inline-flex; align-items: center; gap: 6px;
      padding: 4px 10px; border-radius: 999px;
      font-size: 8px; font-weight: 900; letter-spacing: 0.08em; text-transform: uppercase;
      color: #238564; background: rgba(35, 133, 100, 0.14);
    }
    .badge::before {
      content: ""; width: 5px; height: 5px; border-radius: 50%;
      background: currentColor; box-shadow: 0 0 0 3px rgba(35, 133, 100, 0.12);
    }
    .body { padding: 12px 22px 16px 26px; }
    .parties {
      display: grid; grid-template-columns: 1fr; gap: 10px;
      margin-bottom: 12px;
    }
    .parties--split {
      grid-template-columns: 1.2fr 0.8fr;
    }
    .box {
      min-height: 0;
      background: #fff; border: 1px solid ${LINE}; border-radius: 10px; padding: 10px 12px;
    }
    .box.alt { background: ${SOFT}; }
    .box h3 {
      display: flex; align-items: center; gap: 7px;
      font-size: 8px; font-weight: 900; letter-spacing: 0.14em;
      text-transform: uppercase; color: ${MUTED}; margin-bottom: 8px;
    }
    .box h3::before {
      content: ""; width: 7px; height: 7px; border-radius: 2px;
      background: ${BRAND}; transform: rotate(12deg); flex-shrink: 0;
    }
    .box p { font-size: 11px; color: ${BODY}; margin-top: 2px; line-height: 1.4; }
    .box strong { color: ${INK}; font-size: 14px; font-weight: 900; letter-spacing: -0.02em; }
    .items-section { margin-bottom: 12px; }
    .section-title {
      display: flex; justify-content: space-between; align-items: center; gap: 12px;
      margin: 0 0 8px;
    }
    .section-title h2 {
      margin: 0; color: ${INK}; font-size: 10px; font-weight: 950;
      letter-spacing: 0.13em; text-transform: uppercase;
    }
    .article-badge {
      border-radius: 999px; padding: 4px 9px;
      color: ${BRAND}; background: rgba(255, 23, 77, 0.08);
      font-family: ui-monospace, Consolas, monospace;
      font-size: 9px; font-weight: 900; letter-spacing: 0.05em;
    }
    .items-wrap {
      overflow: hidden;
      border: 1px solid ${LINE}; border-radius: 12px; background: #fff;
      box-shadow: 0 8px 22px rgba(23, 32, 51, 0.04);
    }
    table.items {
      width: 100%; border-collapse: collapse; table-layout: fixed; margin: 0;
    }
    table.items thead th {
      height: 34px; padding: 0 12px;
      background: ${INK}; color: #aeb8c9;
      font-size: 8px; font-weight: 900; letter-spacing: 0.1em;
      text-transform: uppercase; text-align: left; border: 0;
    }
    table.items tbody tr td {
      padding: 8px 10px; vertical-align: top;
      font-size: 11px; color: ${BODY};
      border-top: 1px solid ${LINE}; background: rgba(255,255,255,0.96);
    }
    table.items tbody tr:first-child td { border-top: 0; }
    table.items tbody tr:nth-child(even) td { background: #fbfaf8; }
    table.items .item-num {
      width: 42px; text-align: center;
      color: rgba(255, 23, 77, 0.72); font-weight: 950;
      font-family: ui-monospace, Consolas, monospace; font-variant-numeric: tabular-nums;
    }
    table.items .item-title { font-weight: 900; color: ${INK}; font-size: 12px; line-height: 1.25; }
    table.items .item-sub { font-size: 10px; color: ${MUTED}; margin-top: 3px; line-height: 1.3; }
    table.items .num {
      color: ${INK}; font-weight: 850; font-variant-numeric: tabular-nums; white-space: nowrap;
    }
    .tech-detail {
      margin-top: 5px; padding: 5px 8px; border-radius: 7px;
      background: ${SOFT}; border: 1px solid ${LINE};
    }
    .tech-detail strong {
      display: block; font-size: 7px; color: ${MUTED};
      text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 2px;
    }
    .tech-detail ul {
      margin: 0; padding-left: 14px; font-size: 9.5px; color: ${BODY}; line-height: 1.35;
    }
    .tech-detail--inline p {
      margin: 0; font-size: 9.5px; color: ${BODY}; line-height: 1.35;
    }
    .empty-lines {
      margin: 0; padding: 28px 18px; text-align: center;
      color: ${MUTED}; font-size: 12px; font-weight: 600;
    }
    .foot-grid {
      display: grid; grid-template-columns: 1.2fr 0.8fr; gap: 14px;
      align-items: stretch;
    }
    .pay-block {
      min-width: 0;
      display: flex; flex-direction: column; gap: 10px;
      padding: 12px 14px;
      border: 1px solid ${LINE};
      border-radius: 12px;
      background: #fff;
    }
    /* Conditions | Paiement — 2 colonnes lisibles */
    .info-duo {
      display: grid; grid-template-columns: 1fr 1.2fr; gap: 12px;
      min-width: 0;
    }
    .info-col {
      min-width: 0;
      padding: 0;
    }
    .info-col h4, .info-section h4, .pay-block > h4 {
      font-size: 8px; font-weight: 950; letter-spacing: 0.11em;
      text-transform: uppercase; color: ${INK}; margin: 0 0 5px;
    }
    .info-col p, .info-section p, .pay-block p {
      font-size: 10px; color: ${BODY}; line-height: 1.4; margin: 0;
      overflow-wrap: anywhere; word-break: break-word;
    }
    .info-stack { display: flex; flex-direction: column; gap: 8px; min-width: 0; }
    .info-section {
      min-width: 0; padding: 8px 0 0;
      border-top: 1px solid ${LINE};
    }
    .mentions-compact {
      margin: 0 !important; font-size: 9px !important; color: ${MUTED} !important; line-height: 1.35 !important;
    }
    .letterhead-pay.pay-modalities {
      margin: 0; padding: 0; min-width: 0;
      display: flex; flex-direction: column; gap: 8px;
    }
    .mm-row {
      display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 10px;
      align-items: stretch;
    }
    .mm-list {
      margin: 0; padding: 0; list-style: none;
      display: flex; flex-direction: column; gap: 4px;
    }
    .mm-line {
      display: flex; align-items: center; gap: 8px; min-width: 0;
    }
    .mm-logo {
      display: inline-flex; align-items: center; justify-content: center;
      min-width: 46px; height: 16px; padding: 0 5px;
      border-radius: 3px; font-size: 7px; font-weight: 900;
      letter-spacing: 0.02em; color: #fff; text-transform: uppercase;
    }
    .mm-logo--mvola { background: linear-gradient(90deg, #0054a5, #f7c700); color: #fff; }
    .mm-logo--airtel { background: #ed1c24; }
    .mm-logo--orange { background: #ff7900; }
    .letterhead-pay .pay-v {
      font-weight: 850; color: ${INK};
      font-variant-numeric: tabular-nums; font-size: 11px;
    }
    .mm-namebox {
      min-width: 88px; max-width: 110px;
      border: 1px solid #b8c0ce; border-radius: 4px;
      padding: 6px 8px; display: flex; flex-direction: column; justify-content: center;
      font-size: 10px; font-weight: 800; color: ${INK}; line-height: 1.25;
      background: #fff;
    }
    .mm-namebox span { display: block; }
    .bank-box {
      display: grid; grid-template-columns: 42px minmax(0, 1fr); gap: 8px;
      align-items: center;
      border: 1px solid #b8c0ce; border-radius: 5px; padding: 6px 8px;
      background: #fff;
    }
    .bank-logo {
      display: inline-flex; align-items: center; justify-content: center;
      height: 28px; border-radius: 4px;
      background: #0b3d91; color: #fff;
      font-size: 9px; font-weight: 950; letter-spacing: 0.04em;
    }
    .bank-lines { min-width: 0; display: grid; gap: 3px; }
    .bank-lines p {
      margin: 0; padding: 3px 6px; border-radius: 3px;
      background: #eef1f5; font-size: 9.5px; color: ${BODY}; line-height: 1.3;
    }
    .bank-lines span { color: ${MUTED}; font-weight: 650; }
    .bank-lines strong { color: ${INK}; font-weight: 850; }
    .letterhead-pay .pay-note {
      margin: 0; font-size: 9px; color: ${MUTED}; line-height: 1.35;
    }
    .letterhead-pay .pay-note strong { color: ${INK}; font-weight: 700; }
    .notes-list {
      margin: 0; padding: 0; list-style: none;
      display: flex; flex-wrap: wrap; gap: 4px 10px;
    }
    .notes-list li {
      font-size: 9.5px; color: ${BODY}; line-height: 1.35;
      padding: 0; overflow-wrap: anywhere;
    }
    .notes-list li strong { color: ${INK}; font-weight: 700; }
    .pay-balance {
      display: grid; grid-template-columns: 1fr 1fr; gap: 8px;
      margin-top: 2px;
    }
    .pay-balance__item {
      padding: 7px 9px; border-radius: 8px; background: #fff;
      border: 1px solid ${LINE};
    }
    .pay-balance__item span {
      display: block; font-size: 8px; font-weight: 800; letter-spacing: 0.08em;
      text-transform: uppercase; color: ${MUTED}; margin-bottom: 2px;
    }
    .pay-balance__item b {
      font-size: 12px; font-weight: 900; color: ${INK};
      font-variant-numeric: tabular-nums;
    }
    .pay-balance__item.is-zero b { color: #15803d; }
    .pay-balance__item.is-due b { color: ${BRAND}; }
    .totals-card {
      display: flex; flex-direction: column;
      overflow: hidden; border-radius: 12px; color: #fff;
      background: ${INK};
      box-shadow: 0 13px 30px rgba(23, 32, 51, 0.14);
    }
    .totals { width: 100%; padding: 16px 18px 8px; }
    .totals tr td {
      border: none; padding: 5px 0; font-size: 11px; color: #b8c1d0;
    }
    .totals tr td:last-child {
      text-align: right; font-weight: 850; color: #fff;
      font-variant-numeric: tabular-nums; white-space: nowrap;
    }
    .total-bar {
      display: grid; grid-template-columns: 1fr auto; gap: 12px; align-items: center;
      margin-top: auto; padding: 14px 18px;
      color: ${INK}; background: #fff;
      border: 4px solid ${INK}; border-top-width: 0;
      font-weight: 950; font-size: 11px; letter-spacing: 0.04em; text-transform: uppercase;
    }
    .total-bar span:last-child,
    .total-bar strong {
      color: ${BRAND}; font-size: 17px; font-weight: 950;
      letter-spacing: -0.025em; font-variant-numeric: tabular-nums;
      text-transform: none;
    }
    .amount-words {
      margin: 0; padding: 10px 18px 14px; font-size: 10px; color: #c6cedc; line-height: 1.45;
    }
    .amount-words strong { color: #fff; font-style: normal; }
    .sign-row {
      margin-top: 10px; display: grid; grid-template-columns: 1fr 1fr; gap: 8px;
    }
    .letterhead-sign { gap: 18px; align-items: start; }
    .sign-pad {
      min-height: 52px;
      border: 0; border-radius: 0; padding: 4px 2px 6px;
      font-size: 11px; font-weight: 800; color: ${INK};
      letter-spacing: 0.02em; text-transform: none; background: transparent;
    }
    .sign-pad small {
      display: block; margin-top: 4px; color: ${MUTED}; font-size: 9px;
      font-weight: 600; letter-spacing: 0; text-transform: none;
    }
    .sign-pad--responsable { position: relative; min-height: 88px; }
    .lh-stamp {
      margin-top: 10px; display: inline-flex; align-items: center; gap: 8px;
      max-width: 190px; padding: 8px 10px; border-radius: 8px;
      border: 1.5px solid rgba(37, 99, 235, 0.45);
      background: rgba(59, 130, 246, 0.08);
      color: #1d4ed8; transform: rotate(-2deg);
    }
    .lh-stamp img {
      width: 34px; height: 34px; object-fit: cover; border-radius: 5px;
      opacity: 0.92;
    }
    .lh-stamp strong {
      display: block; font-size: 8px; font-weight: 800;
      letter-spacing: 0.02em; text-transform: lowercase;
    }
    .lh-stamp em {
      display: block; margin-top: 2px; font-size: 8px; font-style: italic;
      font-weight: 650; opacity: 0.9;
    }
    .doc-footer {
      margin-top: 8px; padding: 4px 0 0;
      border-top: 0;
      font-size: 8px; color: ${MUTED};
      display: flex; justify-content: space-between; gap: 12px;
      flex-wrap: wrap;
    }
    .doc-footer strong { color: ${INK}; }
    .print-btn {
      position: fixed; top: 16px; right: 16px; z-index: 20;
      background: ${BRAND}; color: #fff; border: none;
      padding: 11px 20px; border-radius: 11px; cursor: pointer; font-weight: 800;
      box-shadow: 0 8px 24px rgba(255, 23, 77, 0.28);
    }
    .print-btn:hover { background: ${BRAND_DEEP}; }
    .pay-status { display: none; }
    @media print {
      body { background: #fff; padding: 0; font-size: 10px; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .no-print { display: none !important; }
      .sheet { max-width: none; width: 210mm; min-height: 0; box-shadow: none; }
      .sheet::before { display: none; }
      .body { padding: 8px 10mm 6mm 12mm; }
      .hero { padding-left: 12mm; padding-right: 10mm; }
      .foot-grid, .sign-row, .items-section { break-inside: avoid; page-break-inside: avoid; }
      .sheet { min-height: 0; box-shadow: none; }
    }
    .template-preprinted .sheet-watermark,
    .template-preprinted .lh-brand,
    .template-preprinted .brand-logo,
    .template-preprinted .lh-stamp,
    .template-preprinted .letterhead-pay { display: none !important; }
    .template-preprinted .hero { padding-top: 72px; }
    .template-preprinted .doc-band {
      margin-left: auto; width: min(320px, 100%);
      background: ${SOFT};
    }
    .template-preprinted .badge {
      color: ${BRAND}; background: rgba(255, 23, 77, 0.1);
    }
    .template-preprinted .badge::before { background: ${BRAND}; box-shadow: none; }
    .template-preprinted .totals-card {
      background: ${SOFT}; color: ${INK}; box-shadow: none; border: 1px solid ${LINE};
    }
    .template-preprinted .totals tr td { color: ${MUTED}; }
    .template-preprinted .totals tr td:last-child { color: ${INK}; }
    .template-preprinted .total-bar {
      border-color: ${LINE}; background: #fff;
    }
    .template-preprinted .amount-words { color: ${MUTED}; }
    .template-preprinted .amount-words strong { color: ${INK}; }
    .template-preprinted .doc-footer--preprinted { color: ${MUTED}; }
  `;
}

function formatDocStatut(raw: string): string {
  return raw.replace(/_/g, ' ').trim();
}

function mmCarrierClass(label: string): string {
  const l = label.toLowerCase();
  if (l.includes('airtel')) return 'mm-logo--airtel';
  if (l.includes('orange')) return 'mm-logo--orange';
  return 'mm-logo--mvola';
}

function mmCarrierShort(label: string): string {
  const l = label.toLowerCase();
  if (l.includes('airtel')) return 'Airtel';
  if (l.includes('orange')) return 'Orange';
  return 'Telma';
}

function renderPaymentModalitiesHtml(docRef: string, opts?: { heading?: boolean }): string {
  const mm = COMPANY.payment.mobileMoney
    .map(
      (m) =>
        `<li class="mm-line">
          <span class="mm-logo ${mmCarrierClass(m.label)}">${escapeHtml(mmCarrierShort(m.label))}</span>
          <span class="pay-v">${escapeHtml(m.number)}</span>
        </li>`,
    )
    .join('');
  const nameParts = COMPANY.payment.mobileMoneyBeneficiary.split(/\s+/);
  const nameHtml = nameParts.map((p) => `<span>${escapeHtml(p)}</span>`).join('');
  const heading = opts?.heading === false ? '' : '<h4>Modalités de paiement</h4>';
  return `${heading}
    <div class="letterhead-pay pay-modalities">
      <div class="mm-row">
        <ul class="mm-list">${mm}</ul>
        <div class="mm-namebox" title="Bénéficiaire">${nameHtml}</div>
      </div>
      <div class="bank-box">
        <span class="bank-logo">${escapeHtml(COMPANY.payment.bankName)}</span>
        <div class="bank-lines">
          <p><span>Chèque au nom de :</span> <strong>${escapeHtml(COMPANY.payment.chequePayableTo)}</strong></p>
          <p><span>Virement bancaire :</span> <strong>${escapeHtml(COMPANY.payment.rib)}</strong></p>
        </div>
      </div>
      <p class="pay-note">Au nom de <strong>${escapeHtml(COMPANY.payment.mobileMoneyBeneficiary)}</strong> · Réf. <strong>${escapeHtml(docRef)}</strong></p>
    </div>`;
}

function renderLetterheadStamp(): string {
  const src = ansMarkDataUri() || '/branding/ans-logo-mark.png';
  return `<div class="lh-stamp">
    <img src="${src}" alt="" width="36" height="36" />
    <div>
      <strong>design graphic &amp; print</strong>
      <em>${escapeHtml(COMPANY.slogan)}</em>
    </div>
  </div>`;
}

function renderLetterheadSignatures(): string {
  return `<div class="sign-row letterhead-sign">
    <div class="sign-pad">Client<small>Nom &amp; signature</small></div>
    <div class="sign-pad sign-pad--responsable">
      Responsable<small>Cachet &amp; signature</small>
      ${renderLetterheadStamp()}
    </div>
  </div>`;
}

/** Notes client lisibles — masque le JSON technique __ANS_META__. */
function renderCommercialNotesHtml(notes?: string | null): string {
  const { meta, userNotes } = parseDevisNotes(notes);
  const items: { label: string; value: string }[] = [];
  if (meta?.modeExpedition) items.push({ label: 'Expédition', value: meta.modeExpedition });
  if (meta?.delaiExecution) items.push({ label: 'Délai', value: meta.delaiExecution });
  if (meta?.priorite) items.push({ label: 'Priorité', value: meta.priorite });
  if (meta?.avancePct && meta.avancePct > 0 && meta.avancePct < 100) {
    items.push({ label: 'Acompte', value: `${meta.avancePct}%` });
  }
  const free = sanitizeDisplayText(userNotes) || sanitizeDisplayText(meta?.notesLibres ?? '');
  if (free) items.push({ label: 'Notes', value: free });
  if (items.length === 0) return '';
  const lis = items
    .map(
      (it) =>
        `<li><strong>${escapeHtml(it.label)}</strong> · ${escapeHtml(it.value)}</li>`,
    )
    .join('');
  return `<div class="info-section"><h4>Notes</h4><ul class="notes-list">${lis}</ul></div>`;
}

function renderConditionsPaymentDuo(conditions: string, docRef: string): string {
  return `<div class="info-duo">
    <div class="info-col">
      <h4>Conditions</h4>
      <p>${escapeHtml(conditions)}</p>
    </div>
    <div class="info-col">
      <h4>Paiement</h4>
      ${renderPaymentModalitiesHtml(docRef, { heading: false })}
    </div>
  </div>`;
}

function renderPayBalance(montantPaye: number, reste: number): string {
  return `<div class="pay-balance">
    <div class="pay-balance__item">
      <span>Montant payé</span>
      <b>${fmtAr(montantPaye)}</b>
    </div>
    <div class="pay-balance__item ${reste > 0 ? 'is-due' : 'is-zero'}">
      <span>Reste à payer</span>
      <b>${fmtAr(reste)}</b>
    </div>
  </div>`;
}

function renderDocFooterLegal(opts?: { preprinted?: boolean }): string {
  if (opts?.preprinted) {
    return `<div class="doc-footer doc-footer--preprinted">
      <span>Document commercial · ANS ORION</span>
      <span>Page 1/1</span>
    </div>`;
  }
  return `<div class="doc-footer">
    <span>${escapeHtml(COMPANY.legalName)} · NIF ${escapeHtml(COMPANY.nif)} · STAT ${escapeHtml(COMPANY.stat)} · RCS ${escapeHtml(COMPANY.rcs)}</span>
    <span>Page 1/1</span>
  </div>`;
}

function renderClientPartyBox(client: {
  name?: string | null;
  email?: string | null;
  tel?: string | null;
  adresse?: string | null;
  code?: string | null;
} | null | undefined): string {
  const name = sanitizeDisplayText(client?.name) ?? 'Client non renseigné';
  return `<div class="box"><h3>Facturer à / Client</h3><p><strong>${escapeHtml(name)}</strong></p>${
    client?.code ? `<p>Code · ${escapeHtml(client.code)}</p>` : ''
  }${client?.email ? `<p>${escapeHtml(client.email)}</p>` : ''}${
    client?.tel ? `<p>${escapeHtml(client.tel)}</p>` : ''
  }${client?.adresse ? `<p>${escapeHtml(client.adresse)}</p>` : ''}</div>`;
}

type CommercialLine = {
  articleId?: string;
  articleLabel: string;
  quantity: number;
  unite?: string | null;
  prixUnitaireAuto?: number;
  totalLigne: number;
  remarks?: string | null;
  configSnapshot?: unknown;
};

type CommercialTotals = {
  sousTotal: number;
  remise: number;
  totalHT: number;
  totalTTC: number;
  tvaRate?: number;
  acompte?: number;
};

type DevisDoc = {
  numero: string;
  statut: string;
  createdAt: Date | string;
  validUntil?: Date | string | null;
  sousTotal: number;
  remise: number;
  totalHT: number;
  totalTTC: number;
  notes?: string | null;
  client?: { name?: string | null; email?: string | null; tel?: string | null; adresse?: string | null; code?: string | null } | null;
  /** QR scannable → dossier commande (proforma / devis lié). */
  scanQrHtml?: string | null;
  lignes: Array<{
    articleId?: string;
    articleLabel: string;
    quantity: number;
    unite?: string | null;
    prixUnitaireAuto?: number;
    totalLigne: number;
    remarks?: string | null;
    configSnapshot?: unknown;
  }>;
};

type FactureDoc = {
  numero: string;
  statut: string;
  createdAt: Date | string;
  echeance?: Date | string | null;
  sousTotal?: number;
  remise?: number;
  tva?: number;
  totalHT: number;
  totalTTC: number;
  montantPaye: number;
  reste: number;
  notes?: string | null;
  lignes?: Array<{ description?: string; qty?: number; pu?: number; total?: number }> | null;
  client?: { name?: string | null; email?: string | null; tel?: string | null; adresse?: string | null; code?: string | null } | null;
  commande?: { id?: string | null; numero?: string | null; article?: string | null } | null;
  /** QR scannable → dossier commande. */
  scanQrHtml?: string | null;
};

function parseFactureLignes(raw: FactureDoc['lignes']): CommercialLine[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((l) => ({
      articleLabel: sanitizeDisplayText(l.description) ?? '',
      quantity: Math.max(0, Number(l.qty ?? 0)),
      prixUnitaireAuto: Number(l.pu ?? 0),
      totalLigne: Number(l.total ?? 0),
    }))
    .filter((l) => validateCommercialLine({
      label: l.articleLabel,
      quantity: l.quantity,
      totalLigne: l.totalLigne,
    }).length === 0);
}

function workOrderHtml(
  articleId: string | undefined,
  configSnapshot: unknown,
  quantity?: number,
): string {
  if (!articleId) return '';
  const lines = summarizeCommercialTechLines(
    sanitizeDisplayLines(
      buildWorkOrderLines(articleId, configSnapshot, { quantity }),
    ),
    4,
  );
  if (!lines.length) return '';
  // Une ligne compacte (évite le bloc vertical trop haut)
  const summary = lines.map((l) => l.replace(/\s*:\s*/, ' · ')).join(' · ');
  return `<div class="tech-detail tech-detail--inline"><strong>Résumé</strong><p>${escapeHtml(summary)}</p></div>`;
}

function docTitle(kind: CommercialDocKind): string {
  if (kind === 'proforma') return 'PROFORMA';
  if (kind === 'facture') return 'FACTURE';
  if (kind === 'recu') return 'REÇU';
  return 'DEVIS';
}

function renderTotalsBlock(totals: CommercialTotals, options?: { showAcompte?: boolean }): string {
  const tvaRate = totals.tvaRate ?? inferTvaRatePercent(totals.totalHT, totals.totalTTC);
  const tvaAmount = Math.max(0, totals.totalTTC - totals.totalHT);
  const acompte = options?.showAcompte ? Math.max(0, totals.acompte ?? 0) : 0;
  const solde = Math.max(0, totals.totalTTC - acompte);
  const tvaLabel = tvaRate > 0 ? `TVA (${tvaRate % 1 === 0 ? tvaRate.toFixed(0) : tvaRate.toFixed(1)} %)` : 'TVA';

  return `<table class="totals">
    <tr><td>Sous-total HT</td><td>${fmtAr(totals.sousTotal)}</td></tr>
    ${totals.remise > 0 ? `<tr><td>Remise</td><td>-${fmtAr(totals.remise)}</td></tr>` : ''}
    <tr><td>Total HT</td><td>${fmtAr(totals.totalHT)}</td></tr>
    ${tvaRate > 0 ? `<tr><td>${escapeHtml(tvaLabel)}</td><td>${fmtAr(tvaAmount)}</td></tr>` : ''}
  </table>
  <div class="total-bar"><span>Total TTC</span><strong>${fmtAr(totals.totalTTC)}</strong></div>
  ${acompte > 0 ? `<table class="totals"><tr><td>Acompte</td><td>-${fmtAr(acompte)}</td></tr><tr><td>Solde à payer</td><td>${fmtAr(solde)}</td></tr></table>` : ''}
  <p class="amount-words"><strong>Arrêté à :</strong> ${escapeHtml(formatAmountInWordsAr(totals.totalTTC))}</p>`;
}

function renderCommercialLinesTable(lignes: CommercialLine[]): string {
  const valid = lignes.filter((l) => validateCommercialLine({
    label: l.articleLabel,
    quantity: l.quantity,
    totalLigne: l.totalLigne,
  }).length === 0);

  const rows = valid
    .map((l, idx) => {
      const label = sanitizeDisplayText(l.articleLabel) ?? 'Article';
      const qty = Math.max(1, l.quantity);
      const pu = l.prixUnitaireAuto ?? l.totalLigne / qty;
      const remarks = sanitizeDisplayText(l.remarks);
      const qtyCell = formatCommercialQtyCell(qty, l.articleId, l.configSnapshot, l.unite);
      return `<tr>
        <td class="item-num">${String(idx + 1).padStart(2, '0')}</td>
        <td><div class="item-title">${escapeHtml(label)}</div>${remarks ? `<div class="item-sub">${escapeHtml(remarks)}</div>` : ''}${workOrderHtml(l.articleId, l.configSnapshot, qty)}</td>
        <td class="num" style="text-align:right">${fmtAr(pu)}</td>
        <td style="text-align:center;white-space:nowrap">${escapeHtml(qtyCell)}</td>
        <td class="num" style="text-align:right;font-weight:900">${fmtAr(l.totalLigne)}</td>
      </tr>`;
    })
    .join('');

  const countBadge = `<span class="article-badge">${valid.length} article${valid.length > 1 ? 's' : ''}</span>`;
  const heading = `<div class="section-title"><h2>Détail des prestations</h2>${countBadge}</div>`;

  if (!rows) {
    return `<div class="items-section">${heading}<div class="items-wrap"><p class="empty-lines">Aucune ligne à afficher pour ce document.</p></div></div>`;
  }

  return `<div class="items-section">${heading}<div class="items-wrap"><table class="items"><thead><tr>
    <th style="width:42px;text-align:center">N°</th>
    <th>Désignation</th>
    <th style="text-align:right;width:18%">P.U. HT</th>
    <th style="text-align:center;width:12%">Qté</th>
    <th style="text-align:right;width:18%">Total HT</th>
  </tr></thead><tbody>${rows}</tbody></table></div></div>`;
}

export function renderDevisHtml(
  devis: DevisDoc,
  options?: { kind?: CommercialDocKind; template?: DocumentTemplateMode; acompte?: number; forPdf?: boolean },
): string {
  const kind = options?.kind ?? 'devis';
  const template = options?.template ?? 'full';
  const forPdf = options?.forPdf ?? false;
  const title = docTitle(kind);
  const tvaRate = inferTvaRatePercent(devis.totalHT, devis.totalTTC);

  const lignes = renderCommercialLinesTable(devis.lignes);
  const totals = renderTotalsBlock({
    sousTotal: devis.sousTotal,
    remise: devis.remise,
    totalHT: devis.totalHT,
    totalTTC: devis.totalTTC,
    tvaRate,
    acompte: options?.acompte,
  }, { showAcompte: (options?.acompte ?? 0) > 0 });

  const bodyClass = template === 'preprinted' ? 'template-preprinted' : '';
  const conditions =
    kind === 'proforma'
      ? 'Document proforma — non valant facture définitive. Prix en Ar. Acompte 50 % à la commande sauf accord.'
      : 'Devis valable 30 jours. Prix en Ar. Acompte 50 % à la commande sauf accord.';

  return `<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8"><title>${title} ${escapeHtml(devis.numero)}</title><style>${commercialDocStyles()}</style></head><body class="${bodyClass}">
    ${forPdf ? '' : '<button class="print-btn no-print" onclick="window.print()">Imprimer / PDF</button>'}
    <div class="sheet">
      ${renderSheetChrome(template)}
      ${renderCommercialHero({
        template,
        forPdf,
        kindLabel: title,
        numero: devis.numero,
        statut: devis.statut,
        metaRows: [
          { label: 'Date', value: fmtDate(devis.createdAt) },
          ...(kind !== 'facture'
            ? [{ label: 'Validité', value: fmtDate(devis.validUntil) }]
            : []),
        ],
        qrHtml: devis.scanQrHtml || undefined,
      })}
      <div class="body">
        <div class="parties">
          ${renderClientPartyBox(devis.client)}
        </div>
        ${lignes}
        <div class="foot-grid">
          <div class="pay-block">
            ${renderConditionsPaymentDuo(conditions, devis.numero)}
            ${renderCommercialNotesHtml(devis.notes)}
            <p class="mentions-compact">Acceptation des conditions ${escapeHtml(COMPANY.name)}.</p>
          </div>
          <div class="totals-card">${totals}</div>
        </div>
        ${renderLetterheadSignatures()}
        ${renderDocFooterLegal({ preprinted: template === 'preprinted' })}
      </div>
    </div>
  </body></html>`;
}

/** Alias proforma — même moteur que devis, titre adapté. */
export function renderProformaHtml(devis: DevisDoc, options?: { template?: DocumentTemplateMode; acompte?: number; forPdf?: boolean }): string {
  return renderDevisHtml(devis, { ...options, kind: 'proforma' });
}

export function renderFactureHtml(
  facture: FactureDoc,
  options?: { template?: DocumentTemplateMode; forPdf?: boolean },
): string {
  const template = options?.template ?? 'full';
  const forPdf = options?.forPdf ?? false;
  const bodyClass = template === 'preprinted' ? 'template-preprinted' : '';
  const parsedLignes = parseFactureLignes(facture.lignes);
  const tvaRate = facture.tva ?? inferTvaRatePercent(facture.totalHT, facture.totalTTC);
  const lignesBlock = parsedLignes.length
    ? renderCommercialLinesTable(parsedLignes)
    : `<div class="items-section"><div class="section-title"><h2>Détail des prestations</h2><span class="article-badge">0 article</span></div><div class="items-wrap"><p class="empty-lines">Aucune ligne à afficher pour ce document.</p></div></div>`;
  const totals = renderTotalsBlock({
    sousTotal: facture.sousTotal ?? facture.totalHT,
    remise: facture.remise ?? 0,
    totalHT: facture.totalHT,
    totalTTC: facture.totalTTC,
    tvaRate,
  });

  const refCmd = facture.commande
    ? `${escapeHtml(sanitizeDisplayText(facture.commande.numero) ?? '')}${facture.commande.article ? ` — ${escapeHtml(sanitizeDisplayText(facture.commande.article) ?? '')}` : ''}`
    : '—';

  return `<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8"><title>Facture ${escapeHtml(facture.numero)}</title><style>${commercialDocStyles()}</style></head><body class="${bodyClass}">
    ${forPdf ? '' : '<button class="print-btn no-print" onclick="window.print()">Imprimer / PDF</button>'}
    <div class="sheet">
      ${renderSheetChrome(template)}
      ${renderCommercialHero({
        template,
        forPdf,
        kindLabel: 'FACTURE',
        numero: facture.numero,
        statut: facture.statut,
        metaRows: [
          { label: 'Date', value: fmtDate(facture.createdAt) },
          { label: 'Échéance', value: fmtDate(facture.echeance) },
        ],
        qrHtml: facture.scanQrHtml || undefined,
      })}
      <div class="body">
        <div class="parties parties--split">
          ${renderClientPartyBox(facture.client)}
          <div class="box alt"><h3>Référence commande</h3><p>${refCmd}</p></div>
        </div>
        ${lignesBlock}
        <div class="foot-grid">
          <div class="pay-block">
            ${renderConditionsPaymentDuo(
              'Facture définitive. Prix en Ar. Paiement selon échéance indiquée.',
              facture.numero,
            )}
            ${renderCommercialNotesHtml(facture.notes)}
            ${renderPayBalance(facture.montantPaye, facture.reste)}
          </div>
          <div class="totals-card">${totals}</div>
        </div>
        ${renderLetterheadSignatures()}
        ${renderDocFooterLegal({ preprinted: template === 'preprinted' })}
      </div>
    </div>
  </body></html>`;
}

/** Ticket / reçu — mêmes données que la facture, layout compact. */
export function renderFactureTicketHtml(
  facture: FactureDoc,
  options?: { forPdf?: boolean },
): string {
  const forPdf = options?.forPdf ?? false;
  const parsedLignes = parseFactureLignes(facture.lignes);
  const clientName = escapeHtml(
    sanitizeDisplayText(facture.client?.name) ?? 'Client',
  );
  const lineRows = parsedLignes
    .slice(0, 8)
    .map((l) => {
      const label = escapeHtml(sanitizeDisplayText(l.articleLabel || 'Article') ?? 'Article');
      const qty = Number(l.quantity) || 1;
      const total = Number(l.totalLigne) || 0;
      return `<tr><td>${label}</td><td class="num">${qty}</td><td class="num">${fmtAr(total)}</td></tr>`;
    })
    .join('');
  const refCmd = facture.commande
    ? escapeHtml(sanitizeDisplayText(facture.commande.numero) ?? '')
    : '—';

  return `<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8"><title>Ticket ${escapeHtml(facture.numero)}</title>
<style>
  @page { size: 80mm auto; margin: 4mm; }
  * { box-sizing: border-box; }
  body { margin: 0; font-family: ui-monospace, Menlo, Consolas, monospace; font-size: 11px; color: #0f172a; background: #fff; }
  .ticket { width: 72mm; max-width: 100%; margin: 0 auto; padding: 8px 6px; }
  .ticket h1 { font-size: 13px; margin: 0 0 4px; text-align: center; letter-spacing: 0.04em; }
  .ticket .muted { color: #64748b; text-align: center; font-size: 10px; margin-bottom: 8px; }
  .ticket .row { display: flex; justify-content: space-between; gap: 8px; margin: 3px 0; }
  .ticket table { width: 100%; border-collapse: collapse; margin: 8px 0; }
  .ticket td { padding: 2px 0; vertical-align: top; }
  .ticket td.num { text-align: right; white-space: nowrap; }
  .ticket .total { font-weight: 800; font-size: 13px; border-top: 1px dashed #94a3b8; margin-top: 6px; padding-top: 6px; }
  .ticket .pay { margin-top: 8px; border-top: 1px dashed #94a3b8; padding-top: 6px; }
  .print-btn { position: fixed; top: 12px; right: 12px; }
  @media print { .no-print { display: none !important; } }
</style></head><body>
  ${forPdf ? '' : '<button class="print-btn no-print" onclick="window.print()">Imprimer</button>'}
  <div class="ticket">
    <h1>TICKET / REÇU</h1>
    <p class="muted">${escapeHtml(facture.numero)} · ${fmtDate(facture.createdAt)}</p>
    <div class="row"><span>Client</span><strong>${clientName}</strong></div>
    <div class="row"><span>Commande</span><strong>${refCmd}</strong></div>
    ${lineRows ? `<table><tbody>${lineRows}</tbody></table>` : ''}
    <div class="row total"><span>Total TTC</span><strong>${fmtAr(facture.totalTTC)}</strong></div>
    <div class="pay">
      <div class="row"><span>Payé</span><strong>${fmtAr(facture.montantPaye ?? 0)}</strong></div>
      <div class="row"><span>Reste</span><strong>${fmtAr(facture.reste ?? Math.max(0, facture.totalTTC - (facture.montantPaye ?? 0)))}</strong></div>
      <div class="row"><span>Statut</span><strong>${escapeHtml(String(facture.statut ?? ''))}</strong></div>
    </div>
    <p class="muted" style="margin-top:10px">Merci — ANS.com</p>
  </div>
</body></html>`;
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export type ProductionWorkOrderDoc = {
  dossierId: string;
  statutGlobal: string;
  priorite: string;
  avancement: number;
  tempsEstimeMin: number;
  tempsReelMin: number;
  delai?: Date | string | null;
  notes?: string | null;
  commande: {
    numero: string;
    article: string;
    statut?: string | null;
    qty?: number | null;
    client?: { name?: string | null; code?: string | null } | null;
    lignes: Array<{
      articleId?: string | null;
      articleLabel: string;
      quantity: number;
      configSnapshot?: unknown;
    }>;
  };
  etapes: Array<{
    ordre: number;
    nom: string;
    statut: string;
    responsable?: string | null;
    machine?: string | null;
    dureeMin?: number | null;
  }>;
  openIncidents?: Array<{ title: string; severity: string }>;
};

function etapeStatusStyle(statut: string): string {
  if (statut === 'Terminé' || statut === 'Sauté') return 'color:#16a34a;font-weight:600';
  if (statut === 'En cours') return 'color:#FF174D;font-weight:600';
  if (statut === 'Bloqué') return 'color:#dc2626;font-weight:600';
  return 'color:#64748b';
}

export function renderProductionWorkOrderHtml(doc: ProductionWorkOrderDoc): string {
  const lineBlocks = doc.commande.lignes.map((ligne, idx) => {
    const spec = buildProductionLineSpec({
      articleId: ligne.articleId,
      articleLabel: ligne.articleLabel,
      quantity: ligne.quantity,
      configSnapshot: ligne.configSnapshot,
    });
    const items = spec.specLines.map((line) => `<li>${escapeHtml(sanitizeDisplayText(line) ?? line)}</li>`).join('');
    return `<div class="line-block">
      <h4>Ligne ${idx + 1} — ${escapeHtml(spec.articleLabel)}</h4>
      <ul>${items}</ul>
    </div>`;
  }).join('');

  const fallbackBlock = lineBlocks || `<div class="line-block"><h4>${escapeHtml(doc.commande.article)}</h4><p>Qté ${doc.commande.qty ?? 1}</p></div>`;

  const etapesRows = doc.etapes.map((e) => `<tr>
    <td style="text-align:center;font-weight:600">${e.ordre}</td>
    <td>${escapeHtml(e.nom)}</td>
    <td style="${etapeStatusStyle(e.statut)}">${escapeHtml(e.statut)}</td>
    <td>${escapeHtml(e.responsable ?? '—')}</td>
    <td>${escapeHtml(e.machine ?? '—')}</td>
    <td style="text-align:right">${e.dureeMin != null ? `${e.dureeMin} min` : '—'}</td>
  </tr>`).join('');

  const incidentsBlock = doc.openIncidents?.length
    ? `<div class="box alert-box"><h3>Incidents ouverts</h3><ul>${doc.openIncidents.map((i) => `<li><strong>${escapeHtml(i.severity)}</strong> — ${escapeHtml(i.title)}</li>`).join('')}</ul></div>`
    : '';

  const extraStyles = `
    .line-block { background:#f8fafc;border:1px solid #e5eaf3;border-radius:10px;padding:14px;margin-bottom:12px; }
    .line-block h4 { font-size:13px;margin-bottom:8px;color:#0f172a; }
    .line-block ul { margin:0;padding-left:18px;font-size:12px;color:#475569;line-height:1.5; }
    .alert-box { border-color:#fecaca;background:#fef2f2; }
    .meta-grid { display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:20px; }
    .meta-grid .box { margin:0; }
  `;

  return `<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8"><title>Fiche fabrication ${escapeHtml(doc.commande.numero)}</title><style>${baseStyles()}${extraStyles}</style></head><body>
    <button class="print-btn no-print" onclick="window.print()">Imprimer / PDF</button>
    <div class="header">
      <div><div class="logo">${COMPANY.name}</div><div class="logo-sub">${COMPANY.tagline}</div><p style="margin-top:8px;font-size:12px;color:#64748b">${COMPANY.address}<br>${COMPANY.email} · ${COMPANY.tel}</p></div>
      <div class="doc-title"><h1>FICHE FABRICATION</h1><p><strong>${escapeHtml(doc.commande.numero)}</strong></p><p>Dossier GPAO · ${escapeHtml(doc.dossierId.slice(-8))}</p><span class="badge">${escapeHtml(doc.statutGlobal)}</span></div>
    </div>
    <div class="meta-grid">
      <div class="box"><h3>Client</h3><p><strong>${escapeHtml(doc.commande.client?.name || '—')}</strong></p>${doc.commande.client?.code ? `<p>Code : ${escapeHtml(doc.commande.client.code)}</p>` : ''}</div>
      <div class="box"><h3>Planning</h3><p>Priorité : <strong>${escapeHtml(doc.priorite)}</strong></p><p>Délai : ${fmtDate(doc.delai)}</p><p>Avancement : ${doc.avancement}%</p></div>
      <div class="box"><h3>Temps</h3><p>Estimé : ${doc.tempsEstimeMin} min</p><p>Réel : ${doc.tempsReelMin} min</p>${doc.commande.statut ? `<p>Statut commande : ${escapeHtml(doc.commande.statut)}</p>` : ''}</div>
    </div>
    ${incidentsBlock}
    <h3 style="font-size:11px;text-transform:uppercase;letter-spacing:0.08em;color:#64748b;margin-bottom:10px">Spécifications articles</h3>
    ${fallbackBlock}
    <h3 style="font-size:11px;text-transform:uppercase;letter-spacing:0.08em;color:#64748b;margin:20px 0 10px">Workflow GPAO — 16 étapes</h3>
    <table><thead><tr><th style="width:40px">#</th><th>Étape</th><th>Statut</th><th>Responsable</th><th>Machine</th><th style="text-align:right">Durée</th></tr></thead><tbody>${etapesRows}</tbody></table>
    ${doc.notes ? `<div class="box"><h3>Notes dossier</h3><p>${escapeHtml(doc.notes)}</p></div>` : ''}
    <div class="footer"><p>${escapeHtml(COMPANY.legalName)} · NIF ${escapeHtml(COMPANY.nif)} · STAT ${escapeHtml(COMPANY.stat)} · RCS ${escapeHtml(COMPANY.rcs)}</p><p style="margin-top:6px">${escapeHtml(COMPANY.name)} — Fiche fabrication ANS ORION ERP · ${new Date().toLocaleString('fr-FR')}</p><p style="margin-top:12px">Opérateur : _________________________ &nbsp;&nbsp; Date : _____________ &nbsp;&nbsp; Visa QC : _____________</p></div>
  </body></html>`;
}
