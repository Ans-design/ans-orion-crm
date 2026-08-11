'use client';

import { useCallback, useMemo } from 'react';
import {
  BACHE_EYELET_MODES,
  EYELET_POSITION_LABELS,
  type BacheEyeletsData,
  type LegacyEyeletPosition,
  computeEyelets,
  ensureMandatoryCornerIds,
  generateEyeletPositions,
  getEyeletBulkSelection,
  getMandatoryCornerIds,
  isMandatoryCornerId,
  resolveEyeletPreviewPoints,
} from '@/lib/grand-format/bache-eyelets';
import { EYELET_UNIT_PRICE_AR } from '@/lib/grand-format/bache-rules';
import { cmToM, formatCmValue } from '@/lib/dimensions/grand-format-units';

type Props = {
  value: BacheEyeletsData;
  onChange: (next: BacheEyeletsData) => void;
  longueurCm?: number;
  largeurCm?: number;
  /** @deprecated utiliser longueurCm / largeurCm */
  longueurM?: number;
  /** @deprecated utiliser largeurCm */
  largeurM?: number;
  unitPrice?: number;
  compact?: boolean;
  dimensionsReady?: boolean;
};

function legacyPositionCoords(id: LegacyEyeletPosition): { x: string; y: string } {
  const map: Record<LegacyEyeletPosition, { x: string; y: string }> = {
    'top-left': { x: '8%', y: '8%' },
    'top-center': { x: '50%', y: '8%' },
    'top-right': { x: '92%', y: '8%' },
    'middle-left': { x: '8%', y: '50%' },
    'middle-right': { x: '92%', y: '50%' },
    'bottom-left': { x: '8%', y: '92%' },
    'bottom-center': { x: '50%', y: '92%' },
    'bottom-right': { x: '92%', y: '92%' },
  };
  return map[id];
}

/** Point jaune œillet — style aperçu métier */
function EyeletDot({
  x,
  y,
  title,
  interactive,
  active,
  onClick,
}: {
  x: number;
  y: number;
  title: string;
  interactive?: boolean;
  active?: boolean;
  onClick?: () => void;
}) {
  /* Inset 6 % pour rester dans le cadre (comme capture) */
  const left = `${6 + x * 88}%`;
  const top = `${6 + y * 88}%`;
  const cls = interactive
    ? `absolute w-3.5 h-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 z-10 transition-transform ${
        active
          ? 'bg-[#FACC15] border-[#CA8A04] scale-110 shadow-[0_0_0_2px_rgba(250,204,21,0.35)]'
          : 'bg-background/90 border-muted-foreground/45 hover:border-[#FACC15] hover:scale-110'
      }`
    : 'absolute w-3.5 h-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#FACC15] border-2 border-[#CA8A04] shadow-[0_0_0_2px_rgba(250,204,21,0.35)] z-10';

  if (interactive) {
    return (
      <button
        type="button"
        title={title}
        aria-label={title}
        onClick={onClick}
        className={cls}
        style={{ left, top }}
      />
    );
  }
  return (
    <span title={title} className={cls} style={{ left, top }} aria-hidden />
  );
}

