'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { uxToast } from '@/lib/ux/feedback';
import { DollarSign, Search, Save, Edit3, Filter, ChevronDown, ChevronUp, Package, RotateCcw } from 'lucide-react';
import { CATALOGUE, CATEGORIES, CAT_LABELS, formatPrice } from '@/lib/data/catalogue';
import type { CatalogueItem } from '@/lib/data/catalogue';
import { getProductConfig } from '@/lib/data/config-types';
import { DEFAULT_GLOBAL_PRICING, PRODUCTION_DELAYS, BAT_OPTIONS, LIVRAISON_OPTIONS, type GlobalPricingConfig } from '@/lib/data/global-pricing';
import { ANS } from '@/lib/ans-colors';

export function TarifsLegacyGrid({ readOnly = false }: { readOnly?: boolean }) {
  const [dbTarifs, setDbTarifs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterCat, setFilterCat] = useState<string>('all');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Record<string, any>>({});
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [globalPricing, setGlobalPricing] = useState<GlobalPricingConfig>(DEFAULT_GLOBAL_PRICING);
  const [savingGlobal, setSavingGlobal] = useState(false);
  const [showGlobal, setShowGlobal] = useState(true);

  const loadGlobalPricing = useCallback(async () => {
    try {
      const r = await fetch('/api/global-pricing');
      if (!r.ok) {
        uxToast.error(`Paramètres globaux indisponibles (${r.status})`);
        return;
      }
      setGlobalPricing(await r.json());
    } catch {
      uxToast.error('Réseau indisponible — paramètres globaux');
    }
  }, []);

  const saveGlobalPricing = async () => {
    if (readOnly) {
      uxToast.info('Archive lecture seule — variables via /administration/variables');
      return;
    }
    setSavingGlobal(true);
    try {
      const r = await fetch('/api/global-pricing', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(globalPricing) });
      if (r.ok) { uxToast.success('Paramètres globaux enregistrés'); setGlobalPricing(await r.json()); }
      else uxToast.error('Erreur sauvegarde');
    } catch { uxToast.error('Erreur réseau'); }
    setSavingGlobal(false);
  };

  const loadTarifs = useCallback(async () => {
    try {
      const r = await fetch('/api/tarifs');
      if (!r.ok) {
        uxToast.error(`Tarifs indisponibles (${r.status})`);
        return;
      }
      setDbTarifs(await r.json());
    } catch {
      uxToast.error('Réseau indisponible — tarifs');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadTarifs(); loadGlobalPricing(); }, [loadTarifs, loadGlobalPricing]);

  const articles = useMemo(() => {
    return (CATALOGUE || []).map((art: CatalogueItem) => {
      const cfg = getProductConfig(art.id);
      const overrides = dbTarifs.filter((t: any) => t.articleId === art.id && t.actif);
      return {
        ...art,
        config: cfg,
        priceTiers: cfg?.priceTiers || [],
        prixBase: cfg?.prixBase || art.prixDepart || 0,
        prixM2: cfg?.prixM2 || null,
        prixCm2: cfg?.prixCm2 || null,
        dbOverrides: overrides,
        hasOverride: overrides.length > 0,
      };
    });
  }, [dbTarifs]);

  const filtered = useMemo(() => {
    let list = articles;
    if (filterCat !== 'all') list = list.filter(a => a.category === filterCat);
    if (search) {
      const s = search.toLowerCase();
      list = list.filter(a => a.name.toLowerCase().includes(s) || a.id.toLowerCase().includes(s) || (a.description || '').toLowerCase().includes(s));
    }
    return list;
  }, [articles, filterCat, search]);

  const catCounts = useMemo(() => {
    const counts: Record<string, number> = { all: articles.length };
    articles.forEach(a => { counts[a.category] = (counts[a.category] || 0) + 1; });
    return counts;
  }, [articles]);

  const startEdit = (art: any) => {
    if (readOnly) {
      uxToast.info('Archive lecture seule — éditer via Articles finis / Formules');
      return;
    }
    setEditingId(art.id);
    setEditForm({
      prixBase: art.prixBase || 0,
      prixM2: art.prixM2 || '',
      prixCm2: art.prixCm2 || '',
      tier1_max: art.priceTiers[0]?.max || 9,
      tier1_px: art.priceTiers[0]?.px || 0,
      tier2_max: art.priceTiers[1]?.max || 49,
      tier2_px: art.priceTiers[1]?.px || 0,
      tier3_max: art.priceTiers[2]?.max || 99,
      tier3_px: art.priceTiers[2]?.px || 0,
      tier4_max: art.priceTiers[3]?.max || 499,
      tier4_px: art.priceTiers[3]?.px || 0,
      tier5_px: art.priceTiers[4]?.px || 0,
    });
  };

  const saveEdit = async (articleId: string) => {
    if (readOnly) return;
    setSaving(true);
    try {
      const tiers = [
        { palier: editForm.tier1_max, prixUnitaire: editForm.tier1_px },
        { palier: editForm.tier2_max, prixUnitaire: editForm.tier2_px },
        { palier: editForm.tier3_max, prixUnitaire: editForm.tier3_px },
        { palier: editForm.tier4_max, prixUnitaire: editForm.tier4_px },
        { palier: 99999, prixUnitaire: editForm.tier5_px },
      ].filter(t => t.prixUnitaire > 0);

      for (const tier of tiers) {
        await fetch('/api/tarifs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            articleId,
            palier: tier.palier,
            prixDepart: editForm.prixBase || 0,
            prixUnitaire: tier.prixUnitaire,
          }),
        });
      }

      uxToast.success('Tarifs mis à jour');
      setEditingId(null);
      loadTarifs();
    } catch {
      uxToast.error('Erreur de sauvegarde');
    } finally { setSaving(false); }
  };

  const stats = useMemo(() => {
    const total = articles.length;
    const withPrice = articles.filter(a => (a.priceTiers.length > 0 || a.prixBase > 0 || a.prixM2 || a.prixCm2)).length;
    const withOverride = articles.filter(a => a.hasOverride).length;
    return { total, withPrice, withOverride, noPrice: total - withPrice };
  }, [articles]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold flex items-center gap-3">
            <div className="w-10 h-10 rounded-[7px] bg-primary/10 flex items-center justify-center">
              <DollarSign className="text-primary" size={20} />
            </div>
            Admin Prix — Backoffice
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Source unique PRIX — production, BAT, livraison & grille articles</p>
        </div>
      </div>

      <div className="bg-card border border-border rounded-[7px] overflow-hidden">
        <button type="button" onClick={() => setShowGlobal(v => !v)} className="w-full flex items-center justify-between px-4 py-3 bg-primary/5 hover:bg-primary/10 transition-colors">
          <div className="text-left">
            <h2 className="font-display font-bold text-sm">Production & Livraison — paramètres globaux</h2>
            <p className="text-[10px] text-muted-foreground mt-0.5">Multiplicateurs délai, frais BAT et livraison — répercussion immédiate sur les calculs</p>
          </div>
          {showGlobal ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </button>
        {showGlobal && (
          <div className="p-4 grid md:grid-cols-3 gap-4 border-t border-border">
            <div>
              <h3 className="text-[10px] font-bold uppercase text-muted-foreground mb-2">Délai production — multiplicateur</h3>
              <div className="space-y-2">
                {PRODUCTION_DELAYS.map(d => (
                  <div key={d.key} className="flex items-center justify-between gap-2">
                    <span className="text-xs">{d.label}</span>
                    <input type="number" step="0.1" min={1} value={globalPricing.production[d.multiplierKey]}
                      onChange={e => setGlobalPricing(g => ({ ...g, production: { ...g.production, [d.multiplierKey]: parseFloat(e.target.value) || 1 } }))}
                      className="w-20 text-right font-mono text-sm bg-accent border border-border rounded-lg px-2 py-1 text-primary" />
                  </div>
                ))}
              </div>
            </div>
            <div>
              <h3 className="text-[10px] font-bold uppercase text-muted-foreground mb-2">BAT / Épreuve — frais fixe (Ar)</h3>
              <div className="space-y-2">
                {BAT_OPTIONS.map(b => (
                  <div key={b.key} className="flex items-center justify-between gap-2">
                    <span className="text-xs">{b.label}</span>
                    <input type="number" min={0} value={globalPricing.bat[b.priceKey]}
                      onChange={e => setGlobalPricing(g => ({ ...g, bat: { ...g.bat, [b.priceKey]: parseInt(e.target.value) || 0 } }))}
                      className="w-24 text-right font-mono text-sm bg-accent border border-border rounded-lg px-2 py-1 text-primary" />
                  </div>
                ))}
              </div>
            </div>
            <div>
              <h3 className="text-[10px] font-bold uppercase text-muted-foreground mb-2">Conditionnement / Livraison (Ar)</h3>
              <div className="space-y-2">
                {LIVRAISON_OPTIONS.map(l => (
                  <div key={l.key} className="flex items-center justify-between gap-2">
                    <span className="text-xs">{l.label}</span>
                    <input type="number" min={0} value={globalPricing.livraison[l.priceKey]}
                      onChange={e => setGlobalPricing(g => ({ ...g, livraison: { ...g.livraison, [l.priceKey]: parseInt(e.target.value) || 0 } }))}
                      className="w-24 text-right font-mono text-sm bg-accent border border-border rounded-lg px-2 py-1 text-primary" />
                  </div>
                ))}
              </div>
            </div>
            <div className="md:col-span-3 flex items-center justify-between pt-2 border-t border-border">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>TVA par défaut</span>
                <input type="number" min={0} max={100} value={globalPricing.tvaDefault}
                  onChange={e => setGlobalPricing(g => ({ ...g, tvaDefault: parseFloat(e.target.value) || 20 }))}
                  className="w-16 text-center font-mono bg-accent border border-border rounded-lg px-2 py-1" />
                <span>%</span>
              </div>
              <button onClick={saveGlobalPricing} disabled={savingGlobal || readOnly} className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-semibold hover:brightness-110 disabled:opacity-50 flex items-center gap-2">
                <Save size={14} /> {readOnly ? 'Lecture seule' : savingGlobal ? 'Enregistrement...' : 'Sauvegarder paramètres globaux'}
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total articles', value: stats.total, color: ANS.red, icon: Package },
          { label: 'Avec prix auto', value: stats.withPrice, color: '#10B981', icon: DollarSign },
          { label: 'Tarifs personnalisés', value: stats.withOverride, color: ANS.red, icon: Edit3 },
          { label: 'Sans prix', value: stats.noPrice, color: ANS.yellow, icon: Filter },
        ].map(s => (
          <div key={s.label} className="bg-card border border-border rounded-[7px] p-4">
            <div className="flex items-center gap-2 mb-1">
              <s.icon size={14} style={{ color: s.color }} />
              <span className="text-[10px] font-bold text-muted-foreground uppercase">{s.label}</span>
            </div>
            <span className="text-2xl font-display font-bold" style={{ color: s.color }}>{s.value}</span>
          </div>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher un article..." className="w-full pl-10 pr-4 py-2.5 bg-card border border-border rounded-[7px] text-sm outline-none focus:ring-2 focus:ring-primary/30" />
        </div>
        <select value={filterCat} onChange={e => setFilterCat(e.target.value)} className="bg-card border border-border rounded-[7px] px-4 py-2.5 text-sm outline-none">
          <option value="all">Toutes catégories ({catCounts.all})</option>
          {(CATEGORIES || []).map(cat => (
            <option key={cat.id} value={cat.id}>{CAT_LABELS[cat.id] || cat.id} ({catCounts[cat.id] || 0})</option>
          ))}
        </select>
      </div>

      <div className="bg-card border border-border rounded-[7px] overflow-hidden">
        <div className="grid grid-cols-12 gap-2 px-4 py-3 bg-accent/50 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
          <div className="col-span-1">Icône</div>
          <div className="col-span-3">Article</div>
          <div className="col-span-2">Catégorie</div>
          <div className="col-span-2">Prix départ</div>
          <div className="col-span-2">Mode prix</div>
          <div className="col-span-2 text-right">Actions</div>
        </div>

        {loading ? (
          <div className="p-8 text-center text-muted-foreground">Chargement...</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">Aucun article trouvé</div>
        ) : (
          <div className="divide-y divide-border">
            {filtered.map(art => (
              <div key={art.id}>
                <div className="grid grid-cols-12 gap-2 px-4 py-3 items-center hover:bg-accent/30 transition-colors cursor-pointer" onClick={() => setExpandedId(expandedId === art.id ? null : art.id)}>
                  <div className="col-span-1 text-xl">{art.icon}</div>
                  <div className="col-span-3">
                    <p className="text-sm font-semibold truncate">{art.name}</p>
                    <p className="text-[10px] text-muted-foreground font-mono">{art.id}</p>
                  </div>
                  <div className="col-span-2">
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-accent font-semibold">{CAT_LABELS[art.category] || art.category}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="font-mono font-bold text-sm">
                      {art.prixBase > 0 ? `${formatPrice(art.prixBase)} Ar` : art.prixM2 ? `${formatPrice(art.prixM2)} Ar/m²` : art.prixCm2 ? `${formatPrice(art.prixCm2)} Ar/cm²` : '—'}
                    </span>
                  </div>
                  <div className="col-span-2">
                    {art.priceTiers.length > 0 ? (
                      <span className="text-[10px] px-2 py-1 rounded-full bg-[#10B981]/10 text-[#10B981] font-bold">Paliers ({art.priceTiers.length})</span>
                    ) : art.prixM2 ? (
                      <span className="text-[10px] px-2 py-1 rounded-full bg-primary/10 text-primary font-bold">Prix/m²</span>
                    ) : art.prixCm2 ? (
                      <span className="text-[10px] px-2 py-1 rounded-full bg-amber-500/10 text-amber-600 font-bold">Prix/cm²</span>
                    ) : (
                      <span className="text-[10px] px-2 py-1 rounded-full bg-amber-500/10 text-amber-600 font-bold">À configurer</span>
                    )}
                    {art.hasOverride && <span className="ml-1 text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-bold">DB</span>}
                  </div>
                  <div className="col-span-2 flex justify-end gap-2">
                    <button onClick={e => { e.stopPropagation(); startEdit(art); }} className="p-2 rounded-lg bg-accent hover:bg-primary/10 transition-colors">
                      <Edit3 size={14} />
                    </button>
                    {expandedId === art.id ? <ChevronUp size={16} className="text-muted-foreground" /> : <ChevronDown size={16} className="text-muted-foreground" />}
                  </div>
                </div>

                <AnimatePresence>
                  {expandedId === art.id && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                      <div className="px-4 pb-4 space-y-3">
                        <div className="bg-accent/30 rounded-lg p-3">
                          <p className="text-xs text-muted-foreground mb-2">{art.description}</p>
                          {art.priceTiers.length > 0 && (
                            <div>
                              <p className="text-[10px] font-bold text-muted-foreground mb-1">Grille tarifaire :</p>
                              <div className="flex flex-wrap gap-2">
                                {art.priceTiers.map((t: any, i: number) => (
                                  <div key={i} className="bg-card rounded-lg px-3 py-2 border border-border">
                                    <span className="text-[10px] text-muted-foreground">≤ {t.max ?? '∞'} ex</span>
                                    <span className="block font-mono font-bold text-sm text-primary">{formatPrice(t.px)} Ar</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          {art.prixM2 && <p className="text-xs mt-2">💰 Prix par m² : <span className="font-mono font-bold text-primary">{formatPrice(art.prixM2)} Ar/m²</span></p>}
                          {art.prixCm2 && <p className="text-xs mt-2">💰 Prix par cm² : <span className="font-mono font-bold text-amber-600">{formatPrice(art.prixCm2)} Ar/cm²</span></p>}
                          {art.dbOverrides.length > 0 && (
                            <div className="mt-2">
                              <p className="text-[10px] font-bold text-primary mb-1">Tarifs personnalisés (DB) :</p>
                              <div className="flex flex-wrap gap-2">
                                {art.dbOverrides.map((o: any) => (
                                  <div key={o.id} className="bg-primary/5 border border-primary/20 rounded-lg px-3 py-2">
                                    <span className="text-[10px] text-muted-foreground">Palier {o.palier}</span>
                                    <span className="block font-mono font-bold text-sm text-primary">{formatPrice(o.prixUnitaire)} Ar</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <AnimatePresence>
                  {editingId === art.id && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                      <div className="px-4 pb-4">
                        <div className="bg-primary/5 border border-primary/20 rounded-[7px] p-4 space-y-4">
                          <h4 className="text-sm font-bold flex items-center gap-2">
                            <Edit3 size={14} className="text-primary" /> Modifier les tarifs — {art.name}
                          </h4>
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                            <div>
                              <label className="text-[10px] font-bold text-muted-foreground">Prix de base (Ar)</label>
                              <input type="number" value={editForm.prixBase} onChange={e => setEditForm({...editForm, prixBase: parseInt(e.target.value) || 0})} className="w-full bg-background rounded-lg px-3 py-2 text-sm font-mono border border-border outline-none focus:ring-2 focus:ring-primary/30" />
                            </div>
                          </div>
                          <div>
                            <p className="text-[10px] font-bold text-muted-foreground mb-2">Grille par paliers :</p>
                            <div className="grid grid-cols-1 sm:grid-cols-5 gap-2">
                              {[1,2,3,4,5].map(i => (
                                <div key={i} className="bg-background rounded-lg p-2 border border-border">
                                  <label className="text-[9px] text-muted-foreground">{i < 5 ? `≤ ${editForm[`tier${i}_max`]} ex` : '500+ ex'}</label>
                                  {i < 5 && <input type="number" value={editForm[`tier${i}_max`]} onChange={e => setEditForm({...editForm, [`tier${i}_max`]: parseInt(e.target.value) || 0})} className="w-full bg-accent rounded px-2 py-1 text-[10px] font-mono mb-1 outline-none" placeholder="Max qty" />}
                                  <input type="number" value={editForm[`tier${i}_px`]} onChange={e => setEditForm({...editForm, [`tier${i}_px`]: parseInt(e.target.value) || 0})} className="w-full bg-accent rounded px-2 py-1 text-sm font-mono font-bold outline-none focus:ring-1 focus:ring-primary/30" placeholder="Prix Ar" />
                                </div>
                              ))}
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <button onClick={() => saveEdit(art.id)} disabled={saving} className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-bold hover:brightness-110 flex items-center gap-2 disabled:opacity-50">
                              <Save size={14} /> {saving ? 'Sauvegarde...' : 'Sauvegarder'}
                            </button>
                            <button onClick={() => setEditingId(null)} className="px-4 py-2 bg-accent rounded-lg text-sm font-semibold hover:bg-accent/80 flex items-center gap-2">
                              <RotateCcw size={14} /> Annuler
                            </button>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
