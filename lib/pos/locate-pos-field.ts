/** Événement : ouvrir la section + animer toutes les zones de sélection. */
export const POS_LOCATE_FIELD = 'pos:locate-field';

type LocateDetail = { fieldKey: string };

function scrollToTarget(target: HTMLElement) {
  const scroller = document.querySelector('.pos-config-scroll');
  if (scroller instanceof HTMLElement) {
    const top =
      target.getBoundingClientRect().top
      - scroller.getBoundingClientRect().top
      + scroller.scrollTop
      - 24;
    scroller.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
    return;
  }
  target.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

/**
 * Scroll vers le cadre extérieur de section + déclenche contour rouge / flash.
 * Même principe pour tous les articles POS (Packaging Boîte, bâche, flyer…).
 */
export function locatePosField(fieldKey: string) {
  if (typeof window === 'undefined' || !fieldKey) return;

  window.dispatchEvent(
    new CustomEvent<LocateDetail>(POS_LOCATE_FIELD, { detail: { fieldKey } }),
  );

  const tryFocus = () => {
    const fieldEl = document.getElementById(`pos-field-${fieldKey}`);
    const section =
      fieldEl?.closest<HTMLElement>('.pos-section-card')
      ?? document.querySelector<HTMLElement>(
        `.pos-section-card.is-locate-section, .pos-section-card.is-locate-path, .pos-section-card.is-locate-tint`,
      );
    const zone = section ?? fieldEl;

    if (!zone) return false;
    scrollToTarget(zone);
    return true;
  };

  // Laisser React ouvrir la section (setOpen) avant de scroller
  window.requestAnimationFrame(() => {
    window.setTimeout(() => {
      if (tryFocus()) return;
      window.setTimeout(() => {
        if (tryFocus()) return;
        window.setTimeout(tryFocus, 200);
      }, 80);
    }, 40);
  });
}
