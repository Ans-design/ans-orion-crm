/** Libellé affiché — VIP/Premium → Client fidèle */
export function displayClientStatut(statut: string): string {
  if (statut === 'VIP' || statut === 'Premium') return 'Client fidèle';
  return statut;
}

export function isClientFidele(client: {
  statut?: string | null;
  cmds?: number | null;
  caTotal?: number | null;
  ca?: string | null;
}): boolean {
  if (client.statut === 'VIP' || client.statut === 'Premium') return true;
  const nombreCommandes = typeof client.cmds === 'number' ? client.cmds : 0;
  const caFromTotal = client.caTotal ?? 0;
  const caParsed = parseFloat(String(client.ca ?? '0').replace(/[^\d.-]/g, '')) || 0;
  const caNum = Math.max(caFromTotal, caParsed);
  return nombreCommandes >= 5 || caNum >= 5_000_000;
}

export function validateNif(nif: string): string | null {
  const trimmed = nif.trim();
  if (!trimmed) return 'Le NIF est obligatoire';
  if (!/^\d+$/.test(trimmed)) return 'Le NIF ne doit contenir que des chiffres';
  return null;
}

export function parseClientType(type: string | null | undefined): { type: string; typeAutre: string } {
  if (!type) return { type: 'Entreprise', typeAutre: '' };
  const dash = type.match(/^Autre\s*[—–-]\s*(.+)$/i);
  if (dash) return { type: 'Autre', typeAutre: dash[1].trim() };
  if (type.startsWith('Autre:')) return { type: 'Autre', typeAutre: type.slice(6).trim() };
  return { type, typeAutre: '' };
}

export function formatClientType(type: string, typeAutre: string): string {
  if (type === 'Autre') return `Autre — ${typeAutre.trim()}`;
  return type;
}

export function parseCanalStored(stored: string | null | undefined): { value: string; autre: string } {
  if (!stored) return { value: '', autre: '' };
  if (stored.startsWith('Autre:')) return { value: 'Autre', autre: stored.slice(6).trim() };
  if (stored.startsWith('Autre —')) return { value: 'Autre', autre: stored.slice(7).trim() };
  return { value: stored, autre: '' };
}

export function canalStoredValue(select: string, autre: string): string | null {
  if (!select) return null;
  if (select === 'Autre') {
    const d = autre.trim();
    return d ? `Autre: ${d}` : 'Autre';
  }
  return select;
}
