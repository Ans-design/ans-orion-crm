/**
 * SEC-001 — règles d’exclusion export (partagées tests + scripts).
 */

export const FORBIDDEN_NAME_RE = [
  /^\.env(?!\.example$)/i,
  /\.env\.backup/i,
  /\.db$/i,
  /\.sqlite/i,
  /\.pem$/i,
  /\.key$/i,
  /\.p12$/i,
  /\.pfx$/i,
  /id_rsa/i,
  /credentials\.json$/i,
];

export const FORBIDDEN_CONTENT_RE = [
  /CANARY_SECRET_EXPORT_V10_DO_NOT_SHIP/i,
  /CANARY_DB_EXPORT_V10_DO_NOT_SHIP/i,
  /BEGIN (RSA |OPENSSH )?PRIVATE KEY/i,
  /AKIA[0-9A-Z]{16}/,
];

export function isForbiddenExportPath(relPath: string): boolean {
  const base = relPath.replace(/\\/g, '/').split('/').pop() ?? '';
  return FORBIDDEN_NAME_RE.some((re) => re.test(base));
}

export function scanTextForForbiddenContent(text: string): boolean {
  return FORBIDDEN_CONTENT_RE.some((re) => re.test(text));
}
