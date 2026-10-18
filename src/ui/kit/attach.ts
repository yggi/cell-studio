/**
 * Behaviour an element takes on, as Svelte attachments (`{@attach trap(onclose)}`): a modal's focus,
 * a long press, whether it's on screen. Each returns its own clean-up.
 */
import type { Attachment } from 'svelte/attachments';

const FOCUSABLE = 'button:not([disabled]), input:not([disabled]), select, textarea, [href], [tabindex]:not([tabindex="-1"])';

export interface TrapOptions {
  /** Escape: handled here and goes no further (a sheet under it stays open). */
  onescape?: () => void;
  /**
   * Where the focus goes when it opens, unless a control is marked `autofocus`: a selector, or 'self'
   * (the dialog itself, which needs tabindex="-1": on a phone, focusing a field would raise the
   * keyboard). Default: its first control.
   */
  focus?: string | 'self';
}

/**
 * A modal's focus: it moves in when the modal opens, Tab and Shift+Tab go round its own controls only,
 * Escape calls `onescape`, and when it closes the focus goes back to where it was before it opened.
 * Modals nest: the inner one handles a key first and the outer one leaves it be.
 */
export function trap(options: TrapOptions | (() => void) = {}): Attachment<HTMLElement> {
  const { onescape, focus } = typeof options === 'function' ? { onescape: options, focus: undefined } : options;
  return (node) => {
    const before = document.activeElement as HTMLElement | null;
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && onescape && !e.defaultPrevented) {
        e.preventDefault();
        e.stopPropagation();
        onescape();
        return;
      }
      if (e.key !== 'Tab' || e.defaultPrevented) return;
      const items = [...node.querySelectorAll<HTMLElement>(FOCUSABLE)];
      if (!items.length) return;
      const first = items[0]!; // (items is not empty)
      const last = items[items.length - 1]!;
      if (e.shiftKey && (document.activeElement === first || document.activeElement === node)) (e.preventDefault(), last.focus());
      else if (!e.shiftKey && document.activeElement === last) (e.preventDefault(), first.focus());
    };
    node.addEventListener('keydown', key);
    // (`autofocus` alone doesn't move it, on a modal mounted later)
    queueMicrotask(() => {
      if (node.contains(document.activeElement)) return;
      const to =
        node.querySelector<HTMLElement>('[autofocus]') ??
        (focus === 'self' ? node : focus ? node.querySelector<HTMLElement>(focus) : null) ??
        node.querySelector<HTMLElement>(FOCUSABLE);
      to?.focus({ preventScroll: true });
    });
    return () => {
      node.removeEventListener('keydown', key);
      if (before?.isConnected) before.focus({ preventScroll: true });
    };
  };
}

/**
 * Call `onlong` after the pointer is held still on the element. Moving more than a few pixels cancels
 * (so drags still work), and the click that follows a successful hold is swallowed (so it doesn't
 * count toward a double-tap). Adds `.holding` while the timer runs. Presses that start on an
 * interactive part (`.nodrag`, e.g. a wheel rim) are left to that control.
 */
export function longpress(onlong: (target: Element | null) => void, ms = 450): Attachment<HTMLElement> {
  return (node) => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    let sx = 0;
    let sy = 0;
    let fired = false;
    // (where the press began: a part of the element, such as a bulb on a wheel, may be a cell of its own)
    let at: Element | null = null;

    const cancel = () => {
      clearTimeout(timer);
      timer = undefined;
      node.classList.remove('holding');
    };
    const down = (e: PointerEvent) => {
      if (e.button !== 0 || !e.isPrimary) return;
      if ((e.target as Element | null)?.closest?.('.nodrag')) return;
      fired = false;
      at = e.target as Element | null;
      sx = e.clientX;
      sy = e.clientY;
      cancel();
      node.classList.add('holding');
      timer = setTimeout(() => {
        timer = undefined;
        fired = true;
        node.classList.remove('holding');
        navigator.vibrate?.(12);
        onlong(at);
      }, ms);
    };
    const move = (e: PointerEvent) => {
      if (timer && Math.hypot(e.clientX - sx, e.clientY - sy) > 8) cancel();
    };
    const click = (e: MouseEvent) => {
      if (!fired) return;
      fired = false;
      e.stopPropagation();
      e.preventDefault();
    };
    const menu = (e: Event) => e.preventDefault();

    node.addEventListener('pointerdown', down);
    window.addEventListener('pointermove', move);
    // capture phase, so controls that stop propagation can't leave a timer running
    window.addEventListener('pointerup', cancel, true);
    window.addEventListener('pointercancel', cancel, true);
    node.addEventListener('click', click, true);
    node.addEventListener('contextmenu', menu);
    return () => {
      cancel();
      node.removeEventListener('pointerdown', down);
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', cancel, true);
      window.removeEventListener('pointercancel', cancel, true);
      node.removeEventListener('click', click, true);
      node.removeEventListener('contextmenu', menu);
    };
  };
}

/**
 * Tell `on` whether the element can be seen (in the viewport, not in a hidden tab). Views that draw
 * every frame do no work while it can't: dozens of them analysing their voice kept the page too busy
 * to feed the sound. Where there's no IntersectionObserver it's always seen.
 */
export function onScreen(on: (visible: boolean) => void): Attachment<Element> {
  return (node) => {
    if (typeof IntersectionObserver === 'undefined') return;
    const watch = new IntersectionObserver((es) => on(es.some((e) => e.isIntersecting)));
    watch.observe(node);
    return () => watch.disconnect();
  };
}
