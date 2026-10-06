/**
 * A modal's focus (`use:trap`): the focus moves in when it opens, Tab and Shift+Tab go round its own controls only, Escape calls `onescape` (and goes no further: a sheet under it stays open), and
 * when it closes the focus goes back to where it was before it opened.
 */
const FOCUSABLE = 'button:not([disabled]), input:not([disabled]), select, textarea, [href], [tabindex]:not([tabindex="-1"])';

export function trap(node: HTMLElement, onescape?: () => void) {
  const before = document.activeElement as HTMLElement | null;
  const key = (e: KeyboardEvent) => {
    if (e.key === 'Escape' && onescape) {
      // (only this one: not the sheet under it as well)
      e.preventDefault();
      e.stopPropagation();
      onescape();
      return;
    }
    if (e.key !== 'Tab' || e.defaultPrevented) return;
    const items = [...node.querySelectorAll<HTMLElement>(FOCUSABLE)];
    if (!items.length) return;
    const first = items[0];
    const last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) (e.preventDefault(), last.focus());
    else if (!e.shiftKey && document.activeElement === last) (e.preventDefault(), first.focus());
  };
  node.addEventListener('keydown', key);
  // (focus moves in: to the control marked autofocus, else the first; `autofocus` alone doesn't, on a modal mounted later)
  queueMicrotask(() => {
    if (node.contains(document.activeElement)) return;
    (node.querySelector<HTMLElement>('[autofocus]') ?? node.querySelector<HTMLElement>(FOCUSABLE))?.focus();
  });
  return {
    destroy() {
      node.removeEventListener('keydown', key);
      if (before?.isConnected) before.focus();
    },
  };
}