export function BacheEyeletsSelector({
  value,
  onChange,
  longueurCm: longueurCmProp,
  largeurCm: largeurCmProp,
  longueurM,
  largeurM,
  unitPrice = EYELET_UNIT_PRICE_AR,
  compact = false,
  dimensionsReady = true,
}: Props) {
  const longueurCm = dimensionsReady
    ? (longueurCmProp ?? (longueurM != null ? longueurM * 100 : 200))
    : 0;
  const largeurCm = dimensionsReady
    ? (largeurCmProp ?? (largeurM != null ? largeurM * 100 : 100))
    : 0;
  const longueurMInternal = cmToM(longueurCm);
  const largeurMInternal = cmToM(largeurCm);

  const ratio = useMemo(() => {
    const l = Math.max(0.1, longueurMInternal);
    const w = Math.max(0.1, largeurMInternal);
    return l / w;
  }, [longueurMInternal, largeurMInternal]);

  const gridPositions = useMemo(
    () => generateEyeletPositions({ longueurM: longueurMInternal, largeurM: largeurMInternal }),
    [longueurMInternal, largeurMInternal],
  );

  const cornerIds = useMemo(
    () => getMandatoryCornerIds(longueurMInternal, largeurMInternal),
    [longueurMInternal, largeurMInternal],
  );

  const manualPositions = useMemo(() => {
    const raw = Array.isArray(value.positions) ? value.positions.map(String) : [];
    if (value.mode !== 'Placement manuel') return raw;
    return ensureMandatoryCornerIds(raw, longueurMInternal, largeurMInternal);
  }, [value.positions, value.mode, longueurMInternal, largeurMInternal]);

  const preview = useMemo(
    () =>
      computeEyelets({
        mode: value.mode,
        longueurM: longueurMInternal,
        largeurM: largeurMInternal,
        customCount: value.customCount ?? value.count,
        manualPositions,
        unitPrice,
      }),
    [value, longueurMInternal, largeurMInternal, manualPositions, unitPrice],
  );

  const previewDots = useMemo(
    () =>
      resolveEyeletPreviewPoints({
        mode: value.mode,
        longueurM: longueurMInternal,
        largeurM: largeurMInternal,
        customCount: value.customCount ?? value.count,
        manualPositions,
      }),
    [value.mode, value.customCount, value.count, longueurMInternal, largeurMInternal, manualPositions],
  );

  const setMode = useCallback(
    (mode: string) => {
      if (mode === 'Placement manuel') {
        const positions = getMandatoryCornerIds(longueurMInternal, largeurMInternal);
        onChange({
          mode,
          count: positions.length,
          positions,
          unitPrice,
          total: positions.length * unitPrice,
        });
        return;
      }
      if (mode === 'Nombre personnalisé') {
        const customCount = Math.max(4, value.customCount ?? 4);
        onChange({ mode, customCount, positions: [], unitPrice });
        return;
      }
      onChange({ mode, positions: [], unitPrice });
    },
    [onChange, value.customCount, unitPrice, longueurMInternal, largeurMInternal],
  );

  const updateManual = useCallback(
    (next: string[]) => {
      const positions = ensureMandatoryCornerIds(next, longueurMInternal, largeurMInternal);
      onChange({
        mode: 'Placement manuel',
        positions,
        count: positions.length,
        unitPrice,
        total: positions.length * unitPrice,
      });
    },
    [onChange, unitPrice, longueurMInternal, largeurMInternal],
  );

  const toggleManual = useCallback(
    (id: string) => {
      // Les 4 coins restent toujours sélectionnés
      if (isMandatoryCornerId(id, longueurMInternal, largeurMInternal)) return;
      const current = new Set(manualPositions);
      if (current.has(id)) current.delete(id);
      else current.add(id);
      updateManual([...current]);
    },
    [manualPositions, updateManual, longueurMInternal, largeurMInternal],
  );

  const applyBulk = useCallback(
    (type: 'corners' | 'top_bottom' | 'perimeter' | 'clear') => {
      if (type === 'clear') {
        updateManual(cornerIds);
        return;
      }
      updateManual(getEyeletBulkSelection(type, longueurMInternal, largeurMInternal));
    },
    [longueurMInternal, largeurMInternal, updateManual, cornerIds],
  );

  const rectStyle = useMemo(() => {
    const maxW = compact ? 200 : 240;
    const maxH = compact ? 150 : 170;
    let w = maxW;
    let h = w / ratio;
    if (h > maxH) {
      h = maxH;
      w = h * ratio;
    }
    return { width: Math.round(w), height: Math.round(h) };
  }, [ratio, compact]);

  const isManual = value.mode === 'Placement manuel';

  return (
    <div className={`rounded-[7px] border border-border bg-card/50 ${compact ? 'p-3' : 'p-4'}`}>
      <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground mb-2">
        Positionnez les œillets sur la bâche
      </p>

      <div className="flex flex-col sm:flex-row sm:items-start gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap gap-1.5 mb-3">
            {BACHE_EYELET_MODES.map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setMode(mode)}
                className={`px-2.5 py-1.5 rounded-md text-[10px] font-semibold transition-all ${
                  value.mode === mode
                    ? 'chip-selected-accent shadow-sm'
                    : 'bg-accent text-muted-foreground hover:text-foreground'
                }`}
              >
                {mode}
              </button>
            ))}
          </div>

          {value.mode === 'Nombre personnalisé' && (
            <div className="mb-3 flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <label className="text-[10px] text-muted-foreground">Nombre d&apos;œillets</label>
                <input
                  type="number"
                  min={4}
                  value={value.customCount ?? value.count ?? 4}
                  onChange={(e) =>
                    onChange({
                      ...value,
                      mode: 'Nombre personnalisé',
                      customCount: Math.max(4, parseInt(e.target.value, 10) || 4),
                      unitPrice,
                    })
                  }
                  className="w-20 rounded-lg bg-accent px-2 py-1 text-xs font-mono outline-none"
                />
              </div>
              <p className="text-[9px] text-muted-foreground italic">
                Minimum 4 — les coins sont toujours inclus.
              </p>
            </div>
          )}

          {isManual && (
            <p className="text-[10px] text-muted-foreground mb-2 italic">
              Les 4 coins sont obligatoires. Cliquez pour ajouter / retirer les autres points.
            </p>
          )}

          {(preview.count > 0 || isManual) && (
            <p className="text-[10px] text-muted-foreground">
              Œillets sélectionnés :{' '}
              <strong className="text-foreground">{preview.count}</strong>
              {preview.count > 0 && (
                <>
                  {' — '}
                  Prix : {preview.count} × {unitPrice.toLocaleString('fr-FR')} Ar ={' '}
                  <strong className="text-foreground">
                    {preview.total.toLocaleString('fr-FR')} Ar
                  </strong>
                </>
              )}
            </p>
          )}

          {isManual && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              <button
                type="button"
                onClick={() => applyBulk('clear')}
                className="px-2 py-1 rounded text-[9px] font-semibold bg-accent hover:bg-accent/80 text-muted-foreground"
              >
                Coins uniquement
              </button>
              <button
                type="button"
                onClick={() => applyBulk('corners')}
                className="px-2 py-1 rounded text-[9px] font-semibold bg-accent hover:bg-accent/80 text-muted-foreground"
              >
                Réinitialiser les coins
              </button>
              <button
                type="button"
                onClick={() => applyBulk('top_bottom')}
                className="px-2 py-1 rounded text-[9px] font-semibold bg-accent hover:bg-accent/80 text-muted-foreground"
              >
                Sélectionner haut + bas
              </button>
              <button
                type="button"
                onClick={() => applyBulk('perimeter')}
                className="px-2 py-1 rounded text-[9px] font-semibold bg-accent hover:bg-accent/80 text-muted-foreground"
              >
                Sélectionner tout le contour
              </button>
            </div>
          )}
        </div>

        <div
          className="relative shrink-0 border-2 border-dashed border-slate-300 bg-slate-100/80 rounded-sm mx-auto sm:mx-0"
          style={rectStyle}
          role="img"
          aria-label={`Aperçu bâche ${formatCmValue(longueurCm)} × ${formatCmValue(largeurCm)} cm — ${preview.count} œillet(s)`}
        >
          <span className="absolute -top-5 left-0 text-[9px] text-muted-foreground whitespace-nowrap">
            {formatCmValue(longueurCm)} cm
          </span>
          <span className="absolute -right-10 top-1/2 -translate-y-1/2 text-[9px] text-muted-foreground rotate-90 origin-center whitespace-nowrap">
            {formatCmValue(largeurCm)} cm
          </span>

          {/* Mode manuel : grille cliquable */}
          {isManual &&
            gridPositions.map((pt) => (
              <EyeletDot
                key={pt.id}
                x={pt.x}
                y={pt.y}
                title={pt.label}
                interactive
                active={manualPositions.includes(pt.id)}
                onClick={() => toggleManual(pt.id)}
              />
            ))}

          {/* Modes auto : points jaunes selon calcul */}
          {!isManual &&
            previewDots.map((pt) => (
              <EyeletDot key={pt.id} x={pt.x} y={pt.y} title={pt.label} />
            ))}

          {/* Legacy positions */}
          {isManual &&
            manualPositions
              .filter((id) => !gridPositions.some((p) => p.id === id) && id in EYELET_POSITION_LABELS)
              .map((id) => {
                const { x, y } = legacyPositionCoords(id as LegacyEyeletPosition);
                return (
                  <button
                    key={id}
                    type="button"
                    title={EYELET_POSITION_LABELS[id as LegacyEyeletPosition]}
                    onClick={() => toggleManual(id)}
                    className="absolute w-3.5 h-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#FACC15] border-2 border-[#CA8A04] z-10"
                    style={{ left: x, top: y }}
                  />
                );
              })}
        </div>
      </div>
    </div>
  );
}
