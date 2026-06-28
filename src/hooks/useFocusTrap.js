import { useEffect, useRef } from 'react';

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'area[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  'iframe',
  'object',
  'embed',
  '[contenteditable="true"]',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

const isVisible = (el) => {
  if (!el) return false;
  if (el.hasAttribute('hidden')) return false;
  if (el.getAttribute('aria-hidden') === 'true') return false;
  const style = window.getComputedStyle(el);
  if (style.display === 'none' || style.visibility === 'hidden') return false;
  return el.offsetParent !== null || style.position === 'fixed';
};

const getFocusable = (root) => {
  if (!root) return [];
  return Array.from(root.querySelectorAll(FOCUSABLE_SELECTOR)).filter(isVisible);
};

/**
 * Trap keyboard focus inside `containerRef.current` while `active` is true.
 * - Stores the previously focused element on activation and restores it on
 *   deactivation (so closing a modal returns focus to its trigger).
 * - Moves initial focus to the first focusable inside the container (or the
 *   container itself if it has tabIndex=-1) on the next animation frame so
 *   the DOM has time to mount.
 * - Cycles Tab / Shift+Tab between first and last focusable, matching the
 *   ARIA Authoring Practices "modal dialog" pattern.
 *
 * Pair with the `Dialog` primitive or use directly for custom drawers.
 */
export default function useFocusTrap(containerRef, active, options = {}) {
  const { initialFocus = null, restoreFocus = true } = options;
  const previouslyFocusedRef = useRef(null);
  // Keep `initialFocus` in a ref so callers can pass a fresh closure on every
  // render (the common case — `() => initialFocusRef.current`) without
  // re-firing the trap effect on every keystroke. Without this, every parent
  // re-render rescheduled `focusFirst` and snapped focus back to the first
  // input, making the trap unusable inside forms.
  const initialFocusRef = useRef(initialFocus);
  useEffect(() => {
    initialFocusRef.current = initialFocus;
  }, [initialFocus]);

  useEffect(() => {
    if (!active) return undefined;

    previouslyFocusedRef.current =
      typeof document !== 'undefined' ? document.activeElement : null;

    const container = containerRef.current;
    if (!container) return undefined;

    const focusFirst = () => {
      const current = initialFocusRef.current;
      const explicit = typeof current === 'function' ? current() : current;
      if (explicit && typeof explicit.focus === 'function') {
        explicit.focus();
        return;
      }
      const focusables = getFocusable(container);
      if (focusables.length > 0) {
        focusables[0].focus();
      } else if (container.tabIndex >= -1) {
        container.focus();
      }
    };

    const raf = requestAnimationFrame(focusFirst);

    const handleKeyDown = (e) => {
      if (e.key !== 'Tab') return;
      const focusables = getFocusable(container);
      if (focusables.length === 0) {
        e.preventDefault();
        container.focus();
        return;
      }
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const activeEl = document.activeElement;

      if (e.shiftKey) {
        if (activeEl === first || !container.contains(activeEl)) {
          e.preventDefault();
          last.focus();
        }
      } else if (activeEl === last || !container.contains(activeEl)) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener('keydown', handleKeyDown);
      if (restoreFocus) {
        const prev = previouslyFocusedRef.current;
        if (prev && typeof prev.focus === 'function' && document.contains(prev)) {
          // requestAnimationFrame so we run after React's commit + the
          // unmounting element has been removed from the DOM.
          requestAnimationFrame(() => {
            prev.focus({ preventScroll: true });
          });
        }
      }
    };
    // `initialFocus` intentionally excluded — it's read via `initialFocusRef`
    // so a new closure per render doesn't reset focus mid-typing.
  }, [active, containerRef, restoreFocus]);
}

/**
 * Mark every direct child of `document.body` (other than the wrapper hosting
 * the trap) as `inert` while `active` is true. Falls back to
 * `aria-hidden="true"` for older browsers without inert support.
 *
 * Pass the host element (e.g. the dialog root or its portal mount) so the
 * trap subtree itself is excluded from the inert set.
 */
export function useInertSiblings(hostRef, active) {
  useEffect(() => {
    if (!active || typeof document === 'undefined') return undefined;
    const host = hostRef.current;
    if (!host) return undefined;

    const supportsInert = 'inert' in HTMLElement.prototype;
    const touched = [];

    const apply = () => {
      const children = Array.from(document.body.children);
      for (const node of children) {
        if (node.contains(host)) continue;
        if (node.nodeType !== 1) continue;
        if (node.tagName === 'SCRIPT' || node.tagName === 'STYLE') continue;
        const prev = {
          el: node,
          prevAriaHidden: node.getAttribute('aria-hidden'),
          prevInert: node.hasAttribute('inert'),
        };
        if (supportsInert) {
          node.inert = true;
        } else {
          node.setAttribute('aria-hidden', 'true');
        }
        touched.push(prev);
      }
    };

    apply();

    return () => {
      for (const { el, prevAriaHidden, prevInert } of touched) {
        if (supportsInert) {
          if (!prevInert) el.inert = false;
        } else if (prevAriaHidden === null) {
          el.removeAttribute('aria-hidden');
        } else {
          el.setAttribute('aria-hidden', prevAriaHidden);
        }
      }
    };
  }, [hostRef, active]);
}
