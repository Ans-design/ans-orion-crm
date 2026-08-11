/**
 * Navigation Tab / Entrée entre champs de saisie (ignore boutons −/+ stepper).
 */

const WRITABLE =
  'input:not([type="hidden"]):not([type="button"]):not([type="submit"]):not([type="reset"]):not([type="checkbox"]):not([type="radio"]):not([type="file"]):not([tabindex="-1"]), textarea:not([tabindex="-1"]), select:not([tabindex="-1"])';

function isVisible(el: HTMLElement): boolean {
  if (el.hasAttribute('disabled') || el.getAttribute('aria-hidden') === 'true') return false;
  if ((el as HTMLInputElement).readOnly) return false;
  const style = window.getComputedStyle(el);
  if (style.visibility === 'hidden' || style.display === 'none') return false;
  return el.getClientRects().length > 0;
}

export function listWritableFields(root: ParentNode = document): HTMLElement[] {
  return (Array.from(root.querySelectorAll(WRITABLE)) as HTMLElement[]).filter(isVisible);
}

/** Focus le champ saisie suivant / précédent. Retourne true si un focus a été fait. */
export function focusAdjacentWritableField(
  current: HTMLElement,
  direction: 'next' | 'prev' = 'next',
  scope?: ParentNode | null,
): boolean {
  const root = scope ?? current.closest('.orion-viewport') ?? document;
  const list = listWritableFields(root);
  const i = list.indexOf(current);
  if (i < 0) return false;
  const target = direction === 'next' ? list[i + 1] : list[i - 1];
  if (!target) return false;
  target.focus();
  if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) {
    try {
      target.select();
    } catch {
      /* select() peut échouer sur type=number selon navigateur */
    }
  }
  return true;
}

/**
 * Handler clavier : Tab (et Entrée sur input) → champ saisie suivant.
 * À brancher sur onKeyDown des inputs / textareas.
 */
export function handleWritableFieldKeyNav(
  e: { key: string; shiftKey: boolean; preventDefault: () => void; currentTarget: EventTarget | null },
  options?: { enterMovesNext?: boolean; scope?: ParentNode | null },
): void {
  const el = e.currentTarget as HTMLElement | null;
  if (!el) return;

  const enterMoves = options?.enterMovesNext !== false;
  const isEnter = e.key === 'Enter' && enterMoves && el.tagName === 'INPUT';
  const isTab = e.key === 'Tab';

  if (!isTab && !isEnter) return;
  if (isEnter && (el as HTMLInputElement).type === 'textarea') return;

  const direction = isTab && e.shiftKey ? 'prev' : 'next';
  if (isTab && direction === 'next') {
    /* Laisser le navigateur si le prochain focusable est déjà un champ saisie */
  }

  const moved = focusAdjacentWritableField(el, direction, options?.scope);
  if (moved) e.preventDefault();
}
