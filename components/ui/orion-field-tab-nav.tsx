'use client';

import { useEffect } from 'react';
import { focusAdjacentWritableField } from '@/lib/ui/field-tab-navigation';

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

function isVisible(el: HTMLElement): boolean {
  if (el.hasAttribute('disabled') || el.getAttribute('aria-hidden') === 'true') return false;
  const style = window.getComputedStyle(el);
  if (style.visibility === 'hidden' || style.display === 'none') return false;
  return el.getClientRects().length > 0;
}

function isStepperControl(el: HTMLElement): boolean {
  if (el.dataset.orionStepper === '1') return true;
  if (el.tagName !== 'BUTTON') return false;
  const label = `${el.getAttribute('aria-label') || ''} ${el.getAttribute('title') || ''}`.toLowerCase();
  return /diminuer|augmenter|decrease|increase|\bqty\b/.test(label);
}

function isWritable(el: Element): el is HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement {
  if (!(el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement)) {
    return false;
  }
  if (el instanceof HTMLInputElement) {
    const t = el.type;
    if (t === 'hidden' || t === 'button' || t === 'submit' || t === 'reset' || t === 'checkbox' || t === 'radio' || t === 'file') {
      return false;
    }
  }
  return isVisible(el);
}

/**
 * Tab / Entrée : saute les boutons −/+ pour enchaîner les champs de saisie (POS, panier, formulaires).
 */
export function OrionFieldTabNav() {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const t = e.target;
      if (!isWritable(t as Element)) return;
      const current = t as HTMLElement;

      if (e.key === 'Enter' && current.tagName === 'INPUT') {
        const scope =
          current.closest('.pos-config-scroll, [role="dialog"], form, .orion-viewport') ?? document;
        if (focusAdjacentWritableField(current, 'next', scope)) {
          e.preventDefault();
        }
        return;
      }

      if (e.key !== 'Tab') return;

      const scope =
        current.closest('[role="dialog"], .pos-config-scroll, form, .orion-viewport') ?? document;
      const all = (Array.from(scope.querySelectorAll(FOCUSABLE)) as HTMLElement[]).filter(isVisible);
      const i = all.indexOf(current);
      if (i < 0) return;
      const candidate = e.shiftKey ? all[i - 1] : all[i + 1];
      if (!candidate || !isStepperControl(candidate)) return;

      if (focusAdjacentWritableField(current, e.shiftKey ? 'prev' : 'next', scope)) {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    document.addEventListener('keydown', onKeyDown, true);
    return () => document.removeEventListener('keydown', onKeyDown, true);
  }, []);

  return null;
}
